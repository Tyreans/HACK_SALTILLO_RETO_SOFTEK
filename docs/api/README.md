# API Documentation (`docs/api/`)

## Purpose
This folder contains REST API endpoint specifications, payloads, response formats, and error code references.

## Key Sections to Document
- **Authentication & Headers:** Token formats (e.g. Bearer JWT / Cookies), CSRF requirements, and CORS restrictions.
- **Endpoint Catalog:** Grouped by resources (e.g., `/api/auth`, `/api/users`, `/api/gemini`, `/api/items`).
- **Request & Response Contracts:** JSON schemas, query parameter definitions, and validation rules.
- **Error Handling:** Standardized error responses (e.g., status codes `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `429 Too Many Requests`, `500 Internal Server Error`).
- **Gemini AI Endpoints:** Specifications for prompt submissions, streaming responses, and token usage limits.
