# Page Components (`frontend/src/pages/`)

## Purpose
This folder contains the top-level route view components. Each page component corresponds to a specific route or screen in the application.

## Structure & Examples
- `Home/`: Landing page / public presentation screen.
- `Dashboard/`: Authenticated user dashboard with analytical data or recent activities.
- `Chat/` or `GeminiPlayground/`: Interface for prompting the Gemini AI model and displaying conversation history.
- `Login/`: Authentication screen for user sign-in.
- `Register/`: User registration and onboarding screen.
- `NotFound/`: 404 error page for unmatched routes.

## Best Practices
- Keep page components focused on orchestrating UI sections, triggering data hooks, and handling high-level layout.
- Delegate fine-grained UI controls to `src/components/common/`.
