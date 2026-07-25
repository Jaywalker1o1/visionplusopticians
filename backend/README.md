<<<<<<< HEAD
Vision Plus Backend

A small Express backend to serve the catalog and accept image uploads.

Requirements
- Node.js (16+ recommended)

Install

```bash
cd "c:\Users\Administrator\Documents\projects\optical store\backend"
npm install
```

Environment
- `ADMIN_TOKEN` (optional): a secret token used by admin requests. Default: `changeme`.
- `PORT` (optional): port to run server on (default 4000).
- `ADMIN_USER` (optional): admin email address to accept for backend JWT login.
- `ADMIN_PASS` (optional): admin password to accept for backend JWT login.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (optional): configure SMTP to send password reset emails.
- `SMTP_SECURE` (optional): set to `true` for secure SMTP/TLS.
- `EMAIL_FROM` (optional): sender address for password reset messages.
- `APP_URL` (optional): base URL used in reset links (default `http://localhost:4000`).

Authentication
- The backend supports two admin authentication methods:
	- Legacy static token: send header `x-admin-token: <ADMIN_TOKEN>`.
	- JWT login: POST `/api/auth/login` with JSON `{ "email": "...", "password": "..." }` to receive a `token`. Then send `Authorization: Bearer <token>` on admin requests. Configure `ADMIN_USER`, `ADMIN_PASS`, and `JWT_SECRET` as environment variables.
- Password reset: POST `/api/auth/forgot-password` with JSON `{ "email": "admin@..." }` to request a reset link. POST `/api/auth/reset-password` with JSON `{ "token": "...", "password": "..." }` to set a new admin password.

Run

```bash
# development
npm run dev
# production
npm start
```

API
- GET `/api/catalog` — public read
- POST `/api/upload` — upload image (multipart form-data, field `file`) — requires header `x-admin-token: <token>`
- POST `/api/upload` — upload image (multipart form-data, field `file`) — requires admin auth (JWT or legacy token)
- POST `/api/catalog` — add item (JSON) — requires admin token
- PUT `/api/catalog/:id` — update item — requires admin token
- DELETE `/api/catalog/:id` — remove item — requires admin token
- POST `/api/catalog/replace` — replace whole catalog (send array) — requires admin token
- GET `/api/sse` — Server-Sent Events stream for realtime catalog updates (no auth required)
- POST `/api/auth/login` — obtain JWT (admin only) by posting `{ email, password }`.

Uploads are served from `/uploads/<filename>`.

Client integration
- Use the `x-admin-token` header with admin requests. For example, when uploading an image via the Admin UI, POST the file to `/api/upload` then use the returned `url` as the `image` property when creating catalog items.

Security
- This simple backend uses a static token and local file storage. For production, add proper authentication (Firebase Auth, OAuth, or a user system) and consider storing images in cloud storage (S3, Google Cloud Storage) and catalog in a database.
=======
Vision Plus Backend

A small Express backend to serve the catalog and accept image uploads.

Requirements
- Node.js (16+ recommended)

Install

```bash
cd "c:\Users\Administrator\Documents\projects\optical store\backend"
npm install
```

Environment
- `ADMIN_TOKEN` (optional): a secret token used by admin requests. Default: `changeme`.
- `PORT` (optional): port to run server on (default 4000).
- `ADMIN_USER` (optional): admin email address to accept for backend JWT login.
- `ADMIN_PASS` (optional): admin password to accept for backend JWT login.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (optional): configure SMTP to send password reset emails.
- `SMTP_SECURE` (optional): set to `true` for secure SMTP/TLS.
- `EMAIL_FROM` (optional): sender address for password reset messages.
- `APP_URL` (optional): base URL used in reset links (default `http://localhost:4000`).

Authentication
- The backend supports two admin authentication methods:
	- Legacy static token: send header `x-admin-token: <ADMIN_TOKEN>`.
	- JWT login: POST `/api/auth/login` with JSON `{ "email": "...", "password": "..." }` to receive a `token`. Then send `Authorization: Bearer <token>` on admin requests. Configure `ADMIN_USER`, `ADMIN_PASS`, and `JWT_SECRET` as environment variables.
- Password reset: POST `/api/auth/forgot-password` with JSON `{ "email": "admin@..." }` to request a reset link. POST `/api/auth/reset-password` with JSON `{ "token": "...", "password": "..." }` to set a new admin password.

Run

```bash
# development
npm run dev
# production
npm start
```

API
- GET `/api/catalog` — public read
- POST `/api/upload` — upload image (multipart form-data, field `file`) — requires header `x-admin-token: <token>`
- POST `/api/upload` — upload image (multipart form-data, field `file`) — requires admin auth (JWT or legacy token)
- POST `/api/catalog` — add item (JSON) — requires admin token
- PUT `/api/catalog/:id` — update item — requires admin token
- DELETE `/api/catalog/:id` — remove item — requires admin token
- POST `/api/catalog/replace` — replace whole catalog (send array) — requires admin token
- GET `/api/sse` — Server-Sent Events stream for realtime catalog updates (no auth required)
- POST `/api/auth/login` — obtain JWT (admin only) by posting `{ email, password }`.

Uploads are served from `/uploads/<filename>`.

Client integration
- Use the `x-admin-token` header with admin requests. For example, when uploading an image via the Admin UI, POST the file to `/api/upload` then use the returned `url` as the `image` property when creating catalog items.

Security
- This simple backend uses a static token and local file storage. For production, add proper authentication (Firebase Auth, OAuth, or a user system) and consider storing images in cloud storage (S3, Google Cloud Storage) and catalog in a database.
>>>>>>> 02b7bb53d64b00c9edf1aa76e3b62ac1c63095f0
