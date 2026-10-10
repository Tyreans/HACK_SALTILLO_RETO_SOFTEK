# Public Assets (`frontend/public/`)

## Purpose
This directory contains static assets served directly by Vite without being processed or hashed by the build pipeline.

## Contents
- `favicon.ico`: Application favicon.
- `robots.txt`: Search engine crawling rules.
- `manifest.json`: Web app manifest (for PWA capabilities if applicable).
- Static images or icons that require static URL references.

## Note
Files in this directory will be served at the root path `/` (e.g., `public/favicon.ico` is accessible at `/favicon.ico`). Assets that should be imported into JavaScript/CSS components should be placed in `src/assets/` instead.
