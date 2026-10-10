# Components (`frontend/src/components/`)

## Purpose
This directory houses reusable React components used across multiple pages and views.

## Organization
- [`common/`](file:///home/tyreans/hacktec/frontend/src/components/common/README.md): Generic, atom-level presentational elements with no domain dependencies (e.g. Button, Input, Modal, Spinner).
- [`layout/`](file:///home/tyreans/hacktec/frontend/src/components/layout/README.md): Higher-level structural components that define page layouts (e.g. Navbar, Sidebar, Footer, PageContainer).

## Best Practices
- Keep components focused on presentation and state local to their user interaction.
- Extract complex business logic into custom hooks (`src/hooks/`).
- Enforce prop validation via PropTypes or TypeScript interfaces.
- Avoid raw HTML manipulation (use standard JSX escaping, avoid `dangerouslySetInnerHTML`).
