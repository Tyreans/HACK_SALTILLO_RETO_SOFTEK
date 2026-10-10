# Backend Source Directory (`backend/src/`)

## Purpose
This directory houses all application source code for the Express.js server.

## Architectural Flow
```
Client Request
      │
      ▼
   Routes (`src/routes/`)
      │
      ▼
 Middlewares (`src/middlewares/`) ──> [Auth, Validation, Rate Limit]
      │
      ▼
 Controllers (`src/controllers/`) ──> [Extract params, validate input, call service]
      │
      ▼
  Services (`src/services/`) ───────> [Gemini API, business logic, transactions]
      │
      ▼
   Models (`src/models/`) ──────────> [PostgreSQL queries via parameterized client]
      │
      ▼
   Response / Global Error Handler
```

## Subdirectories
- [`config/`](file:///home/tyreans/hacktec/backend/src/config/README.md): Environment and third-party client configurations.
- [`controllers/`](file:///home/tyreans/hacktec/backend/src/controllers/README.md): Endpoint controllers handling request lifecycle.
- [`middlewares/`](file:///home/tyreans/hacktec/backend/src/middlewares/README.md): Request interceptors and handlers.
- [`models/`](file:///home/tyreans/hacktec/backend/src/models/README.md): Database schemas, tables, and query builders.
- [`routes/`](file:///home/tyreans/hacktec/backend/src/routes/README.md): API URL route definitions.
- [`services/`](file:///home/tyreans/hacktec/backend/src/services/README.md): Domain logic and external integrations (Gemini AI).
- [`utils/`](file:///home/tyreans/hacktec/backend/src/utils/README.md): Common helper functions and error classes.
