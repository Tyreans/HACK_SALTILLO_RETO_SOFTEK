# Routes (`backend/src/routes/`)

## Purpose
This directory contains Express router definitions mapping HTTP methods and endpoints to their respective middleware chains and controllers.

## Structure & Conventions
- `index.js`: Main router aggregator mounting all sub-routers under the `/api` prefix.
- `auth.routes.js`: Routes for user authentication (`/api/auth/login`, `/api/auth/register`, `/api/auth/logout`).
- `user.routes.js`: Routes for user management (`/api/users/profile`, `/api/users/:id`).
- `gemini.routes.js`: Routes for interacting with Google Gemini AI (`/api/gemini/generate`, `/api/gemini/stream`, `/api/gemini/chat`).

## Design Pattern
Keep route definitions lean: connect the route path to validation middleware, authentication middleware, and the controller handler. Avoid inlining business logic or database queries inside route files.
