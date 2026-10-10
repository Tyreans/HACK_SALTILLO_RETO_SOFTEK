# Frontend Source (`frontend/src/`)

## Purpose
This directory contains the entire React application source code processed, bundled, and optimized by Vite.

## Architecture
```
main.jsx (Entry point)
   │
   ▼
 App.jsx (Root component with Providers)
   │
   ├── Contexts (`src/context/`) ──> [Auth, Theme, App state]
   │
   └── Routes (`src/routes/`) ─────> [Route configuration & ProtectedRoute]
         │
         ├── Layouts (`src/components/layout/`)
         │
         └── Pages (`src/pages/`)
               │
               ├── Components (`src/components/common/`)
               ├── Custom Hooks (`src/hooks/`)
               └── API Services (`src/services/`) ──> [Calls Express Backend]
```

## Folder Overview
- [`assets/`](file:///home/tyreans/hacktec/frontend/src/assets/README.md): Bundled media files (images, svgs, fonts).
- [`components/`](file:///home/tyreans/hacktec/frontend/src/components/README.md): Reusable UI building blocks.
- [`context/`](file:///home/tyreans/hacktec/frontend/src/context/README.md): Global React context providers.
- [`hooks/`](file:///home/tyreans/hacktec/frontend/src/hooks/README.md): Custom stateful hooks.
- [`pages/`](file:///home/tyreans/hacktec/frontend/src/pages/README.md): Route view components.
- [`routes/`](file:///home/tyreans/hacktec/frontend/src/routes/README.md): Router setup and navigation guards.
- [`services/`](file:///home/tyreans/hacktec/frontend/src/services/README.md): Backend API communication layer.
- [`styles/`](file:///home/tyreans/hacktec/frontend/src/styles/README.md): CSS stylesheets and design tokens.
- [`types/`](file:///home/tyreans/hacktec/frontend/src/types/README.md): Types, interfaces, and prop definitions.
- [`utils/`](file:///home/tyreans/hacktec/frontend/src/utils/README.md): Pure helper functions and formatters.
