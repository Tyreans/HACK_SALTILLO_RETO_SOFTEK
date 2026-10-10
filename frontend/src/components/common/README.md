# Common UI Components (`frontend/src/components/common/`)

## Purpose
This folder contains design system primitives and atomic, domain-agnostic UI components that can be used anywhere in the application.

## Expected Components
- `Button.jsx`: Standard button variants (primary, secondary, danger, ghost, loading state).
- `Input.jsx`: Controlled text input with labels, error messages, and helper text.
- `Modal.jsx`: Accessible modal dialog dialog overlay.
- `Spinner.jsx`: Loading indicator for asynchronous actions and suspense fallback.
- `Card.jsx`: Reusable container with consistent padding, borders, and shadows.
- `Alert.jsx`: Visual feedback banners (success, warning, error, info).

## Rules
- Components here should not import domain services or API clients directly.
- All dynamic data should be passed via props.
