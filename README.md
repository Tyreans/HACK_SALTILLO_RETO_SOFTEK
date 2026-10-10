# Project Root

## Overview
This is the root directory of the application, featuring a decoupled client-server architecture with an Express.js backend and a React + Vite frontend.

## Architecture Stack
- **Backend:** Express.js (Node.js REST API)
- **Frontend:** React + Vite (Single Page Application)
- **Database:** PostgreSQL (Relational Database)
- **AI Integration:** Google Gemini API (Handled securely via backend service)

## Directory Structure
- [`backend/`](file:///home/tyreans/hacktec/backend/README.md): Express.js REST API server, database integration, Gemini API integration, controllers, routes, and services.
- [`frontend/`](file:///home/tyreans/hacktec/frontend/README.md): React client application initialized with Vite, UI components, pages, custom hooks, and API client services.
- [`docs/`](file:///home/tyreans/hacktec/docs/README.md): Project documentation including system architecture, API specifications, database design, and local setup guides.

## Environment Variables
- Backend environment configuration: see [`backend/.env.example`](file:///home/tyreans/hacktec/backend/.env.example)
- Frontend environment configuration: see [`frontend/.env.example`](file:///home/tyreans/hacktec/frontend/.env.example)

> **Important Note:** Never commit `.env` files with actual secrets to version control.
