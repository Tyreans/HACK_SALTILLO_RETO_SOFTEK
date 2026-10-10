# Controllers (`backend/src/controllers/`)

## Purpose
Controllers are responsible for handling incoming HTTP requests, extracting query parameters, route parameters, and request bodies, invoking the appropriate service methods, and returning the standardized HTTP response.

## Responsibilities
- Parse and validate input data received from `req.body`, `req.params`, and `req.query`.
- Call one or more domain services located in `src/services/`.
- Format outgoing responses (JSON payloads, HTTP status codes: `200`, `201`, `204`, etc.).
- Catch unexpected errors and pass them to the Express error-handling middleware (`next(error)`).

## Example Controllers
- `auth.controller.js`: Handles user login, logout, and token refresh.
- `user.controller.js`: Manages user profile retrieval and updates.
- `gemini.controller.js`: Receives client prompts, invokes the Gemini service, and returns generated AI responses or streams.
