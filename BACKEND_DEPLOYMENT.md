# Backend Deployment Guide

This project uses a shared backend to store product catalog items and uploaded images. GitHub can host the frontend, but a live backend service is required for shared product updates.

## Why GitHub is not enough alone
- GitHub Pages stores static files only (HTML/CSS/JS).
- Browser localStorage is device-specific and not shared.
- For live product uploads, you need a hosted backend that all devices can access.

## What this backend provides
- `GET /api/catalog` — shared product catalog
- `POST /api/catalog` — add new catalog items
- `DELETE /api/catalog/:id` — delete catalog items
- `POST /api/upload` — image upload endpoint
- `POST /api/auth/login` — admin login for JWT
- `POST /api/auth/forgot-password` — password reset request
- `POST /api/auth/reset-password` — reset admin password
- `GET /api/sse` — server-sent events for live updates

## Deploying the backend

### Option 1: Render
1. Create a new Web Service.
2. Connect your repository.
3. Set the start command to:
   ```bash
   npm install
   npm start
   ```
4. Set environment variables:
   - `PORT` = `4000`
   - `JWT_SECRET` = a strong secret
   - `ADMIN_TOKEN` = a strong admin token
   - `ADMIN_USER` = your admin email
   - `ADMIN_PASS` = your admin password
   - `APP_URL` = your backend URL (example: `https://your-backend.onrender.com`)
5. Deploy.

### Option 2: Railway
1. Create a new project and connect repository.
2. Use `npm install` and `npm start`.
3. Add the same environment variables.
4. Deploy.

### Option 3: Heroku
1. Create a new app.
2. Connect the repo or push with Git.
3. Set the Procfile or use `npm start`.
4. Add environment variables.

## Backend environment variables
- `PORT` — port the server listens on
- `JWT_SECRET` — secret for JWT tokens
- `ADMIN_USER` — admin login email
- `ADMIN_PASS` — admin password
- `ADMIN_TOKEN` — legacy token for backend requests
- `APP_URL` — public backend URL used by password reset
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `EMAIL_FROM` — optional email settings for password reset

## Connecting the frontend admin panel
1. Open `admin-dashboard.html`.
2. In `Backend API base URL`, enter your backend URL.
3. In `Backend admin token`, enter `ADMIN_TOKEN` if using the legacy token.
4. Enable backend sync.
5. Click `Test backend`.

## Important notes
- The frontend can be hosted on GitHub Pages, but it must point to the deployed backend URL.
- Uploaded images are stored on the backend under `/uploads` and must be publicly accessible.
- The backend is the source of truth for products once enabled.

## Optional improvement
- Deploy the backend once and use the same URL in all devices.
- Do not store secrets in front-end code.
