# Frontend Utilities (`frontend/src/utils/`)

## Purpose
This folder stores pure utility functions, formatters, validators, and helper algorithms used across frontend components and hooks.

## Typical Helpers
- `formatDate.js`: Date and timestamp formatting using standard Intl or date libraries.
- `maskPII.js`: Helper functions to mask sensitive user information (e.g. email or payment numbers) before rendering.
- `validators.js`: Client-side form input validation functions (email regex, password complexity checks).
- `constants.js`: Application-wide constants (pagination limits, regex patterns, key codes).

## Best Practices
- Functions in this folder should be deterministic and free of side effects.
- Include unit tests for critical validation and formatting logic.
