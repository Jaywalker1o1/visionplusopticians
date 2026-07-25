# Vision Plus — Opticians Site

**Status**: Frontend ready, backend pending deployment.

## Project Overview
Vision Plus Opticians is a full-featured e-commerce site for an optical store in Lusaka, Zambia. It features:
- **Frontend**: Static HTML/CSS/JS with responsive design (mobile-first)
- **Backend**: Node.js + Express for catalog sync, image uploads, admin auth, and short order links
- **Cart & Ordering**: WhatsApp-based orders with server-side short links
- **Admin Panel**: Add/edit/delete products, manage images, backend sync, password reset

## Tech Stack
- **Frontend**: HTML, CSS (vanilla), JavaScript (`script.js`, `style.css`)
- **Backend**: Node.js, Express, Multer (uploads), Socket.IO/SSE (realtime), JWT (auth), Nodemailer (email)
- **Hosting**: GitHub Pages (frontend static) + Render/Heroku/Railway (backend Node server)

## Quick Start (Local)

### Serve Frontend
```bash
python -m http.server 5500
# Open http://localhost:5500
```

### Start Backend
```bash
cd backend
npm install
npm start
# Backend runs on http://localhost:4000
```

### Admin Access
1. Open http://localhost:5500/admin.html
2. Login with default: `admin@vision.local` / `admin1234` (change in backend `.env`)
3. Enable backend sync: set Backend API URL to `http://localhost:4000`
4. Add products, upload images, manage catalog

## Deployment

### Frontend (Static Host - GitHub Pages)
1. Push repo to GitHub
2. In GitHub > Settings > Pages: select branch `main`, folder `/`
3. Public URL: `https://<username>.github.io/visionplus-site/`

### Backend (Node Host - Render Recommended)
1. Create Render Web Service, connect GitHub repo
2. Set root directory: `backend` (or build command: `npm install` from root)
3. Set environment variables:
   - `APP_URL` = https://your-backend.onrender.com (public backend URL)
   - `JWT_SECRET` = (random secure string)
   - `ADMIN_TOKEN` = (random token)
   - `ADMIN_USER` = admin@vision.local (optional)
   - `ADMIN_PASS` = admin1234 (optional)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` (optional, for password reset)
4. Deploy and note the backend URL
5. Update admin settings in frontend to point to deployed backend

## Environment Variables (Backend)

### Required
- `APP_URL` — Public backend URL for short order links (e.g., https://visionplus-backend.onrender.com)
- `JWT_SECRET` — Secret for JWT token signing (generate with: `openssl rand -hex 32`)

### Optional (Admin / Auth)
- `ADMIN_TOKEN` — Legacy token for uploads (if not using JWT)
- `ADMIN_USER` — Admin email (default: admin@vision.local)
- `ADMIN_PASS` — Admin password (default: admin1234)

### Optional (Email / Password Reset)
- `SMTP_HOST` — SMTP server (e.g., smtp.gmail.com)
- `SMTP_PORT` — SMTP port (usually 587)
- `SMTP_USER` — SMTP username
- `SMTP_PASS` — SMTP password
- `EMAIL_FROM` — From address (e.g., noreply@visionplus.local)

## File Structure
```
.
├── index.html                 # Homepage with slideshow hero
├── frames.html                # Frames catalog page
├── cases.html                 # Cases catalog page
├── contact-lenses.html        # Contact lenses page
├── appointment.html           # Appointment booking form
├── cart.html                  # Shopping cart
├── order.html                 # Order summary (public view)
├── admin.html                 # Admin login page
├── admin-dashboard.html       # Admin dashboard (add/edit/delete items)
├── script.js                  # Main app logic (catalog, cart, admin, backend sync)
├── style.css                  # Global styles (responsive, mobile-first)
├── images/                    # Product and background images
│   ├── slideshow/             # Hero section slideshow images
│   ├── (product images)
│   └── (background images)
├── backend/
│   ├── server.js              # Express API server
│   ├── package.json           # Node dependencies
│   ├── uploads/               # (generated) Uploaded product images
│   └── data/                  # (generated) Catalog, orders, credentials JSON
├── .gitignore                 # Exclude uploads/, data/, node_modules/
└── README.md                  # (this file)
```

## Features

### Public Features
- Browse products by category (frames, cases, contact lenses)
- Add to cart and checkout via WhatsApp
- View appointment booking form
- Responsive mobile design

### Admin Features
- Secure login with JWT + password reset (email)
- Add new products (title, description, price, image upload)
- Edit existing products inline
- Delete products
- Manage WhatsApp appointment number
- Backend sync: upload catalog and images to backend, share across devices
- Cloud sync (optional Firebase): Firestore + Storage

### Backend API
- `POST /api/auth/login` — Admin login (returns JWT)
- `POST /api/auth/forgot-password` — Request password reset
- `POST /api/auth/reset-password` — Reset with token
- `GET /api/catalog` — Fetch catalog items
- `POST /api/catalog` — Create item (requires auth)
- `PUT /api/catalog/:id` — Update item (requires auth)
- `DELETE /api/catalog/:id` — Delete item (requires auth)
- `POST /api/catalog/replace` — Replace entire catalog (requires auth)
- `POST /api/upload` — Upload image file (requires auth)
- `GET /uploads/:filename` — Serve uploaded images
- `POST /api/orders` — Create order and return short URL (public)
- `GET /orders/:id` — View saved order (public)
- `GET /api/sse` — Subscribe to catalog updates (SSE)
- WebSocket: `socket.io` for realtime catalog updates

## Security Notes
- Filenames with spaces are valid but prefer hyphens for safety on Linux hosts
- Always set strong `JWT_SECRET` and `ADMIN_PASS` on production
- Use environment variables for secrets (never commit `.env`)
- Backend `uploads` folder should be writable and served as static (via `/uploads` route)
- CORS is enabled for all origins (`*`) — restrict to frontend domain in production

## Troubleshooting

### Frontend doesn't load backend
- Verify backend `APP_URL` is reachable and public
- Check admin settings in admin-dashboard.html
- Ensure CORS is allowed (server uses `cors()`)

### Images not uploading
- Verify backend has write permissions to `uploads/` folder
- Check image file size limit (5MB default in Multer)
- Ensure `ADMIN_TOKEN` or JWT is correct

### Orders not saving
- Check `backend/data/` folder exists and is writable
- Verify `APP_URL` is set to public backend URL
- Check backend logs for errors

### Password reset not working
- SMTP not configured: reset token and URL will be logged to console
- Verify `SMTP_*` env vars are correct
- Test SMTP credentials with online SMTP checker

## Contact
Vision Plus Opticians  
📍 COMESA Shopping Complex, Shop S8, 2nd Floor, Lusaka, Zambia  
📞 +260 775 683 188  
📱 WhatsApp: +260 768 130 131  
🌐 Social: Facebook, TikTok, Instagram @visionplusopticians  

---

**Last Updated**: 2026-07-24  
**License**: Private — Vision Plus Opticians
