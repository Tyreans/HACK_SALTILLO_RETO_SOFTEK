# Architecture Documentation (`docs/architecture/`)

## Purpose
This folder contains system-level architecture documents, technical design specifications, and diagram assets.

## Scope & Functions
- **System Topology:** How the React frontend communicates with the Express.js API, and how Express interacts with PostgreSQL and the Gemini API.
- **Backend-for-Frontend (BFF) & AI Pattern:** Documenting the pattern where sensitive Gemini API calls and credentials remain isolated on the Express backend, rather than accessed directly from the browser.
- **Data Flow & Sequence Diagrams:** Visualizing authentication, authorization, transactional workflows, and AI prompt-response pipelines.
- **Security Architecture:** Documenting network boundaries, CORS policies, rate limiting, and credential handling.
