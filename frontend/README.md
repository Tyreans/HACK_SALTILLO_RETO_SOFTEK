# Frontend Application (`frontend/`)

## Overview
This directory contains the client-side Single Page Application (SPA) built using **React** and bundled with **Vite**.

## Core Technologies
- **React:** Component-based UI library.
- **Vite:** Next-generation frontend build tool and local dev server.
- **React Router:** Client-side declarative routing.
- **Fetch / Axios:** HTTP client communicating with the Express backend REST API.

## Directory Structure
- [`public/`](file:///home/tyreans/hacktec/frontend/public/README.md): Static unbundled assets (favicon, manifest, robots.txt).
- [`src/`](file:///home/tyreans/hacktec/frontend/src/README.md): Primary source code for the React application.
  - [`src/assets/`](file:///home/tyreans/hacktec/frontend/src/assets/README.md): Images, icons, SVGs, and fonts bundled by Vite.
  - [`src/components/`](file:///home/tyreans/hacktec/frontend/src/components/README.md): Reusable UI components.
    - [`src/components/common/`](file:///home/tyreans/hacktec/frontend/src/components/common/README.md): Generic, presentational UI elements (Buttons, Inputs, Modals, Loaders).
    - [`src/components/layout/`](file:///home/tyreans/hacktec/frontend/src/components/layout/README.md): Structural layout elements (Navbar, Sidebar, Footer, PageWrapper).
  - [`src/context/`](file:///home/tyreans/hacktec/frontend/src/context/README.md): React context providers for global application state (Auth, Theme).
  - [`src/hooks/`](file:///home/tyreans/hacktec/frontend/src/hooks/README.md): Custom React hooks for business logic and state extraction.
  - [`src/pages/`](file:///home/tyreans/hacktec/frontend/src/pages/README.md): Route-level page view components.
  - [`src/routes/`](file:///home/tyreans/hacktec/frontend/src/routes/README.md): Route definitions and protected route wrappers.
  - [`src/services/`](file:///home/tyreans/hacktec/frontend/src/services/README.md): HTTP API client functions communicating with the Express backend.
  - [`src/styles/`](file:///home/tyreans/hacktec/frontend/src/styles/README.md): Global CSS styles, Tailwind configuration, or theme tokens.
  - [`src/types/`](file:///home/tyreans/hacktec/frontend/src/types/README.md): Shared TypeScript type declarations or JSDoc interfaces.
  - [`src/utils/`](file:///home/tyreans/hacktec/frontend/src/utils/README.md): Frontend helper functions, validators, and formatters.

## Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
> **Security Reminder:** Only variables prefixed with `VITE_` are exposed to the browser. Do NOT store sensitive private keys (e.g. Gemini API keys or database passwords) here.
