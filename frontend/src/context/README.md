# Context Providers (`frontend/src/context/`)

## Purpose
This folder houses React Context definitions and provider components managing global application state across deep component trees without prop drilling.

## Typical Contexts
- `AuthContext.jsx`: Provides authenticated user information, login/logout handlers, and authentication loading state.
- `ThemeContext.jsx`: Manages dark/light mode preference and active theme state.
- `NotificationContext.jsx`: Manages global toast or alert notification messages.

## Security & Best Practices
- Clear all client-side state on logout to prevent data remnants.
- Avoid placing high-frequency rapid updates into a single monolithic context to prevent unnecessary re-renders.
