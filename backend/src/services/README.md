# Services (`backend/src/services/`)

## Purpose
The services layer encapsulates core business logic, third-party API communication (specifically Google Gemini API), and transactional workflows.

## Key Services
- `gemini.service.js`: Interfaces with the Google Gemini SDK. Handles system prompts, temperature settings, content generation, conversational context tracking, and prompt sanitization.
- `auth.service.js`: Manages credential verification, password hashing (e.g. Argon2 or bcrypt), and JWT token creation/revocation.
- `user.service.js`: Business rules regarding user profile operations and role permissions.

## Architecture Benefits
- Isolating Gemini API integration in `gemini.service.js` keeps controller code clean and allows mocking during unit tests.
- Controllers remain focused solely on HTTP concerns (request parsing and response sending).
