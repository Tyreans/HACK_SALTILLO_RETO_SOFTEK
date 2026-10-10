# Setup & Development Guide (`docs/setup/`)

## Purpose
This folder contains step-by-step documentation for setting up the local development environment, installing dependencies, configuring databases, and running the frontend and backend services.

## Topics Covered
1. **Prerequisites:**
   - Node.js (v18+ or v20+ LTS recommended)
   - npm, pnpm, or yarn
   - PostgreSQL (v14+ installed locally or via Docker)
   - Google Gemini API Key from Google AI Studio
2. **Environment Setup:**
   - Copying `.env.example` to `.env` in `backend/` and `frontend/`
   - Setting PostgreSQL credentials and `GEMINI_API_KEY`
3. **Database Initialization:**
   - Creating the PostgreSQL database
   - Running initial migrations and seeds
4. **Running the Application:**
   - Starting the Express backend server
   - Starting the React + Vite development server
