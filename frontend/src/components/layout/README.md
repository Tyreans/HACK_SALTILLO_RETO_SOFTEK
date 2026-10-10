# Layout Components (`frontend/src/components/layout/`)

## Purpose
This folder contains structural components that frame page content and define global page anatomy.

## Expected Components
- `Navbar.jsx`: Top navigation bar with branding, navigation links, and user session menu.
- `Sidebar.jsx`: Collapsible side navigation drawer for dashboards and app navigation.
- `Footer.jsx`: Bottom footer with copyright, links, and system status indicators.
- `MainLayout.jsx`: Master layout wrapper rendering Navbar, Sidebar, dynamic page content (`<Outlet />`), and Footer.
- `AuthLayout.jsx`: Centered layout wrapper dedicated to authentication screens (Login, Register).
