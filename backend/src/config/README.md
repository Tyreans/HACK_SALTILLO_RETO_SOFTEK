# Backend Configuration (`backend/src/config/`)

## Purpose
This folder centralizes configuration objects, environment variable validations, and third-party SDK client initializations.

## Expected Modules
- `db.config.js`: PostgreSQL connection pool configuration (host, port, user, password, database, SSL) using `pg` or an ORM.
- `gemini.config.js`: Google Gemini API client initialization using `GEMINI_API_KEY` and default generation parameters (e.g., model name, temperature, safety settings).
- `env.config.js`: Environment variable loader and schema validator ensuring all required secrets and configuration keys exist at startup.
- `cors.config.js`: Cross-Origin Resource Sharing (CORS) whitelist configurations.

## Best Practices
- Fail fast: Crash during server boot if critical environment variables (such as `DATABASE_URL` or `GEMINI_API_KEY`) are missing.
- Never hardcode secrets or fallback production keys in source code files.
