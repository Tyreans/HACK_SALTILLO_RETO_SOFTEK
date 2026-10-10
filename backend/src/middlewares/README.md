# Middlewares (`backend/src/middlewares/`)

## Purpose
Middlewares intercept incoming requests prior to reaching the route controllers, or process outgoing responses and uncaught exceptions.

## Common Middlewares
- `auth.middleware.js`: Validates authentication tokens (e.g. JWT) and attaches the authenticated user entity to `req.user`.
- `validate.middleware.js`: Validates request payloads against schemas (e.g., Zod or Joi) before the controller executes.
- `error.middleware.js`: Global Express error handler formatting standard JSON error responses without exposing raw database or internal stack traces.
- `rateLimiter.middleware.js`: Rate limiting protection for API endpoints, especially expensive AI prompts to the Gemini API.
- `security.middleware.js`: Sets security headers (Helmet, CORS policy, content type headers).
