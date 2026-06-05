# Notification Service

Production-style notification management service built with Node.js, Express, MongoDB, and Socket.IO.

## Features
- Create and manage notifications
- User notification queries with pagination and filters
- Notification statistics
- Real-time delivery via Socket.IO

## Setup
1. Install dependencies:
   npm install

2. Create environment file:
   Copy .env.example to .env and update values as needed.

3. Run the server:
   npm run dev

## Environment Variables
- PORT: Server port
- MONGO_URI: MongoDB connection string
- CLIENT_ORIGIN: CORS allowed origin

## API Base URL
- http://localhost:5000/api/v1

## Socket.IO
Clients should connect with a userId query parameter:
- Example: io("http://localhost:5000", { query: { userId: "user123" } })

Events:
- notification:new
- notification:read
- notification:delete
