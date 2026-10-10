# Custom React Hooks (`frontend/src/hooks/`)

## Purpose
This folder contains reusable custom React hooks encapsulating stateful logic, side effects, and API query behaviors.

## Common Hooks
- `useAuth.js`: Convenience hook accessing the `AuthContext` to check if a user is logged in, their roles, and logout trigger.
- `useGemini.js`: Hook managing AI generation requests to the backend Gemini endpoints, handling loading states, streaming tokens, and errors.
- `useFetch.js` / `useApi.js`: Generic data-fetching hook with loading, caching, and error handling.
- `useDebounce.js`: Debounces user input (e.g. for search bars or auto-saving).
- `useLocalStorage.js`: Synchronizes React state with local storage (for non-sensitive preferences like theme).

## Rule
- Never use local storage hooks for sensitive auth credentials (JWTs, session tokens) to protect against XSS exfiltration.
