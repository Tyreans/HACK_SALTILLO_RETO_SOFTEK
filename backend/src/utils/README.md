# Utilities (`backend/src/utils/`)

## Purpose
This folder contains stateless helper functions, custom application error classes, loggers, and formatters reused across controllers and services.

## Common Utilities
- `apiResponse.js`: Standardized helper functions for formatting uniform success (`{ success: true, data: ... }`) and error responses.
- `apiError.js`: Custom `ApiError` class extending `Error` with HTTP status codes and operational flags.
- `logger.js`: Centralized logger utility (e.g. Winston or Pino) ensuring sensitive information (such as tokens or passwords) is never leaked in server logs.
- `sanitizer.js`: Input sanitization and string cleaning helpers before passing content to external sinks or templates.
