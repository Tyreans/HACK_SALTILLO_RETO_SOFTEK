# AGENTS.md

This file contains essential, repo-specific instructions for AI agents working in this repository.

## Architecture
- **Type:** Decoupled monorepo.
- **Backend:** Express.js (Node.js REST API, PostgreSQL database).
- **Frontend:** React + Vite (SPA).

## Gotchas & Known Issues
- **Frontend `package.json` Missing:** The `frontend/` directory currently lacks a `package.json` file. Before attempting to build or run the frontend, verify if the dependencies are installed or if the project needs to be initialized. If missing, assume the project is in a partial state and inform the user.

## Commands (Backend)
Work from the `backend/` directory:
- **Run dev server:** `npm run dev` (uses `node --watch`)
- **Run production:** `npm start` (uses `node src/server.js`)
- **Database (clean):** `npm run db:limpiar`
- **Database (seed/load):** `npm run db:cargar`

## Environment Configuration
- Must set up `.env` files before running:
  - Copy `backend/.env.example` -> `backend/.env`
  - Copy `frontend/.env.example` -> `frontend/.env`
- **Crucial:** Never commit actual secrets (API keys, DB credentials) to version control.

## Documentation References
- Setup details: `docs/setup/README.md`
- Architecture: `docs/architecture/`
