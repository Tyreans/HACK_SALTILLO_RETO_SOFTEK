# API Services (`frontend/src/services/`)

## Purpose
This folder encapsulates all outgoing HTTP network requests made from the browser to the Express.js backend.

## Expected Modules
- `apiClient.js`: Centralized Axios or fetch instance configured with `VITE_API_BASE_URL`, default headers, CSRF headers, and response error interceptors.
- `authService.js`: API calls for user login, signup, session verification, and logout.
- `geminiService.js`: API calls targeting the backend's `/api/gemini` endpoints to initiate AI generations or chat streams.
- `userService.js`: API calls for fetching and modifying user profile data.

## Security Rule
- Never make direct calls from frontend services to the Google Gemini API endpoint (`generativelanguage.googleapis.com`). All AI requests MUST go through the Express backend service layer to preserve API key confidentiality.
