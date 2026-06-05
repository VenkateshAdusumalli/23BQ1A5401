# Vehicle Maintenance Scheduler Microservice

## Overview
This service fetches depot and maintenance task data from external APIs and selects the optimal set of tasks that maximizes operational impact within a daily mechanic-hour budget. It uses a Dynamic Programming 0/1 Knapsack algorithm.

## Setup
1. Create a `.env` file in the project root.
2. Add environment variables (examples below).
3. Install dependencies and start the service.

```bash
npm install
npm start
```

## Environment Variables
- `PORT` (optional): Server port. Default is `3000`.
- `DEPOTS_API_URL` (required): Depot details endpoint.
  - Example: `http://4.224.186.213/evaluation-service/depots/{depotId}`
- `TASKS_API_URL` (required): Maintenance tasks endpoint.
  - Example with placeholder: `https://api.example.com/tasks?depotId={depotId}`
  - Example with path: `https://api.example.com/depots/{depotId}/tasks`

## API Endpoint
`GET /schedule/:depotId?budget=8`

### Response
```json
{
  "depotId": "D001",
  "budgetHours": 8,
  "maxImpactScore": 320,
  "totalHoursUsed": 8,
  "selectedTasks": [
    {
      "taskId": 1,
      "vehicleId": "V101",
      "impactScore": 120,
      "duration": 3
    }
  ]
}
```

## Algorithm
This service solves the 0/1 Knapsack problem using Dynamic Programming.

- **Time complexity:** $O(n \times budget)$
- **Space complexity:** $O(n \times budget)$ (keeps a table for reconstruction)

## Sample Output
```json
{
  "depotId": "D001",
  "budgetHours": 5,
  "maxImpactScore": 160,
  "totalHoursUsed": 5,
  "selectedTasks": [
    {
      "taskId": 1,
      "vehicleId": "V101",
      "impactScore": 60,
      "duration": 2
    },
    {
      "taskId": 2,
      "vehicleId": "V102",
      "impactScore": 100,
      "duration": 3
    }
  ]
}
```

## Notes
- `serviceDurationHours` must be a positive integer for the DP budget table.
- Place screenshots in the `screenshots/` folder and reference them here if needed.
