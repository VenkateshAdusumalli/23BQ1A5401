# Stage 1

## Overview
This system provides CRUD-style notification management with real-time delivery to connected clients. It supports filtered queries, pagination, and basic statistics while keeping a simple Node.js + Express + MongoDB core.

## Goals
- Deliver new notifications in real time to online users.
- Store notifications for later retrieval and audit.
- Provide simple, predictable APIs for list, read, and delete.
- Keep the design easy to scale horizontally.

## Architecture
- API: Express app with REST endpoints for notification CRUD and stats.
- Data: MongoDB for persistence and filtering.
- Realtime: Socket.IO for user-scoped delivery.
- Services: A notification service layer to keep controller logic thin.

## Data Model
Notifications are stored in a single collection with fields like:
- userId (string)
- title (string)
- body (string)
- type (string)
- status ("unread" | "read")
- createdAt (timestamp)
- metadata (object)

Indexes:
- { userId: 1, createdAt: -1 } for user timelines
- { userId: 1, status: 1 } for unread filters

## API Surface
- POST /notifications: create a notification
- GET /notifications: list with pagination and filters
- PATCH /notifications/:id/read: mark as read
- DELETE /notifications/:id: delete
- GET /notifications/stats: basic counts by status

## Realtime Flow
1. Client connects to Socket.IO with userId in query.
2. Server maps userId to socket.
3. On create, server emits notification:new to user socket.
4. Client updates UI and can mark as read via REST.

## Scaling and Performance
- Stateless API servers behind a load balancer.
- Sticky sessions or Socket.IO adapter for multi-node realtime.
- Add caching for stats if traffic grows.
- Batch mark-as-read operations if needed.

## Reliability
- Validate input at API boundaries.
- Retries for transient DB errors.
- Dead-letter or fallback logging when realtime delivery fails.

## Security
- Authenticate and authorize all endpoints.
- Enforce userId scoping for reads and writes.
- CORS restricted by known client origins.

## Observability
- Structured request logs and error logs.
- Metrics for create rate, delivery success, and unread counts.

## Deployment
- Environment-driven config: PORT, MONGO_URI, CLIENT_ORIGIN.
- Health endpoint for uptime checks.
- CI to run tests and lint before deploy.

# Stage 2

## Database Selection
MongoDB is selected as the persistent storage for a large-scale notification platform. It is well suited for event-style data where each notification is a self-contained record with optional metadata.

Why MongoDB is suitable:
- Document model matches notification payloads and avoids rigid joins.
- Flexible schema supports optional fields and evolving notification types.
- Horizontal scaling via sharding supports high throughput at scale.
- Strong read and write performance for write-heavy workloads.
- Indexing on user and time dimensions keeps retrieval fast.

Benefits for notification systems:
- Each notification can be stored and retrieved as a single document.
- Metadata can vary by type without schema migrations.
- Time-ordered queries for user inbox views are efficient.
- The platform can grow by adding shards and replicas.

## Database Schema
Complete notification document schema:

```json
{
	"_id": "ObjectId",
	"userId": "string",
	"title": "string",
	"message": "string",
	"type": "string",
	"priority": "string",
	"isRead": false,
	"createdAt": "ISODate",
	"readAt": "ISODate | null",
	"metadata": {
		"source": "string",
		"campaignId": "string",
		"tags": ["string"]
	}
}
```

## Indexing Strategy
- `userId`: supports fast retrieval of a user inbox.
- `createdAt`: supports sorting and time-range queries.
- `isRead`: supports unread filters and read-state queries.

Recommended compound indexes:
- `{ userId: 1, createdAt: -1 }` for inbox ordering.
- `{ userId: 1, isRead: 1, createdAt: -1 }` for unread-first views.

Indexes improve retrieval by reducing full collection scans and keeping queries targeted to the user and time window.

## Data Growth Challenges

### Slow Queries
As volume grows, queries without tight filters degrade due to large scans and sorting costs.

Solutions:
- Create indexes aligned with query filters and sort order.
- Use pagination with `limit` and `skip` or cursor-based paging.
- Keep queries selective by scoping to `userId` and time ranges.

### Large Data Volume
Long-term storage causes steady growth and higher storage costs.

Solutions:
- Archive older notifications to a separate collection.
- Use TTL indexes for non-critical or short-lived notifications.
- Partition data into active and archive collections by age.

### High Concurrent Traffic
Spikes in reads and writes can overwhelm a single primary node.

Solutions:
- Shard by `userId` to distribute load.
- Use replication for read scaling and high availability.
- Buffer bursts with a message queue for writes.
- Load balance API servers to smooth traffic.

## REST API Query Mapping

### Create Notification
```javascript
db.notifications.insertOne({
	userId: "user123",
	title: "Order update",
	message: "Your order has shipped",
	type: "order",
	priority: "normal",
	isRead: false,
	createdAt: new Date(),
	readAt: null,
	metadata: { source: "orders", campaignId: "C-1001" }
});
```

### Get User Notifications
```javascript
db.notifications.find(
	{ userId: "user123" }
).sort({ createdAt: -1 }).skip(0).limit(20);
```

### Get Notification By Id
```javascript
db.notifications.findOne({ _id: ObjectId("64f0c7f1c2a4b2f1a9f1a111") });
```

### Mark Notification As Read
```javascript
db.notifications.updateOne(
	{ _id: ObjectId("64f0c7f1c2a4b2f1a9f1a111") },
	{ $set: { isRead: true, readAt: new Date() } }
);
```

### Mark All Notifications As Read
```javascript
db.notifications.updateMany(
	{ userId: "user123", isRead: false },
	{ $set: { isRead: true, readAt: new Date() } }
);
```

### Delete Notification
```javascript
db.notifications.deleteOne({ _id: ObjectId("64f0c7f1c2a4b2f1a9f1a111") });
```

### Notification Statistics
```javascript
db.notifications.aggregate([
	{ $match: { userId: "user123" } },
	{
		$group: {
			_id: "$userId",
			total: { $sum: 1 },
			read: { $sum: { $cond: ["$isRead", 1, 0] } },
			unread: { $sum: { $cond: ["$isRead", 0, 1] } }
		}
	}
]);
```

## Scalability Recommendations
- Use pagination for all list endpoints to cap response size.
- Maintain indexes on `userId`, `createdAt`, and `isRead`.
- Shard by `userId` to distribute users evenly across nodes.
- Use replication for read scaling and availability.
- Archive older notifications to manage storage costs.
- Monitor query performance and index hit rates.

## Conclusion
MongoDB provides the flexibility and performance needed for a notification platform. Its document model, indexing, and horizontal scaling features support high-throughput ingestion and fast user-centric retrieval while remaining resilient as data volume grows.

# Stage 3

## Query Analysis
The query is logically correct for retrieving unread notifications for a specific student, ordered by newest first. It returns all columns for notifications where `studentID = 1042` and `isRead = false`, sorted by `createdAt` descending.

## Why The Query Is Slow
- Large table size: 5,000,000 rows increases scan and sort costs.
- Full table scans: without proper indexes, the database scans most rows.
- Sorting overhead: ordering by `createdAt` requires sorting large result sets.
- Missing indexes: no index on `studentID`, `isRead`, and `createdAt` forces a scan.
- High data volume impact: concurrent reads and writes amplify latency.

## Query Improvements
Use a projection to retrieve only required columns:

```sql
SELECT id, studentID, title, message, createdAt
FROM notifications
WHERE studentID = 1042
AND isRead = false
ORDER BY createdAt DESC;
```

Selecting fewer columns reduces I/O, memory usage, and network transfer, which improves query latency.

## Index Optimization
Recommended composite index:

```sql
CREATE INDEX idx_student_read_created
ON notifications(studentID, isRead, createdAt DESC);
```

This index supports:
- filtering by `studentID`
- filtering by `isRead`
- sorting by `createdAt` without an extra sort step

## Computational Cost Analysis
Without index: $O(N)$ because the engine must scan the table.

With composite index: $O(\log N)$ to locate the matching range, then sequentially read the indexed rows in order.

## Should We Index Every Column?
Adding indexes on every column is not good practice. It causes:
- storage overhead
- slower inserts
- slower updates
- slower deletes
- higher index maintenance costs

Best practice: index only the columns used in frequent filters, joins, and sort operations, and measure query plans before and after changes.

## Placement Notification Query
PostgreSQL version:

```sql
SELECT studentID, title, message, createdAt
FROM notifications
WHERE notificationType = 'Placement'
AND createdAt >= NOW() - INTERVAL '7 days'
ORDER BY createdAt DESC;
```

MySQL version:

```sql
SELECT studentID, title, message, createdAt
FROM notifications
WHERE notificationType = 'Placement'
AND createdAt >= NOW() - INTERVAL 7 DAY
ORDER BY createdAt DESC;
```

## Conclusion
The optimal approach is to use selective projections, composite indexes aligned with the query filters and sort order, and avoid excessive indexing. This strategy keeps read latency low while preserving write performance at scale.

# Stage 4

## Problem Analysis
Fetching notifications on every page load creates excessive database load because the same queries are repeatedly executed for each student. This increases database traffic, causes slower response times under concurrency, and limits scalability as the user base and notification volume grow.

## Strategy 1: Caching Using Redis
A cache-first approach checks Redis before hitting the database. On a cache miss, the API fetches from the database, returns the result, and stores it in the cache. Cache updates occur on create, read, or delete events to keep the cache fresh.

Advantages:
- reduced database load
- faster response times

Tradeoffs:
- additional infrastructure
- cache invalidation challenges
- possibility of stale data

## Strategy 2: Pagination
Limit the number of notifications returned per request.

Example SQL query:

```sql
SELECT id, studentID, title, message, createdAt
FROM notifications
WHERE studentID = 1042
ORDER BY createdAt DESC
LIMIT 20 OFFSET 0;
```

Advantages:
- reduced query cost
- lower network usage

Tradeoffs:
- additional API calls for older notifications

## Strategy 3: Real-Time Notifications
Use Socket.IO or WebSockets to push notifications to users instead of repeatedly fetching them. The client subscribes to a real-time channel and updates the UI when new notifications arrive.

Advantages:
- fewer database requests
- better user experience

Tradeoffs:
- increased implementation complexity
- persistent connection management

## Strategy 4: Notification Summary API
Return only unread notification counts initially, then fetch details on demand.

Example response:

```json
{
	"unreadCount": 5
}
```

Advantages:
- smaller payloads
- reduced database access

Tradeoffs:
- requires additional endpoint design

## Strategy 5: Read Replicas
Separate read traffic from write traffic by using read replicas for fetch-heavy workloads.

Advantages:
- improved scalability
- better database performance

Tradeoffs:
- infrastructure cost
- replication lag

## Recommended Solution
A hybrid approach provides the best balance for production:
- Redis caching for hot notification lists and unread counts
- Pagination to cap payload size and query cost
- Socket.IO real-time delivery to reduce polling
- Read replicas to scale read-heavy traffic

This combination reduces database load, improves latency, and scales well with user growth while keeping the user experience responsive.

## Conclusion
By caching frequent reads, paginating results, pushing real-time updates, and offloading reads to replicas, the system minimizes unnecessary database queries and delivers notifications efficiently at scale.
