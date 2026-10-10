# Migrations (`backend/db/migrations/`)

## Purpose
This directory stores incremental and reversible database migration files for PostgreSQL.

## Migration Principles
- **Ordered Execution:** Migrations are named with timestamps or incremental numeric prefixes (e.g., `001_create_users_table.sql`, `002_create_chat_logs_table.sql`).
- **Idempotency & Rollbacks:** Where applicable, include corresponding `UP` (apply changes) and `DOWN` (rollback changes) scripts.
- **Never Modify Applied Migrations:** Once a migration has been committed and applied in shared environments, create a new migration to alter or drop schemas.
