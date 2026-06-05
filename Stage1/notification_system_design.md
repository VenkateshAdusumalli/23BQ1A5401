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
