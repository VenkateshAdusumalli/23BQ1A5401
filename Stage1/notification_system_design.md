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
