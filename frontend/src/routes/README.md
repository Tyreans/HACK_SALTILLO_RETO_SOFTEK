# Route Definitions (`frontend/src/routes/`)

## Purpose
This folder manages client-side application routing using React Router.

## Contents
- `AppRoutes.jsx`: Central routing configuration mapping URL paths (e.g., `/`, `/login`, `/dashboard`, `/chat`) to page components.
- `ProtectedRoute.jsx`: Higher-Order Component / Route Guard checking user authentication before allowing access to private routes.
- `PublicRoute.jsx`: Route wrapper redirecting already-authenticated users away from login/registration pages.

## Conventions
- Use lazy loading (`React.lazy()` and `Suspense`) for code-splitting routes and optimizing bundle sizes.
