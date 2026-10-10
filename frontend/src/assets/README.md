# Bundled Assets (`frontend/src/assets/`)

## Purpose
This directory stores static media and assets that are imported directly into React components and stylesheets, allowing Vite to process, hash, and optimize them during the build process.

## Contents
- `images/`: PNG, JPEG, WebP graphic assets.
- `icons/`: SVG icon components and sprite files.
- `fonts/`: Local web font files (WOFF2, TTF).

## Usage Example
```javascript
import logo from './assets/icons/logo.svg';

function Header() {
  return <img src={logo} alt="Application Logo" />;
}
```
