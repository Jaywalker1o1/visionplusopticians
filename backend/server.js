<<<<<<< HEAD
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const PORT = process.env.PORT || 4000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const RESET_TOKENS_FILE = path.join(DATA_DIR, 'reset-tokens.json');
const ADMIN_CREDENTIALS_FILE = path.join(DATA_DIR, 'admin-credentials.json');
const jwt = require('jsonwebtoken');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';
const ADMIN_USER_ENV = process.env.ADMIN_USER || 'admin@vision.local';
const ADMIN_PASS_ENV = process.env.ADMIN_PASS || 'admin1234';
const JWT_SECRET = process.env.JWT_SECRET || 'replace-this-secret';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const EMAIL_FROM = process.env.EMAIL_FROM || `Vision Plus <noreply@visionplus.local>`;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

let ADMIN_USER = ADMIN_USER_ENV;
let ADMIN_PASS = ADMIN_PASS_ENV;

// ensure directories
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(CATALOG_FILE)) fs.writeFileSync(CATALOG_FILE, JSON.stringify([]));
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, JSON.stringify([]));

function loadJsonFile(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.warn('Failed to read JSON file', filePath, e);
    return defaultValue;
  }
}

function saveJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn('Failed to save JSON file', filePath, e);
  }
}

function loadAdminCredentials() {
  const creds = loadJsonFile(ADMIN_CREDENTIALS_FILE, {});
  if (creds.email) ADMIN_USER = creds.email;
  if (creds.password) ADMIN_PASS = creds.password;
  return creds;
}

function saveAdminCredentials(creds) {
  const merged = { email: ADMIN_USER, password: ADMIN_PASS, ...creds };
  ADMIN_USER = merged.email || ADMIN_USER;
  ADMIN_PASS = merged.password || ADMIN_PASS;
  saveJsonFile(ADMIN_CREDENTIALS_FILE, merged);
}

function loadResetTokens() {
  const tokens = loadJsonFile(RESET_TOKENS_FILE, {});
  const now = Date.now();
  let changed = false;
  Object.keys(tokens).forEach((token) => {
    if (!tokens[token] || typeof tokens[token].expiresAt !== 'number' || tokens[token].expiresAt < now) {
      delete tokens[token];
      changed = true;
    }
  });
  if (changed) saveJsonFile(RESET_TOKENS_FILE, tokens);
  return tokens;
}

function saveResetTokens(tokens) {
  saveJsonFile(RESET_TOKENS_FILE, tokens);
}

function createSmtpTransport() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

function getPasswordResetUrl(token) {
  return `${APP_URL.replace(/\/$/, '')}/admin.html?resetToken=${token}`;
}

async function sendPasswordResetEmail(email, token) {
  const resetUrl = getPasswordResetUrl(token);
  const transport = createSmtpTransport();
  if (!transport) {
    console.warn('SMTP not configured, generated reset URL:', resetUrl);
    return { resetUrl, emailSent: false };
  }

  const message = {
    from: EMAIL_FROM,
    to: email,
    subject: 'Vision Plus admin password reset',
    text: `You requested a password reset for Vision Plus admin. Open this link to update your password: ${resetUrl}`,
    html: `<p>You requested a password reset for Vision Plus admin.</p><p>Open this link to update your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in one hour.</p>`,
  };
  const info = await transport.sendMail(message);
  return { resetUrl, emailSent: true, info };
}

loadAdminCredentials();
loadResetTokens();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

// setup socket.io for realtime catalog updates
const io = new Server(server, {
  cors: { origin: '*' }
});

// SSE clients set
const sseClients = new Set();

function emitCatalogUpdate() {
  try {
    const items = loadCatalog();
    const payload = { items, updatedAt: Date.now() };
    io.emit('catalog-updated', payload);
    // send to SSE clients
    for (const res of sseClients) {
      try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch (e) { /* ignore */ }
    }
  } catch (e) { console.warn('emitCatalogUpdate failed', e); }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.' + (file.mimetype.split('/')[1] || 'jpg');
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function loadCatalog() {
  try {
    const raw = fs.readFileSync(CATALOG_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    console.warn('Failed to read catalog', e);
    return [];
  }
}

function loadOrders() {
  try {
    const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    console.warn('Failed to read orders', e);
    return [];
  }
}

function saveOrders(items) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(items, null, 2));
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function saveCatalog(items) {
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(items, null, 2));
}

function requireAdmin(req, res, next) {
  // Support: Authorization: Bearer <jwt> OR x-admin-token legacy
  const authHeader = req.headers['authorization'] || '';
  const legacy = req.headers['x-admin-token'] || req.query.adminToken;
  if (legacy && legacy === ADMIN_TOKEN) return next();
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.admin = payload;
      return next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// Auth endpoint for obtaining JWT
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  if (email === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ user: email, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const normalized = String(email).trim().toLowerCase();
  if (normalized !== ADMIN_USER.toLowerCase()) {
    return res.status(400).json({ error: 'Admin email not recognized' });
  }

  const tokens = loadResetTokens();
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000;
  tokens[token] = { email: ADMIN_USER, expiresAt };
  saveResetTokens(tokens);

  try {
    const result = await sendPasswordResetEmail(ADMIN_USER, token);
    return res.json({ ok: true, emailSent: result.emailSent, resetUrl: result.resetUrl });
  } catch (err) {
    console.error('Failed to send reset email', err);
    return res.status(500).json({ error: 'Failed to send reset email', details: err.message });
  }
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });

  const tokens = loadResetTokens();
  const record = tokens[token];
  if (!record || !record.email || record.email.toLowerCase() !== ADMIN_USER.toLowerCase()) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  if (record.expiresAt < Date.now()) {
    delete tokens[token];
    saveResetTokens(tokens);
    return res.status(400).json({ error: 'Reset token expired' });
  }

  ADMIN_PASS = password;
  saveAdminCredentials({ email: ADMIN_USER, password: ADMIN_PASS });
  delete tokens[token];
  saveResetTokens(tokens);
  return res.json({ ok: true });
});

// SSE endpoint
app.get('/api/sse', (req, res) => {
  res.writeHead(200, {
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream'
  });
  const payload = { items: loadCatalog(), updatedAt: Date.now() };
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  sseClients.add(res);
  req.on('close', () => { sseClients.delete(res); });
});

// API
app.get('/api/catalog', (req, res) => {
  const items = loadCatalog();
  res.json(items);
});

app.post('/api/upload', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

app.post('/api/catalog', requireAdmin, (req, res) => {
  const items = loadCatalog();
  const item = req.body;
  if (!item || !item.title) return res.status(400).json({ error: 'Invalid item payload' });
  item.id = item.id || `${item.category || 'item'}-${Date.now()}`;
  items.push(item);
  saveCatalog(items);
  res.json(item);
  emitCatalogUpdate();
});

app.put('/api/catalog/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  const items = loadCatalog();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = { ...items[idx], ...req.body };
  saveCatalog(items);
  res.json(items[idx]);
  emitCatalogUpdate();
});

app.delete('/api/catalog/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  let items = loadCatalog();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const removed = items.splice(idx, 1)[0];
  saveCatalog(items);
  res.json({ removed });
  emitCatalogUpdate();
});

// Replace entire catalog
app.post('/api/catalog/replace', requireAdmin, (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Expected array' });
  saveCatalog(items);
  res.json({ ok: true });
  emitCatalogUpdate();
});

// Orders API - public endpoint to create short order links
app.post('/api/orders', (req, res) => {
  const order = req.body;
  if (!order || !order.items || !Array.isArray(order.items)) return res.status(400).json({ error: 'Invalid order payload' });
  const orders = loadOrders();
  const id = uuidv4();
  const record = { id, createdAt: Date.now(), order };
  orders.push(record);
  saveOrders(orders);
  const url = `${APP_URL.replace(/\/$/, '')}/orders/${id}`;
  return res.json({ ok: true, id, url });
});

// Public order view page
app.get('/orders/:id', (req, res) => {
  try {
    const id = req.params.id;
    const orders = loadOrders();
    const record = orders.find(o => o.id === id);
    if (!record) return res.status(404).send('Order not found');
    const o = record.order;
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order ${id}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:16px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border:1px solid #ddd}</style></head><body><h1>Order ${id}</h1><p>Created: ${new Date(record.createdAt).toLocaleString()}</p><h2>Customer</h2><pre>${JSON.stringify(o.customer||{}, null, 2)}</pre><h2>Items</h2><table><thead><tr><th>Title</th><th>Qty</th><th>Price</th></tr></thead><tbody>${(o.items||[]).map(it=>`<tr><td>${escapeHtml(it.title||'')}</td><td>${Number(it.qty||0)}</td><td>ZMW ${Number(it.price||0).toFixed(2)}</td></tr>`).join('')}</tbody></table><h3>Total: ZMW ${Number(o.total||0).toFixed(2)}</h3></body></html>`;
    return res.send(html);
  } catch (e) {
    console.error('Order view failed', e);
    return res.status(500).send('Server error');
  }
});

io.on('connection', (socket) => {
  console.log('client connected', socket.id);
  socket.on('disconnect', () => console.log('client disconnected', socket.id));
});

server.listen(PORT, () => {
  console.log(`VisionPlus backend running on http://localhost:${PORT}`);
  console.log(`Uploads: ${UPLOAD_DIR}`);
});
=======
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const PORT = process.env.PORT || 4000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const RESET_TOKENS_FILE = path.join(DATA_DIR, 'reset-tokens.json');
const ADMIN_CREDENTIALS_FILE = path.join(DATA_DIR, 'admin-credentials.json');
const jwt = require('jsonwebtoken');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';
const ADMIN_USER_ENV = process.env.ADMIN_USER || 'admin@vision.local';
const ADMIN_PASS_ENV = process.env.ADMIN_PASS || 'admin1234';
const JWT_SECRET = process.env.JWT_SECRET || 'replace-this-secret';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const EMAIL_FROM = process.env.EMAIL_FROM || `Vision Plus <noreply@visionplus.local>`;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

let ADMIN_USER = ADMIN_USER_ENV;
let ADMIN_PASS = ADMIN_PASS_ENV;

// ensure directories
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(CATALOG_FILE)) fs.writeFileSync(CATALOG_FILE, JSON.stringify([]));
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, JSON.stringify([]));

function loadJsonFile(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.warn('Failed to read JSON file', filePath, e);
    return defaultValue;
  }
}

function saveJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn('Failed to save JSON file', filePath, e);
  }
}

function loadAdminCredentials() {
  const creds = loadJsonFile(ADMIN_CREDENTIALS_FILE, {});
  if (creds.email) ADMIN_USER = creds.email;
  if (creds.password) ADMIN_PASS = creds.password;
  return creds;
}

function saveAdminCredentials(creds) {
  const merged = { email: ADMIN_USER, password: ADMIN_PASS, ...creds };
  ADMIN_USER = merged.email || ADMIN_USER;
  ADMIN_PASS = merged.password || ADMIN_PASS;
  saveJsonFile(ADMIN_CREDENTIALS_FILE, merged);
}

function loadResetTokens() {
  const tokens = loadJsonFile(RESET_TOKENS_FILE, {});
  const now = Date.now();
  let changed = false;
  Object.keys(tokens).forEach((token) => {
    if (!tokens[token] || typeof tokens[token].expiresAt !== 'number' || tokens[token].expiresAt < now) {
      delete tokens[token];
      changed = true;
    }
  });
  if (changed) saveJsonFile(RESET_TOKENS_FILE, tokens);
  return tokens;
}

function saveResetTokens(tokens) {
  saveJsonFile(RESET_TOKENS_FILE, tokens);
}

function createSmtpTransport() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

function getPasswordResetUrl(token) {
  return `${APP_URL.replace(/\/$/, '')}/admin.html?resetToken=${token}`;
}

async function sendPasswordResetEmail(email, token) {
  const resetUrl = getPasswordResetUrl(token);
  const transport = createSmtpTransport();
  if (!transport) {
    console.warn('SMTP not configured, generated reset URL:', resetUrl);
    return { resetUrl, emailSent: false };
  }

  const message = {
    from: EMAIL_FROM,
    to: email,
    subject: 'Vision Plus admin password reset',
    text: `You requested a password reset for Vision Plus admin. Open this link to update your password: ${resetUrl}`,
    html: `<p>You requested a password reset for Vision Plus admin.</p><p>Open this link to update your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in one hour.</p>`,
  };
  const info = await transport.sendMail(message);
  return { resetUrl, emailSent: true, info };
}

loadAdminCredentials();
loadResetTokens();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

// setup socket.io for realtime catalog updates
const io = new Server(server, {
  cors: { origin: '*' }
});

// SSE clients set
const sseClients = new Set();

function emitCatalogUpdate() {
  try {
    const items = loadCatalog();
    const payload = { items, updatedAt: Date.now() };
    io.emit('catalog-updated', payload);
    // send to SSE clients
    for (const res of sseClients) {
      try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch (e) { /* ignore */ }
    }
  } catch (e) { console.warn('emitCatalogUpdate failed', e); }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.' + (file.mimetype.split('/')[1] || 'jpg');
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function loadCatalog() {
  try {
    const raw = fs.readFileSync(CATALOG_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    console.warn('Failed to read catalog', e);
    return [];
  }
}

function loadOrders() {
  try {
    const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    console.warn('Failed to read orders', e);
    return [];
  }
}

function saveOrders(items) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(items, null, 2));
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function saveCatalog(items) {
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(items, null, 2));
}

function requireAdmin(req, res, next) {
  // Support: Authorization: Bearer <jwt> OR x-admin-token legacy
  const authHeader = req.headers['authorization'] || '';
  const legacy = req.headers['x-admin-token'] || req.query.adminToken;
  if (legacy && legacy === ADMIN_TOKEN) return next();
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.admin = payload;
      return next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// Auth endpoint for obtaining JWT
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  if (email === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ user: email, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const normalized = String(email).trim().toLowerCase();
  if (normalized !== ADMIN_USER.toLowerCase()) {
    return res.status(400).json({ error: 'Admin email not recognized' });
  }

  const tokens = loadResetTokens();
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000;
  tokens[token] = { email: ADMIN_USER, expiresAt };
  saveResetTokens(tokens);

  try {
    const result = await sendPasswordResetEmail(ADMIN_USER, token);
    return res.json({ ok: true, emailSent: result.emailSent, resetUrl: result.resetUrl });
  } catch (err) {
    console.error('Failed to send reset email', err);
    return res.status(500).json({ error: 'Failed to send reset email', details: err.message });
  }
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });

  const tokens = loadResetTokens();
  const record = tokens[token];
  if (!record || !record.email || record.email.toLowerCase() !== ADMIN_USER.toLowerCase()) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  if (record.expiresAt < Date.now()) {
    delete tokens[token];
    saveResetTokens(tokens);
    return res.status(400).json({ error: 'Reset token expired' });
  }

  ADMIN_PASS = password;
  saveAdminCredentials({ email: ADMIN_USER, password: ADMIN_PASS });
  delete tokens[token];
  saveResetTokens(tokens);
  return res.json({ ok: true });
});

// SSE endpoint
app.get('/api/sse', (req, res) => {
  res.writeHead(200, {
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream'
  });
  const payload = { items: loadCatalog(), updatedAt: Date.now() };
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  sseClients.add(res);
  req.on('close', () => { sseClients.delete(res); });
});

// API
app.get('/api/catalog', (req, res) => {
  const items = loadCatalog();
  res.json(items);
});

app.post('/api/upload', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

app.post('/api/catalog', requireAdmin, (req, res) => {
  const items = loadCatalog();
  const item = req.body;
  if (!item || !item.title) return res.status(400).json({ error: 'Invalid item payload' });
  item.id = item.id || `${item.category || 'item'}-${Date.now()}`;
  items.push(item);
  saveCatalog(items);
  res.json(item);
  emitCatalogUpdate();
});

app.put('/api/catalog/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  const items = loadCatalog();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = { ...items[idx], ...req.body };
  saveCatalog(items);
  res.json(items[idx]);
  emitCatalogUpdate();
});

app.delete('/api/catalog/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  let items = loadCatalog();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const removed = items.splice(idx, 1)[0];
  saveCatalog(items);
  res.json({ removed });
  emitCatalogUpdate();
});

// Replace entire catalog
app.post('/api/catalog/replace', requireAdmin, (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Expected array' });
  saveCatalog(items);
  res.json({ ok: true });
  emitCatalogUpdate();
});

// Orders API - public endpoint to create short order links
app.post('/api/orders', (req, res) => {
  const order = req.body;
  if (!order || !order.items || !Array.isArray(order.items)) return res.status(400).json({ error: 'Invalid order payload' });
  const orders = loadOrders();
  const id = uuidv4();
  const record = { id, createdAt: Date.now(), order };
  orders.push(record);
  saveOrders(orders);
  const url = `${APP_URL.replace(/\/$/, '')}/orders/${id}`;
  return res.json({ ok: true, id, url });
});

// Public order view page
app.get('/orders/:id', (req, res) => {
  try {
    const id = req.params.id;
    const orders = loadOrders();
    const record = orders.find(o => o.id === id);
    if (!record) return res.status(404).send('Order not found');
    const o = record.order;
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order ${id}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:16px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border:1px solid #ddd}</style></head><body><h1>Order ${id}</h1><p>Created: ${new Date(record.createdAt).toLocaleString()}</p><h2>Customer</h2><pre>${JSON.stringify(o.customer||{}, null, 2)}</pre><h2>Items</h2><table><thead><tr><th>Title</th><th>Qty</th><th>Price</th></tr></thead><tbody>${(o.items||[]).map(it=>`<tr><td>${escapeHtml(it.title||'')}</td><td>${Number(it.qty||0)}</td><td>ZMW ${Number(it.price||0).toFixed(2)}</td></tr>`).join('')}</tbody></table><h3>Total: ZMW ${Number(o.total||0).toFixed(2)}</h3></body></html>`;
    return res.send(html);
  } catch (e) {
    console.error('Order view failed', e);
    return res.status(500).send('Server error');
  }
});

io.on('connection', (socket) => {
  console.log('client connected', socket.id);
  socket.on('disconnect', () => console.log('client disconnected', socket.id));
});

server.listen(PORT, () => {
  console.log(`VisionPlus backend running on http://localhost:${PORT}`);
  console.log(`Uploads: ${UPLOAD_DIR}`);
});
>>>>>>> 02b7bb53d64b00c9edf1aa76e3b62ac1c63095f0
