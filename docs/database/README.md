# Database Documentation (`docs/database/`)

## Purpose
This folder contains the database design specifications, Entity-Relationship Diagrams (ERDs), and conventions for the PostgreSQL database.

## Functions & Content
- **Schema Design & ERD:** Documentation of tables, columns, data types, constraints, foreign keys, and indexes.
- **PostgreSQL Conventions:** Naming conventions (snake_case for tables/columns), timestamp tracking (`created_at`, `updated_at`), and UUID/Serial primary key policies.
- **Migration Policy:** Guidelines on creating incremental, reversible schema migrations inside `backend/db/migrations/`.
- **Performance & Indexing:** Indexing strategies for frequent queries, full-text search, or JSONB fields.
- **Security & Permissions:** Documenting the principle of least privilege for the database user, SSL/mTLS requirements, and query parameterization standards.
