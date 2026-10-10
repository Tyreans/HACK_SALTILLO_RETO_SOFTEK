# Database Seeds (`backend/db/seeds/`)

## Purpose
This directory stores seed data scripts used to populate local development and testing PostgreSQL environments with predictable initial data.

## Usage
- Default mock users (e.g. test admin, standard test user).
- Baseline reference data (e.g. system categories, default prompts, AI configuration templates).
- Seeds should be idempotent where possible (using `ON CONFLICT DO NOTHING` or checking existence before insertion).

> **Warning:** Never use production credentials, real personal data, or live API keys inside seed files.
