
// Firebase config is kept for compatibility with the existing cloud features.
const firebaseConfig = {
  apiKey: "AIzaSyBFpxegfi6emIrtnPMhzShsz6RfKwfYW30",
  authDomain: "visionplusoptician-6a798.firebaseapp.com",
  databaseURL: "https://visionplusoptician-6a798-default-rtdb.firebaseio.com",
  projectId: "visionplusoptician-6a798",
  storageBucket: "visionplusoptician-6a798.firebasestorage.app",
  messagingSenderId: "126248518531",
  appId: "1:126248518531:web:e06f34733ce54770f4acb6",
  measurementId: "G-SF7RYZC8DD"
};

const serviceButtons = document.querySelectorAll('.service-tabs button');
const servicePanels = document.querySelectorAll('.service-content');

const DEFAULT_WHATSAPP = '+260977936288';
const LEGACY_WHATSAPP = '+260768130131';
const ADMIN_EMAILS = ['admin@vision.local', 'vplusopticians@gmail.com'];

  // Export / Import catalog so admins can move catalog (and uploaded images) between devices
  const exportBtn = document.getElementById('export-catalog');
  const importInput = document.getElementById('import-catalog');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      try {
        const data = JSON.stringify(catalogItems || [], null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'visionplus_catalog.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        createToast('Catalog exported');
      } catch (err) {
        createToast('Export failed', { type: 'error' });
      }
    });
  }

  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const f = importInput.files && importInput.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (!Array.isArray(parsed)) throw new Error('Invalid catalog file');
          saveCatalog(parsed);
          renderAdminItemList();
          createToast('Catalog imported — images included');
        } catch (err) {
          createToast('Import failed: ' + (err.message || 'invalid file'), { type: 'error' });
        }
      };
      reader.readAsText(f);
      // clear selection so same file can be re-imported if needed
      importInput.value = '';
    });
  }
const ADMIN_PASSWORD = 'admin1234';
const BACKEND_DEFAULT_URL = typeof window !== 'undefined' && window.location?.origin
  ? window.location.origin
  : 'https://visionplusopticians-gco6.onrender.com';
const STORAGE_WHATSAPP = 'visionplus_whatsapp_number';
const STORAGE_CATALOG = 'visionplus_catalog_items';
const STORAGE_CART = 'visionplus_cart';
const STORAGE_USERS = 'visionplus_users';
const SESSION_CUSTOMER = 'visionplus_customer';
const STORAGE_FIREBASE_CONFIG = 'visionplus_firebase_config';
const STORAGE_CLOUD_SYNC = 'visionplus_cloud_sync_enabled';
const STORAGE_SUPABASE_CONFIG = 'visionplus_supabase_config';
const STORAGE_SUPABASE_SYNC = 'visionplus_supabase_sync_enabled';
const STORAGE_BACKEND_URL = 'visionplus_backend_url';
const STORAGE_BACKEND_TOKEN = 'visionplus_backend_token';
const STORAGE_BACKEND_ENABLED = 'visionplus_backend_enabled';

let firebaseInitialized = false;
let firebaseApp = null;
let firebaseFirestore = null;
let firebaseStorage = null;
let cloudListenerUnsub = null;
let supabaseClient = null;
let supabaseInitialized = false;
let supabasePoller = null;
let backendPoller = null;
let backendSocket = null;

function loadFirebaseSdk() {
  return new Promise((resolve, reject) => {
    if (window.firebase && window.firebase.apps) return resolve();
    const scripts = [
      'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js',
      'https://www.gstatic.com/firebasejs/9.22.2/firebase-storage-compat.js',
    ];
    let loaded = 0;
    scripts.forEach(src => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => {
        loaded += 1;
        if (loaded === scripts.length) resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  });
}

async function initFirebaseIfConfigured() {
  if (firebaseInitialized) return true;
  const raw = localStorage.getItem(STORAGE_FIREBASE_CONFIG);
  if (!raw) return false;
  let cfg;
  try { cfg = JSON.parse(raw); } catch (e) { return false; }
  try {
    await loadFirebaseSdk();
    firebaseApp = window.firebase.initializeApp(cfg);
    firebaseFirestore = window.firebase.firestore();
    firebaseStorage = window.firebase.storage();
    firebaseInitialized = true;
    return true;
  } catch (e) {
    console.warn('Firebase init failed', e);
    return false;
  }
}

function startCloudListener() {
  if (!isCloudSyncEnabled()) return;
  initFirebaseIfConfigured().then((ok) => {
    if (!ok || !firebaseFirestore) return;
    if (cloudListenerUnsub) return; // already listening
    try {
      cloudListenerUnsub = firebaseFirestore.doc('visionplus/catalog').onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        if (!data || !Array.isArray(data.items)) return;
        saveCatalog(data.items);
        renderCatalog();
        renderAdminItemList();
        const status = document.getElementById('cloud-status');
        if (status) status.textContent = 'Cloud: listening';
        createToast('Catalog updated from cloud', { type: 'info', duration: 1800 });
      }, (err) => {
        console.error('Cloud listener error', err);
      });
    } catch (e) {
      console.warn('Failed to start cloud listener', e);
    }
  });
}

function loadSupabaseSdk() {
  return new Promise((resolve, reject) => {
    if (window.supabase) return resolve();
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/dist/umd/supabase.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function initSupabaseIfConfigured() {
  if (supabaseInitialized) return true;
  const raw = localStorage.getItem(STORAGE_SUPABASE_CONFIG);
  if (!raw) return false;
  let cfg;
  try { cfg = JSON.parse(raw); } catch (e) { return false; }
  if (!cfg.url || !cfg.anonKey) return false;
  try {
    await loadSupabaseSdk();
    supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    supabaseInitialized = true;
    return true;
  } catch (e) {
    console.warn('Supabase init failed', e);
    return false;
  }
}

function getSupabaseConfig() {
  const raw = localStorage.getItem(STORAGE_SUPABASE_CONFIG);
  if (!raw) return { enabled: false, url: '', anonKey: '', table: 'catalog' };
  try {
    const cfg = JSON.parse(raw);
    return { enabled: !!cfg.enabled, url: cfg.url || '', anonKey: cfg.anonKey || '', table: cfg.table || 'catalog' };
  } catch (e) {
    return { enabled: false, url: '', anonKey: '', table: 'catalog' };
  }
}

function startSupabasePoller(interval = 5000) {
  stopSupabasePoller();
  if (!isSupabaseSyncEnabled()) return;
  supabasePoller = setInterval(async () => {
    try {
      const ok = await initSupabaseIfConfigured();
      if (!ok || !supabaseClient) return;
      const cfg = getSupabaseConfig();
      const { data, error } = await supabaseClient.from(cfg.table || 'catalog').select('*').eq('id', 'visionplus_catalog').maybeSingle();
      if (error) throw error;
      if (data && Array.isArray(data.items)) {
        saveCatalog(data.items);
        renderCatalog();
        renderAdminItemList();
        const status = document.getElementById('supabase-status');
        if (status) status.textContent = 'Supabase: synced';
      }
    } catch (e) {
      console.warn('Supabase poll failed', e);
    }
  }, interval);
  const status = document.getElementById('supabase-status');
  if (status) status.textContent = 'Supabase: polling';
}

function stopSupabasePoller() {
  if (supabasePoller) {
    clearInterval(supabasePoller);
    supabasePoller = null;
  }
  const status = document.getElementById('supabase-status');
  if (status) status.textContent = 'Supabase: idle';
}

async function syncCatalogToSupabase() {
  const cfg = getSupabaseConfig();
  if (!cfg.enabled || !cfg.url || !cfg.anonKey) return false;
  const ok = await initSupabaseIfConfigured();
  if (!ok || !supabaseClient) throw new Error('Supabase not initialized');
  const payload = { id: 'visionplus_catalog', items: JSON.parse(JSON.stringify(catalogItems)), updatedAt: Date.now() };
  const { error } = await supabaseClient.from(cfg.table || 'catalog').upsert(payload, { onConflict: 'id' }).select();
  if (error) throw error;
  return true;
}

async function loadCatalogFromSupabase() {
  const cfg = getSupabaseConfig();
  if (!cfg.enabled || !cfg.url || !cfg.anonKey) return false;
  const ok = await initSupabaseIfConfigured();
  if (!ok || !supabaseClient) throw new Error('Supabase not initialized');
  const { data, error } = await supabaseClient.from(cfg.table || 'catalog').select('*').eq('id', 'visionplus_catalog').maybeSingle();
  if (error) throw error;
  if (!data || !Array.isArray(data.items)) return false;
  saveCatalog(data.items);
  renderCatalog();
  renderAdminItemList();
  return true;
}

function stopCloudListener() {
  if (cloudListenerUnsub) {
    try { cloudListenerUnsub(); } catch (e) { /* ignore */ }
    cloudListenerUnsub = null;
    const status = document.getElementById('cloud-status'); if (status) status.textContent = 'Cloud: configured';
  }
}

function saveFirebaseConfig(raw) { localStorage.setItem(STORAGE_FIREBASE_CONFIG, raw); }
function getFirebaseConfigRaw() { return localStorage.getItem(STORAGE_FIREBASE_CONFIG) || ''; }
function isCloudSyncEnabled() { return localStorage.getItem(STORAGE_CLOUD_SYNC) === '1'; }
function setCloudSyncEnabled(v) { localStorage.setItem(STORAGE_CLOUD_SYNC, v ? '1' : '0'); }
function saveSupabaseConfig(raw) { localStorage.setItem(STORAGE_SUPABASE_CONFIG, raw); }
function getSupabaseConfigRaw() { return localStorage.getItem(STORAGE_SUPABASE_CONFIG) || ''; }
function isSupabaseSyncEnabled() { return localStorage.getItem(STORAGE_SUPABASE_SYNC) === '1'; }
function setSupabaseSyncEnabled(v) { localStorage.setItem(STORAGE_SUPABASE_SYNC, v ? '1' : '0'); }
function getBackendConfig() {
  const url = localStorage.getItem(STORAGE_BACKEND_URL) || BACKEND_DEFAULT_URL;
  const enabledStoredValue = localStorage.getItem(STORAGE_BACKEND_ENABLED);
  const enabledStored = enabledStoredValue === '1';
  const enabled = enabledStoredValue === null ? !!url : enabledStored;
  return {
    url,
    token: localStorage.getItem(STORAGE_BACKEND_TOKEN) || '',
    enabled,
  };
}
function saveBackendConfig({ url, token, enabled }) {
  if (url !== undefined) localStorage.setItem(STORAGE_BACKEND_URL, url);
  if (token !== undefined) localStorage.setItem(STORAGE_BACKEND_TOKEN, token);
  localStorage.setItem(STORAGE_BACKEND_ENABLED, enabled ? '1' : '0');
}

function updateBackendStatus(text) { const el = document.getElementById('backend-status'); if (el) el.textContent = text; }

function getBackendAuthToken() { return localStorage.getItem('visionplus_backend_jwt') || ''; }
function setBackendAuthToken(token) { if (token) localStorage.setItem('visionplus_backend_jwt', token); else localStorage.removeItem('visionplus_backend_jwt'); }

async function backendLogin(email, password) {
  const cfg = getBackendConfig();
  if (!cfg.url) throw new Error('Backend not configured');
  const res = await fetch(cfg.url.replace(/\/$/, '') + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!res.ok) throw new Error('Login failed');
  const json = await res.json();
  if (json.token) setBackendAuthToken(json.token);
  return json.token;
}

async function backendTestConnection() {
  const cfg = getBackendConfig();
  if (!cfg.url) { updateBackendStatus('Backend: not configured'); createToast('Backend URL not set', { type: 'warning' }); return false; }
  try {
    const res = await fetch(cfg.url.replace(/\/$/, '') + '/api/catalog');
    if (!res.ok) { updateBackendStatus('Backend: reachable (error)'); createToast('Backend reachable but returned error', { type: 'warning' }); return false; }
    updateBackendStatus('Backend: reachable'); createToast('Backend reachable', { type: 'success' });
    return true;
  } catch (e) {
    updateBackendStatus('Backend: unreachable'); createToast('Backend unreachable', { type: 'error' });
    return false;
  }
}

async function backendUploadImage(dataUrl) {
  const cfg = getBackendConfig();
  if (!cfg.url) throw new Error('Backend not configured');
  // convert dataURL to blob
  const blob = (function(durl) {
    const arr = durl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length; const u8 = new Uint8Array(n);
    while (n--) u8[n] = bstr.charCodeAt(n);
    return new Blob([u8], { type: mime });
  })(dataUrl);
  const form = new FormData();
  form.append('file', blob, 'upload.jpg');
  const headers = {};
  const auth = getBackendAuthToken();
  if (auth) headers['Authorization'] = `Bearer ${auth}`; else if (cfg.token) headers['x-admin-token'] = cfg.token;
  const res = await fetch(cfg.url.replace(/\/$/, '') + '/api/upload', { method: 'POST', body: form, headers });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  let url = json.url || '';
  if (url && url.startsWith('/')) url = cfg.url.replace(/\/$/, '') + url;
  return url;
}

async function backendCreateItem(item) {
  const cfg = getBackendConfig();
  const headers = { 'Content-Type': 'application/json' };
  const auth = getBackendAuthToken();
  if (auth) headers['Authorization'] = `Bearer ${auth}`; else if (cfg.token) headers['x-admin-token'] = cfg.token;
  const res = await fetch(cfg.url.replace(/\/$/, '') + '/api/catalog', { method: 'POST', headers, body: JSON.stringify(item) });
  if (!res.ok) throw new Error('Create item failed');
  return await res.json();
}

async function backendFetchCatalog() {
  const cfg = getBackendConfig();
  const res = await fetch(cfg.url.replace(/\/$/, '') + '/api/catalog');
  if (!res.ok) throw new Error('Fetch catalog failed');
  const items = await res.json();
  if (Array.isArray(items)) {
    return items.map(it => {
      if (it.image && it.image.startsWith('/')) it.image = cfg.url.replace(/\/$/, '') + it.image;
      return it;
    });
  }
  return items;
}

async function loadCatalogFromBackendIfConfigured() {
  const cfg = getBackendConfig();
  if (!cfg.url) return false;
  try {
    const items = await backendFetchCatalog();
    if (Array.isArray(items)) {
      saveCatalog(items);
      renderCatalog();
      renderAdminItemList();
      updateBackendStatus('Backend: loaded');
      createToast('Loaded shared catalog from backend', { type: 'success', duration: 1800 });
      return true;
    }
  } catch (e) {
    console.warn('Failed to load backend catalog', e);
    updateBackendStatus('Backend: load failed');
  }
  return false;
}

function startBackendPoller(interval = 5000) {
  stopBackendPoller();
  backendPoller = setInterval(async () => {
    try {
      const items = await backendFetchCatalog();
      if (Array.isArray(items)) {
        // naive replacement
        saveCatalog(items);
        renderCatalog();
        renderAdminItemList();
      }
    } catch (e) {
      // ignore polling errors silently
    }
  }, interval);
  updateBackendStatus('Backend: polling');
}

function stopBackendPoller() { if (backendPoller) { clearInterval(backendPoller); backendPoller = null; updateBackendStatus('Backend: configured'); } }

// Realtime via Socket.IO (preferred)
async function loadSocketIoClient() {
  if (window.io) return;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function startBackendRealtime() {
  stopBackendPoller();
  if (backendSocket) return;
  const cfg = getBackendConfig();
  if (!cfg.url) return;
  try {
    await loadSocketIoClient();
    backendSocket = window.io(cfg.url, { transports: ['websocket'] });
    backendSocket.on('connect', () => {
      updateBackendStatus('Backend: realtime connected');
      createToast('Realtime backend connected', { type: 'success' });
    });
    backendSocket.on('catalog-updated', (payload) => {
      if (!payload || !Array.isArray(payload.items)) return;
      saveCatalog(payload.items);
      renderCatalog();
      renderAdminItemList();
      const status = document.getElementById('cloud-status'); if (status) status.textContent = 'Backend: realtime';
    });
    backendSocket.on('disconnect', () => {
      updateBackendStatus('Backend: disconnected');
      backendSocket = null;
      // fallback to poller
      startBackendPoller();
    });
  } catch (e) {
    console.warn('Realtime connection failed, falling back to SSE/poller', e);
    startBackendSSE();
  }
}

function stopBackendRealtime() {
  if (backendSocket) {
    try { backendSocket.disconnect(); } catch (e) {}
    backendSocket = null;
  }
}

let backendEventSource = null;
function startBackendSSE() {
  stopBackendRealtime();
  stopBackendPoller();
  if (backendEventSource) return;
  const cfg = getBackendConfig();
  if (!cfg.url) return startBackendPoller();
  try {
    backendEventSource = new EventSource(cfg.url.replace(/\/$/, '') + '/api/sse');
    backendEventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload && Array.isArray(payload.items)) {
          saveCatalog(payload.items);
          renderCatalog();
          renderAdminItemList();
          updateBackendStatus('Backend: sse');
        }
      } catch (err) { /* ignore parse errors */ }
    };
    backendEventSource.onerror = (err) => {
      console.warn('SSE error, falling back to poller', err);
      stopBackendSSE();
      startBackendPoller();
    };
    updateBackendStatus('Backend: sse');
  } catch (e) {
    startBackendPoller();
  }
}

function stopBackendSSE() { if (backendEventSource) { try { backendEventSource.close(); } catch (e) {} backendEventSource = null; } }

function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

// Firestore/Storage rule templates for admin guidance
const RULES = {
  firestore_secure: "rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /visionplus/{document=**} {\n      allow read: if true;\n      allow write: if request.auth != null;\n    }\n  }\n}",
  firestore_testing: "rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /visionplus/{document=**} {\n      allow read, write: if true;\n    }\n  }\n}",
  storage_secure: "rules_version = '2';\nservice firebase.storage {\n  match /b/{bucket}/o {\n    match /visionplus/{allPaths=**} {\n      allow read: if true;\n      allow write: if request.auth != null;\n    }\n  }\n}",
  storage_testing: "rules_version = '2';\nservice firebase.storage {\n  match /b/{bucket}/o {\n    match /{allPaths=**} {\n      allow read, write: if true;\n    }\n  }\n}"
};

function copyToClipboard(text) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); resolve(); } catch (e) { reject(e); }
    ta.remove();
  });
}

async function uploadDataUrlToStorage(dataUrl, path) {
  if (!firebaseInitialized || !firebaseStorage) throw new Error('Firebase not initialized');
  const blob = dataURLtoBlob(dataUrl);
  const ref = firebaseStorage.ref().child(path);
  const snap = await ref.put(blob);
  return await snap.ref.getDownloadURL();
}

async function syncCatalogToCloud() {
  const syncedProviders = [];
  if (isCloudSyncEnabled()) {
    const ok = await initFirebaseIfConfigured();
    if (ok) {
      try {
        const items = JSON.parse(JSON.stringify(catalogItems));
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (it.image && it.image.startsWith('data:')) {
            const ext = it.image.substring(5, it.image.indexOf(';')).split('/')[1] || 'jpg';
            const path = `visionplus/catalog/${it.id}.${ext}`;
            try {
              const url = await uploadDataUrlToStorage(it.image, path);
              it.image = url;
            } catch (e) {
              console.warn('Upload failed for', it.id, e);
            }
          }
        }
        await firebaseFirestore.doc('visionplus/catalog').set({ items, updatedAt: Date.now() });
        syncedProviders.push('Firebase');
      } catch (e) {
        console.error(e);
        createToast('Firebase sync failed', { type: 'warning' });
      }
    }
  }
  if (isSupabaseSyncEnabled()) {
    try {
      await syncCatalogToSupabase();
      syncedProviders.push('Supabase');
    } catch (e) {
      console.error(e);
      createToast('Supabase sync failed', { type: 'warning' });
    }
  }
  if (syncedProviders.length) {
    createToast(`Catalog synced to ${syncedProviders.join(' + ')}`, { type: 'success' });
  } else {
    createToast('No cloud sync provider configured', { type: 'warning' });
  }
}

async function loadCatalogFromCloud() {
  if (isCloudSyncEnabled()) {
    const ok = await initFirebaseIfConfigured();
    if (ok) {
      try {
        const doc = await firebaseFirestore.doc('visionplus/catalog').get();
        if (!doc.exists) { createToast('No catalog found in Firebase', { type: 'warning' }); return; }
        const data = doc.data();
        if (!data || !Array.isArray(data.items)) { createToast('Invalid cloud catalog', { type: 'error' }); return; }
        const confirmed = confirm('Load catalog from Firebase and replace local catalog? This will overwrite local changes.');
        if (!confirmed) return;
        saveCatalog(data.items);
        renderCatalog();
        renderAdminItemList();
        createToast('Catalog loaded from Firebase', { type: 'success' });
        return;
      } catch (e) {
        console.error(e);
        createToast('Failed to load catalog from Firebase', { type: 'warning' });
      }
    }
  }
  if (isSupabaseSyncEnabled()) {
    try {
      const ok = await loadCatalogFromSupabase();
      if (ok) {
        createToast('Catalog loaded from Supabase', { type: 'success' });
        return;
      }
      createToast('No catalog found in Supabase', { type: 'warning' });
    } catch (e) {
      console.error(e);
      createToast('Failed to load catalog from Supabase', { type: 'warning' });
    }
    return;
  }
  createToast('No cloud sync provider configured', { type: 'warning' });
}

function getUsers() { try { const raw = localStorage.getItem(STORAGE_USERS); return raw ? JSON.parse(raw) : []; } catch (e) { return []; } }
function saveUsers(u) { localStorage.setItem(STORAGE_USERS, JSON.stringify(u)); }

function registerCustomer(name, email, password, phone='') {
  const users = getUsers();
  if (users.find(u => u.email === email)) return { ok: false, message: 'Email already registered' };
  const user = { name, email, password, phone };
  users.push(user); saveUsers(users);
  sessionStorage.setItem(SESSION_CUSTOMER, JSON.stringify(user));
  return { ok: true, user };
}

function loginCustomer(email, password) {
  const users = getUsers();
  const u = users.find(x => x.email === email && x.password === password);
  if (!u) return { ok: false };
  sessionStorage.setItem(SESSION_CUSTOMER, JSON.stringify(u));
  return { ok: true, user: u };
}

function logoutCustomer() { sessionStorage.removeItem(SESSION_CUSTOMER); }

function getCurrentCustomer() { try { const raw = sessionStorage.getItem(SESSION_CUSTOMER); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
function isCustomerLoggedIn() { return !!getCurrentCustomer(); }


function setAdminLoggedIn(val) {
  if (val) sessionStorage.setItem('visionplus_admin_logged_in', '1'); else sessionStorage.removeItem('visionplus_admin_logged_in');
}

function isAdminLoggedIn() {
  return sessionStorage.getItem('visionplus_admin_logged_in') === '1';
}

function isValidAdminCredentials(email, password) {
  const normalizedEmail = email.replace(',', '@').toLowerCase();
  const validEmail = ADMIN_EMAILS.some((allowed) => normalizedEmail === allowed.toLowerCase());
  return validEmail && password === ADMIN_PASSWORD;
}

const appointmentForm = document.getElementById('appointment-form');
const formMessage = document.getElementById('form-message');
const whatsappDisplay = document.getElementById('whatsapp-display');
const framesGrid = document.getElementById('frames-grid');
const casesGrid = document.getElementById('cases-grid');
const contactLensesGrid = document.getElementById('contact-lenses-grid');
const adminLoginCard = document.getElementById('admin-login-card');
const adminDashboard = document.getElementById('admin-dashboard');
const adminLoginForm = document.getElementById('admin-login-form');
const adminSettingsForm = document.getElementById('admin-settings-form');
const adminAddItemForm = document.getElementById('admin-add-item-form');
const adminRemoveCategoryForm = document.getElementById('admin-remove-category-form');
const adminLogoutButton = document.getElementById('logout-button');
const adminItemSaveButton = document.getElementById('admin-item-save-button');
const adminItemList = document.getElementById('admin-item-list');
const adminWhatsappInput = document.getElementById('admin-whatsapp-number');
const adminItemUploadButton = document.getElementById('admin-item-upload-button');
const adminItemImagePreview = document.getElementById('admin-item-image-preview');
const adminRemoveCategorySelect = document.getElementById('admin-remove-category');
const adminRemoveCategoryPreview = document.getElementById('admin-remove-category-items');
const adminRemoveCategoryMessage = document.getElementById('admin-remove-category-message');
const adminSettingsMessage = document.getElementById('admin-settings-message');
const adminAddMessage = document.getElementById('admin-add-message');
const adminLoginError = document.getElementById('admin-login-error');
const adminForgotLink = document.getElementById('admin-forgot-link');
const adminForgotForm = document.getElementById('admin-forgot-form');
const adminForgotEmail = document.getElementById('admin-forgot-email');
const adminForgotMessage = document.getElementById('admin-forgot-message');
const adminForgotError = document.getElementById('admin-forgot-error');
const adminResetForm = document.getElementById('admin-reset-form');
const adminResetPassword = document.getElementById('admin-reset-password');
const adminResetConfirm = document.getElementById('admin-reset-confirm');
const adminResetTokenInput = document.getElementById('admin-reset-token');
const adminResetMessage = document.getElementById('admin-reset-message');
const adminResetError = document.getElementById('admin-reset-error');
const adminNavLink = document.getElementById('admin-nav-link');
const cartNavLink = document.getElementById('cart-nav-link');
const cartContents = document.getElementById('cart-contents');
const cartActions = document.getElementById('cart-actions');
const currentPage = window.location.pathname.split('/').pop() || '';

const defaultCatalog = [
  {
    id: 'frame-1',
    category: 'frames',
    title: 'Classic Rectangle Frames',
    description: 'Timeless shape, lightweight fit, and polish-ready design for everyday wear.',
    image: 'images/WhatsApp Image 2026-07-23 at 22.22.35.jpeg',
    price: 320.00,
  },
  {
    id: 'frame-2',
    category: 'frames',
    title: 'Modern Round Frames',
    description: 'Bold, fashionable, and perfect for a statement look with clear prescription lenses.',
    image: 'images/WhatsApp Image 2026-07-23 at 22.22.46.jpeg',
    price: 360.00,
  },
  {
    id: 'frame-3',
    category: 'frames',
    title: 'Lightweight Metal Frames',
    description: 'Sleek metal design with adjustable nose pads and a refined finish.',
    image: 'images/WhatsApp Image 2026-07-23 at 22.22.56.jpeg',
    price: 390.00,
  },
  {
    id: 'frame-450',
    category: 'frames',
    title: 'Premium 450 Frame Series',
    description: 'A fresh, elegant frame collection made for everyday confidence and a modern look.',
    image: encodeURI('products/frames/450 frames/WhatsApp Image 2026-07-26 at 21.01.23 (1).jpeg'),
    price: 450.00,
  },
  {
    id: 'frame-500',
    category: 'frames',
    title: 'Luxury 500 Frame Collection',
    description: 'Bold lines and a premium finish give these frames a standout, fashion-forward feel.',
    image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.53.57 (1).jpeg'),
    price: 500.00,
  },
  {
    id: 'frame-kids-350',
    category: 'frames',
    title: 'Children’s 350 Frame Set',
    description: 'Bright, cheerful, and comfortable frames designed especially for kids with style.',
    image: encodeURI('products/frames/chidren frames 350/WhatsApp Image 2026-07-26 at 21.01.28 (1).jpeg'),
    price: 350.00,
  },
  {
    id: 'frame-sunglasses-400',
    category: 'frames',
    title: 'Sungrasses 400 Edition',
    description: 'Trendsetting sunglasses with a classy glow and reliable sun protection.',
    image: encodeURI('products/frames/sungrasses 400/WhatsApp Image 2026-07-26 at 21.03.29.jpeg'),
    price: 400.00,
  },
  {
    id: 'case-1',
    category: 'cases',
    title: 'Shield Guard Case',
    description: 'Sturdy, impact-resistant case with soft interior for safe storage.',
    image: 'images/WhatsApp Image 2026-07-23 at 22.22.34.jpeg',
    price: 80.00,
  },
  {
    id: 'case-2',
    category: 'cases',
    title: 'Metro Travel Pouch',
    description: 'Light and compact, ideal for a purse or backpack on the go.',
    image: 'images/WhatsApp Image 2026-07-23 at 22.22.47.jpeg',
    price: 95.00,
  },
  {
    id: 'case-3',
    category: 'cases',
    title: 'Elite Designer Case',
    description: 'Premium finish with a secure magnetic closure and elegant style.',
    image: 'images/WhatsApp Image 2026-07-23 at 22.22.55.jpeg',
    price: 120.00,
  },
  {
    id: 'case-4',
    category: 'cases',
    title: 'Signature Vision Case',
    description: 'A polished, protective option that keeps your frames neat and ready to wear.',
    image: encodeURI('products/cases/WhatsApp Image 2026-07-26 at 20.56.49.jpeg'),
    price: 85.00,
  },
  {
    id: 'case-5',
    category: 'cases',
    title: 'Atlas Travel Sleeve',
    description: 'Slim, stylish, and convenient for daily carrying with extra protection.',
    image: encodeURI('products/cases/WhatsApp Image 2026-07-26 at 20.56.51 (1).jpeg'),
    price: 90.00,
  },
  {
    id: 'case-6',
    category: 'cases',
    title: 'Luxe Protective Cover',
    description: 'A chic cover that guards your eyewear without compromising on style.',
    image: encodeURI('products/cases/WhatsApp Image 2026-07-26 at 20.56.52.jpeg'),
    price: 100.00,
  },
  {
    id: 'lens-1',
    category: 'contact-lenses',
    title: 'Daily Comfort Contact Lenses',
    description: 'Soft daily disposable lenses designed for all-day comfort and clear vision.',
    image: 'images/WhatsApp Image 2026-07-23 at 22.22.53.jpeg',
    price: 120.00,
  },
  {
    id: 'lens-2',
    category: 'contact-lenses',
    title: 'Monthly Performance Contact Lenses',
    description: 'Reliable monthly lenses with excellent breathability and a comfortable fit.',
    image: 'images/back3.jpeg',
    price: 200.00,
  },
];

let catalogItems = [];
let currentWhatsApp = loadWhatsAppNumber();

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeCatalogPath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}

function isImagePath(value) {
  const normalized = String(value || '').toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.jfif', '.svg'].some((ext) => normalized.endsWith(ext));
}

async function listDirectoryEntries(directoryPath) {
  const normalizedPath = normalizeCatalogPath(directoryPath);
  const requestPath = normalizedPath ? `${normalizedPath}/` : '/';
  const response = await fetch(requestPath, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to read ${requestPath}`);

  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  return Array.from(doc.querySelectorAll('a[href]'))
    .map((link) => link.getAttribute('href'))
    .filter(Boolean)
    .map((value) => decodeURIComponent(value).split('?')[0])
    .filter((value) => value && value !== '.' && value !== '..')
    .map((value) => value.replace(/^\/+/, ''));
}

async function discoverImagesFromDirectory(directoryPath) {
  const entries = await listDirectoryEntries(directoryPath);
  return entries
    .filter((entry) => !entry.endsWith('/') && isImagePath(entry))
    .map((entry) => normalizeCatalogPath(`${directoryPath}/${entry}`));
}

function buildManualFrameItems() {
  return [
    {
      id: 'manual-frame-450-1',
      category: 'frames',
      title: 'Aurelia Classic',
      description: 'Elegant 450-series frame with a polished, modern finish and everyday comfort.',
      image: encodeURI('products/frames/450 frames/WhatsApp Image 2026-07-26 at 21.01.23 (1).jpeg'),
      price: 450.00,
    },
    {
      id: 'manual-frame-450-2',
      category: 'frames',
      title: 'Nova Rectangle',
      description: 'Stylish 450-series frame offering a refined silhouette and premium look.',
      image: encodeURI('products/frames/450 frames/WhatsApp Image 2026-07-26 at 21.01.23 (2).jpeg'),
      price: 450.00,
    },
    {
      id: 'manual-frame-450-3',
      category: 'frames',
      title: 'Lumen Square',
      description: 'Contemporary 450-series frame crafted for confidence and all-day wear.',
      image: encodeURI('products/frames/450 frames/WhatsApp Image 2026-07-26 at 21.01.23.jpeg'),
      price: 450.00,
    },
    {
      id: 'manual-frame-450-4',
      category: 'frames',
      title: 'Eclipse Edge',
      description: 'Premium 450-series frame with clean lines and a comfortable fit.',
      image: encodeURI('products/frames/450 frames/WhatsApp Image 2026-07-26 at 21.01.24 (1).jpeg'),
      price: 450.00,
    },
    {
      id: 'manual-frame-450-5',
      category: 'frames',
      title: 'Vega Modern',
      description: 'A bold yet elegant 450-series design with a recognizable fashion-forward look.',
      image: encodeURI('products/frames/450 frames/WhatsApp Image 2026-07-26 at 21.01.24 (2).jpeg'),
      price: 450.00,
      imageRotationDeg: 180,
    },
    {
      id: 'manual-frame-450-6',
      category: 'frames',
      title: 'Orbit Soft',
      description: 'Refined 450-series frame that balances simplicity, comfort, and premium styling.',
      image: encodeURI('products/frames/450 frames/WhatsApp Image 2026-07-26 at 21.01.24.jpeg'),
      price: 450.00,
    },
    {
      id: 'manual-frame-500-1',
      category: 'frames',
      title: 'Monarch Premium',
      description: 'Luxury 500-series frame with a high-end silhouette and standout presence.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.53.57 (1).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-2',
      category: 'frames',
      title: 'Velvet Luxe',
      description: 'Modern 500-series frame featuring a sleek finish and elegant shape.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.53.57.jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-3',
      category: 'frames',
      title: 'Atlas Bold',
      description: 'Premium 500-series frame designed for bold style and effortless wear.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.53.58 (1).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-4',
      category: 'frames',
      title: 'Crest Elegant',
      description: 'Classy 500-series frame with a refined profile and premium craftsmanship.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.53.58 (2).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-5',
      category: 'frames',
      title: 'Sage Trend',
      description: 'Fashion-forward 500-series frame made for modern styling and comfort.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.53.58.jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-6',
      category: 'frames',
      title: 'Coral Statement',
      description: 'Confident 500-series frame with a striking shape and premium finish.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.53.59 (1).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-7',
      category: 'frames',
      title: 'Pine Fashion',
      description: 'Sophisticated 500-series frame built for a sleek and polished everyday look.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.53.59 (2).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-8',
      category: 'frames',
      title: 'Harbor Deluxe',
      description: 'Luxury 500-series frame offering comfort, approachability, and bold style.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.53.59.jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-9',
      category: 'frames',
      title: 'Noir Chic',
      description: 'Elegant 500-series design with refined detailing and a premium edge.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.54.00 (1).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-10',
      category: 'frames',
      title: 'Ember Contemporary',
      description: 'Contemporary 500-series frame made for stylish everyday confidence.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.54.00 (2).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-11',
      category: 'frames',
      title: 'Silver Line',
      description: 'Sharp 500-series lines and a premium finish for a standout profile.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.54.00 (3).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-12',
      category: 'frames',
      title: 'Mira Classic',
      description: 'A polished 500-series frame that pairs comfortably with modern fashion.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.54.00.jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-13',
      category: 'frames',
      title: 'Dawn Modern',
      description: 'Trendy 500-series frame with a sleek silhouette and high-end appeal.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.54.01 (1).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-14',
      category: 'frames',
      title: 'Ridge Style',
      description: 'Bold 500-series frame crafted with a fashionable flair and premium finish.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.54.01 (2).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-15',
      category: 'frames',
      title: 'Apex Refined',
      description: 'Elegant 500-series style with refined edge and confident everyday styling.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.54.01.jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-16',
      category: 'frames',
      title: 'Luna Premium',
      description: 'Luxury 500-series frame offering standout shape and lasting comfort.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.55.02 (1).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-17',
      category: 'frames',
      title: 'Halo Designer',
      description: 'Premium 500-series frame with a contemporary design and polished finish.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.55.02.jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-18',
      category: 'frames',
      title: 'Brighton Vogue',
      description: 'Modern 500-series frame made to deliver comfort and style in equal measure.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.55.03 (1).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-19',
      category: 'frames',
      title: 'Cedar Minimal',
      description: 'Minimalist 500-series frame with a confident silhouette and refined finish.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.55.03 (2).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-20',
      category: 'frames',
      title: 'Solace Elite',
      description: 'Elevated 500-series frame crafted for polished, everyday expression.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.55.03.jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-21',
      category: 'frames',
      title: 'Aurora Luxe',
      description: 'An attractive 500-series frame featuring sharp detail and a premium feel.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.55.04 (1).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-22',
      category: 'frames',
      title: 'Vesper Bold',
      description: 'Bright and stylish 500-series frame with a confident, modern profile.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.55.04 (2).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-23',
      category: 'frames',
      title: 'Crown Sharp',
      description: 'Premium 500-series frame with a sleek shape and clean detailing.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.55.04.jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-24',
      category: 'frames',
      title: 'Zenith Trend',
      description: 'Fashionable 500-series frame built for modern style and easy comfort.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.55.05 (1).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-25',
      category: 'frames',
      title: 'Noble Modern',
      description: 'Contemporary 500-series frame with a refined look and strong visual appeal.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.55.05 (2).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-26',
      category: 'frames',
      title: 'Prism Elegant',
      description: 'Elegant 500-series frame finished for a polished and premium presentation.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.55.05 (3).jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-27',
      category: 'frames',
      title: 'Summit Classic',
      description: 'Classic-meets-modern 500-series frame with a confident and balanced shape.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.55.05.jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-500-28',
      category: 'frames',
      title: 'Regal Deluxe',
      description: 'Luxury 500-series frame created to elevate everyday dressing with style.',
      image: encodeURI('products/frames/500 frames/WhatsApp Image 2026-07-27 at 14.55.06.jpeg'),
      price: 500.00,
    },
    {
      id: 'manual-frame-kids-1',
      category: 'frames',
      title: 'Sunny Kids',
      description: 'Bright and cheerful children’s frame with a comfortable fit and playful character.',
      image: encodeURI('products/frames/chidren frames 350/WhatsApp Image 2026-07-26 at 21.01.28 (1).jpeg'),
      price: 350.00,
    },
    {
      id: 'manual-frame-kids-2',
      category: 'frames',
      title: 'Mini Bloom',
      description: 'Friendly children’s frame made for youthful style and dependable comfort.',
      image: encodeURI('products/frames/chidren frames 350/WhatsApp Image 2026-07-26 at 21.01.28.jpeg'),
      price: 350.00,
    },
    {
      id: 'manual-frame-kids-3',
      category: 'frames',
      title: 'Junior Glow',
      description: 'Sunny children’s frame that combines comfort with a cheerful, modern look.',
      image: encodeURI('products/frames/chidren frames 350/WhatsApp Image 2026-07-26 at 21.01.29 (1).jpeg'),
      price: 350.00,
    },
    {
      id: 'manual-frame-kids-4',
      category: 'frames',
      title: 'Little Dash',
      description: 'A fun and practical children’s frame designed for daily wear and easy styling.',
      image: encodeURI('products/frames/chidren frames 350/WhatsApp Image 2026-07-26 at 21.01.29.jpeg'),
      price: 350.00,
    },
    {
      id: 'manual-frame-kids-5',
      category: 'frames',
      title: 'Happy Star',
      description: 'A charming children’s frame with a light, comfortable shape and vibrant feel.',
      image: encodeURI('products/frames/chidren frames 350/WhatsApp Image 2026-07-26 at 21.01.30 (1).jpeg'),
      price: 350.00,
    },
    {
      id: 'manual-frame-kids-6',
      category: 'frames',
      title: 'Kiki Fun',
      description: 'Colorful children’s frame that balances style, comfort, and personality.',
      image: encodeURI('products/frames/chidren frames 350/WhatsApp Image 2026-07-26 at 21.01.30.jpeg'),
      price: 350.00,
    },
    {
      id: 'manual-frame-kids-7',
      category: 'frames',
      title: 'Buddy Bright',
      description: 'A lightweight and playful children’s frame for everyday confidence.',
      image: encodeURI('products/frames/chidren frames 350/WhatsApp Image 2026-07-26 at 21.01.31.jpeg'),
      price: 350.00,
    },
    {
      id: 'manual-frame-kids-8',
      category: 'frames',
      title: 'Pop Mini',
      description: 'Cute and practical children’s frame with cheerful energy and a comfortable fit.',
      image: encodeURI('products/frames/chidren frames 350/WhatsApp Image 2026-07-26 at 21.01.32.jpeg'),
      price: 350.00,
    },
    {
      id: 'manual-frame-kids-9',
      category: 'frames',
      title: 'Spark Junior',
      description: 'Bright children’s frame designed for a delightful and confident look.',
      image: encodeURI('products/frames/chidren frames 350/WhatsApp Image 2026-07-26 at 21.01.33.jpeg'),
      price: 350.00,
    },
    {
      id: 'manual-frame-kids-10',
      category: 'frames',
      title: 'Playful Wave',
      description: 'Playful children’s frame shaped for comfort and youthful expression.',
      image: encodeURI('products/frames/chidren frames 350/WhatsApp Image 2026-07-26 at 21.01.34 (1).jpeg'),
      price: 350.00,
    },
    {
      id: 'manual-frame-kids-11',
      category: 'frames',
      title: 'Teddy Cool',
      description: 'Exciting children’s frame with a clean design and cheerful finish.',
      image: encodeURI('products/frames/chidren frames 350/WhatsApp Image 2026-07-26 at 21.01.34.jpeg'),
      price: 350.00,
    },
    {
      id: 'manual-frame-kids-12',
      category: 'frames',
      title: 'Little Nova',
      description: 'Lightweight children’s frame with a fun, youthful feel and durable fit.',
      image: encodeURI('products/frames/chidren frames 350/WhatsApp Image 2026-07-26 at 21.01.35.jpeg'),
      price: 350.00,
    },
    {
      id: 'manual-frame-sunglass-1',
      category: 'frames',
      title: 'Sunbeam Shades',
      description: 'Modern sungrasses design with premium style and reliable sun protection.',
      image: encodeURI('products/frames/sungrasses 400/WhatsApp Image 2026-07-26 at 21.03.29.jpeg'),
      price: 400.00,
    },
    {
      id: 'manual-frame-sunglass-2',
      category: 'frames',
      title: 'Coastline Shades',
      description: 'Classic sungrasses frame offering a polished, fashionable finish.',
      image: encodeURI('products/frames/sungrasses 400/WhatsApp Image 2026-07-26 at 21.03.31.jpeg'),
      price: 400.00,
    },
  ];
}

function buildManualCaseItems() {
  return [
    {
      id: 'manual-case-1',
      category: 'cases',
      title: 'Shield Guard Case',
      description: 'A durable protective case that keeps your glasses safe with a polished finish.',
      image: encodeURI('products/cases/WhatsApp Image 2026-07-26 at 20.56.49.jpeg'),
      price: 50.00,
    },
    {
      id: 'manual-case-2',
      category: 'cases',
      title: 'Metro Travel Pouch',
      description: 'A sleek travel pouch designed for easy carrying and everyday convenience.',
      image: encodeURI('products/cases/WhatsApp Image 2026-07-26 at 20.56.51 (1).jpeg'),
      price: 50.00,
    },
    {
      id: 'manual-case-3',
      category: 'cases',
      title: 'Atlas Soft Sleeve',
      description: 'A soft protective sleeve that offers light coverage and comfortable storage.',
      image: encodeURI('products/cases/WhatsApp Image 2026-07-26 at 20.56.51.jpeg'),
      price: 50.00,
    },
    {
      id: 'manual-case-4',
      category: 'cases',
      title: 'Luxe Protective Cover',
      description: 'A premium cover crafted to protect your eyewear while adding a stylish touch.',
      image: encodeURI('products/cases/WhatsApp Image 2026-07-26 at 20.56.52 (1).jpeg'),
      price: 50.00,
    },
    {
      id: 'manual-case-5',
      category: 'cases',
      title: 'Signature Vision Case',
      description: 'A refined case with elegant details and dependable protection for daily use.',
      image: encodeURI('products/cases/WhatsApp Image 2026-07-26 at 20.56.52.jpeg'),
      price: 50.00,
    },
  ];
}

async function discoverCatalogItems() {
  return [...buildManualFrameItems(), ...buildManualCaseItems()];
}

async function initializeCatalog() {
  catalogItems = await loadCatalog();
  if (getBackendConfig().enabled) {
    const backendLoaded = await loadCatalogFromBackendIfConfigured();
    if (backendLoaded) return;
  }
  renderCatalog();
  renderAdminItemList();
}

async function loadCatalog() {
  try {
    const saved = localStorage.getItem(STORAGE_CATALOG);
    let catalogItemsFromStorage = [];

    if (saved) {
      const parsed = JSON.parse(saved);
      catalogItemsFromStorage = Array.isArray(parsed) ? parsed : [];
    }

    const discoveredItems = await discoverCatalogItems();
    const mergedCatalog = [...catalogItemsFromStorage];
    const existingIds = new Set(mergedCatalog.map((item) => item.id));

    discoveredItems.forEach((item) => {
      if (!existingIds.has(item.id)) {
        mergedCatalog.push(item);
        existingIds.add(item.id);
      }
    });

    if (mergedCatalog.length) {
      localStorage.setItem(STORAGE_CATALOG, JSON.stringify(mergedCatalog));
      return mergedCatalog;
    }

    localStorage.setItem(STORAGE_CATALOG, JSON.stringify(defaultCatalog));
    return [...defaultCatalog];
  } catch (error) {
    console.warn('Unable to load product folders:', error);
    const saved = localStorage.getItem(STORAGE_CATALOG);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [...defaultCatalog];
  }
}

function saveCatalog(items) {
  catalogItems = items;
  localStorage.setItem(STORAGE_CATALOG, JSON.stringify(items));
  if (typeof window !== 'undefined') {
    window.__visionplusCatalogVersion = (window.__visionplusCatalogVersion || 0) + 1;
  }
}

function updateCatalogItems(items) {
  catalogItems = items;
  if (typeof window !== 'undefined') {
    window.__visionplusCatalogVersion = (window.__visionplusCatalogVersion || 0) + 1;
  }
}

function markPendingCatalogChanges() {
  pendingCatalogChanges = true;
  if (adminItemSaveButton) adminItemSaveButton.style.display = 'inline-flex';
}

function clearPendingCatalogChanges() {
  pendingCatalogChanges = false;
  if (adminItemSaveButton) adminItemSaveButton.style.display = 'none';
}

async function savePendingCatalogChanges() {
  saveCatalog(catalogItems);
  clearPendingCatalogChanges();

  try {
    if (getBackendConfig().enabled) {
      await syncCatalogToConfiguredProviders();
      createToast('Catalog changes saved and synced.', { type: 'success' });
      return;
    }
  } catch (e) {
    console.warn('Sync after save failed', e);
    createToast('Catalog saved locally, but sync failed.', { type: 'warning' });
    return;
  }

  createToast('Catalog changes saved locally.', { type: 'success' });
}

async function syncCatalogToConfiguredProviders() {
  try {
    const cfg = getBackendConfig();
    if (cfg.enabled && cfg.url) {
      const backendItems = JSON.parse(JSON.stringify(catalogItems));
      await backendReplaceCatalog(backendItems);
    }
  } catch (e) {
    console.warn('Backend sync after catalog save failed', e);
  }

  try {
    await syncCatalogToCloud();
  } catch (e) {
    console.warn('Cloud sync after catalog save failed', e);
  }
}

function createToast(message, options = {}) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${options.type || 'info'}`.trim();
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-hidden');
    setTimeout(() => toast.remove(), 200);
  }, options.duration || 3200);
}

function loadWhatsAppNumber() {
  const saved = localStorage.getItem(STORAGE_WHATSAPP);
  if (!saved || saved === LEGACY_WHATSAPP) {
    localStorage.setItem(STORAGE_WHATSAPP, DEFAULT_WHATSAPP);
    return DEFAULT_WHATSAPP;
  }
  return saved;
}

function saveWhatsAppNumber(number) {
  currentWhatsApp = number;
  localStorage.setItem(STORAGE_WHATSAPP, number);
}

function normalizeWhatsApp(number) {
  return number.replace(/[^+0-9]/g, '');
}

function updateWhatsAppDisplay() {
  if (whatsappDisplay) {
    whatsappDisplay.textContent = currentWhatsApp;
  }
  if (adminWhatsappInput) {
    adminWhatsappInput.value = currentWhatsApp;
  }
}

function findCatalogItem(itemId) {
  return catalogItems.find((item) => item.id === itemId);
}

function updateNavLinks() {
  if (adminNavLink) {
    adminNavLink.style.display = isAdminLoggedIn() ? 'inline-flex' : 'none';
  }
  if (cartNavLink) {
    const loggedIn = isCustomerLoggedIn();
    cartNavLink.style.display = loggedIn ? 'inline-flex' : 'none';
    cartNavLink.textContent = loggedIn ? `Cart (${getCartCount()})` : 'Cart';
  }
}

function getCartDetails() {
  return loadCart().map((cartItem) => {
    const catalogItem = findCatalogItem(cartItem.id) || {};
    return {
      id: cartItem.id,
      qty: cartItem.qty,
      title: catalogItem.title || 'Unknown item',
      description: catalogItem.description || '',
      image: catalogItem.image || '',
      price: Number(catalogItem.price || 0),
    };
  });
}

async function buildOrderDetailsUrl(payload) {
  const backendCfg = getBackendConfig();
  // If backend is configured, POST the order and get a short URL
  if (backendCfg.enabled && backendCfg.url) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      const auth = getBackendAuthToken();
      if (auth) headers['Authorization'] = `Bearer ${auth}`;
      else if (backendCfg.token) headers['x-admin-token'] = backendCfg.token;
      const res = await fetch(backendCfg.url.replace(/\/$/, '') + '/api/orders', { method: 'POST', headers, body: JSON.stringify(payload) });
      if (res.ok) {
        const json = await res.json();
        if (json.url) return json.url;
        if (json.id) return backendCfg.url.replace(/\/$/, '') + '/orders/' + json.id;
      }
    } catch (e) {
      console.warn('Failed to create backend order link', e);
    }
  }
  // Fallback to long client-side order page with encoded cart
  const orderUrl = new URL('order.html', window.location.href);
  orderUrl.searchParams.set('cart', JSON.stringify(payload));
  return orderUrl.href;
}

function buildWhatsAppOrderMessage(items, orderLink) {
  const user = getCurrentCustomer();
  const lines = [];
  lines.push(`Order from ${user?.name || 'Customer'} (${user?.email || 'no email'})`);
  if (user?.phone) {
    lines.push(`Phone: ${user.phone}`);
  }
  lines.push('Items:');
  items.forEach((item) => {
    lines.push(`- ${item.title} x${item.qty} @ ZMW ${item.price.toFixed(2)} = ZMW ${(item.price * item.qty).toFixed(2)}`);
  });
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  lines.push(`Total: ZMW ${total.toFixed(2)}`);
  if (orderLink) {
    lines.push('Order details:');
    lines.push(orderLink);
  }
  return lines.join('\n');
}

async function sendCartToWhatsApp() {
  const user = getCurrentCustomer();
  if (!user) {
    createAccountModal();
    openAccountModal();
    return;
  }
  const items = getCartDetails();
  if (!items.length) {
    createToast('Add items to cart before sending an order.', { type: 'warning' });
    return;
  }
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const payload = { customer: user, items, total };
  let orderLink = '';
  try { orderLink = await buildOrderDetailsUrl(payload); } catch (e) { orderLink = ''; }
  const text = encodeURIComponent(buildWhatsAppOrderMessage(items, orderLink));
  const number = normalizeWhatsApp(currentWhatsApp).replace('+', '');
  const whatsappUrl = `https://wa.me/${number}?text=${text}`;
  window.open(whatsappUrl, '_blank');
}

function reviewOrderSummary() {
  const user = getCurrentCustomer();
  if (!user) {
    createAccountModal();
    openAccountModal();
    return;
  }
  const items = getCartDetails();
  if (!items.length) {
    createToast('Add items to cart before reviewing your order.', { type: 'warning' });
    return;
  }
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const payload = { customer: user, items, total };
  window.location.href = `order.html?cart=${encodeURIComponent(JSON.stringify(payload))}`;
}

function renderCartPage() {
  if (!cartContents) return;
  const items = getCartDetails();
  if (!items.length) {
    cartContents.innerHTML = '<div class="cart-empty"><p>Your cart is empty. Log in and add products to begin.</p></div>';
    if (cartActions) cartActions.innerHTML = '';
    return;
  }
  cartContents.innerHTML = items.map((item) => `
    <div class="cart-item" data-cart-id="${item.id}">
      <img class="cart-thumb" loading="lazy" src="${item.image}" alt="${item.title}" />
      <div class="cart-item-details">
        <h4>${item.title}</h4>
        <p>${item.description}</p>
        <p class="price">ZMW ${item.price.toFixed(2)}</p>
      </div>
      <div class="cart-item-actions">
        <div class="cart-row">
          <button class="button-secondary cart-decrease" type="button">−</button>
          <span>${item.qty}</span>
          <button class="button-secondary cart-increase" type="button">+</button>
        </div>
        <button class="button danger-button cart-remove" type="button">Remove</button>
      </div>
    </div>
  `).join('');

  if (cartActions) {
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    cartActions.innerHTML = `
      <div class="cart-summary">
        <div>
          <strong>${items.length} item${items.length === 1 ? '' : 's'}</strong>
          <div>Total: ZMW ${total.toFixed(2)}</div>
        </div>
        <div class="cart-actions-buttons">
          <button id="clear-cart-button" class="button-secondary" type="button">Clear cart</button>
          <button id="review-order-button" class="button-secondary" type="button">Review summary</button>
          <button id="send-whatsapp-order" class="button" type="button">Send order via WhatsApp</button>
        </div>
      </div>
    `;
  }

  cartContents.querySelectorAll('.cart-increase').forEach((btn) => {
    btn.addEventListener('click', () => {
      const itemId = btn.closest('[data-cart-id]')?.getAttribute('data-cart-id');
      if (!itemId) return;
      const cart = loadCart();
      const entry = cart.find((c) => c.id === itemId);
      if (entry) entry.qty += 1;
      saveCart(cart);
      updateCartButton();
      updateNavLinks();
      renderCartPage();
    });
  });

  cartContents.querySelectorAll('.cart-decrease').forEach((btn) => {
    btn.addEventListener('click', () => {
      const itemId = btn.closest('[data-cart-id]')?.getAttribute('data-cart-id');
      if (!itemId) return;
      const cart = loadCart();
      const entry = cart.find((c) => c.id === itemId);
      if (entry) {
        entry.qty = Math.max(1, entry.qty - 1);
        saveCart(cart);
        updateCartButton();
        updateNavLinks();
        renderCartPage();
      }
    });
  });

  cartContents.querySelectorAll('.cart-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const itemId = btn.closest('[data-cart-id]')?.getAttribute('data-cart-id');
      if (!itemId) return;
      const cart = loadCart().filter((c) => c.id !== itemId);
      saveCart(cart);
      updateCartButton();
      updateNavLinks();
      renderCartPage();
    });
  });

  if (cartActions) {
    const clearButton = document.getElementById('clear-cart-button');
    const reviewButton = document.getElementById('review-order-button');
    const sendButton = document.getElementById('send-whatsapp-order');
    clearButton?.addEventListener('click', () => {
      saveCart([]);
      updateCartButton();
      updateNavLinks();
      renderCartPage();
    });
    reviewButton?.addEventListener('click', reviewOrderSummary);
    sendButton?.addEventListener('click', sendCartToWhatsApp);
  }
}

function renderCatalog() {
  if (framesGrid) framesGrid.innerHTML = '';
  if (casesGrid) casesGrid.innerHTML = '';
  if (contactLensesGrid) contactLensesGrid.innerHTML = '';

  const manualFrameItems = buildManualFrameItems();
  const manualCaseItems = buildManualCaseItems();
  const displayItems = [
    ...catalogItems,
    ...manualFrameItems.filter((item) => !catalogItems.some((existing) => existing.id === item.id)),
    ...manualCaseItems.filter((item) => !catalogItems.some((existing) => existing.id === item.id)),
  ];

  displayItems.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const imageClassName = item.imageRotationDeg ? 'card-image image-rotated' : 'card-image';
    const imageStyle = item.imageRotationDeg ? `style="--image-rotation:${item.imageRotationDeg}deg;"` : '';
    card.innerHTML = `
      <img class="${imageClassName}" loading="lazy" src="${item.image}" alt="${item.title}" ${imageStyle} />
      <h4>${item.title}</h4>
      <p>${item.description}</p>
      <div class="product-meta">
        <span class="price">ZMW ${Number(item.price || 0).toFixed(2)}</span>
      </div>
      <div class="add-to-cart">
        <input type="number" min="1" value="1" class="qty-input" data-item-id="${item.id}" />
        <button class="button add-cart-button" data-add-id="${item.id}">Add to cart</button>
      </div>
    `;

    if (item.category === 'frames' && framesGrid) framesGrid.appendChild(card);
    if (item.category === 'cases' && casesGrid) casesGrid.appendChild(card);
    if (item.category === 'contact-lenses' && contactLensesGrid) contactLensesGrid.appendChild(card);

    const addBtn = card.querySelector('[data-add-id]');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const qtyInput = card.querySelector('.qty-input');
        const qty = Math.max(1, parseInt(qtyInput?.value || '1', 10));
        addToCart(item.id, qty);
      });
    }
  });
}

// --- Cart helpers ---
function loadCart() {
  try { const raw = localStorage.getItem(STORAGE_CART); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
}

function saveCart(cart) { localStorage.setItem(STORAGE_CART, JSON.stringify(cart)); }

function getCartCount() { return loadCart().reduce((s, it) => s + (it.qty || 0), 0); }

function addToCart(itemId, qty = 1) {
  if (!isCustomerLoggedIn()) {
    // prompt customer to login/register
    const btn = document.getElementById('account-button');
    if (btn) btn.click();
    alert('Please log in or register to add items to cart.');
    return;
  }
  const item = catalogItems.find(i => i.id === itemId);
  if (!item) return;
  const cart = loadCart();
  const existing = cart.find(c => c.id === itemId);
  if (existing) existing.qty += qty; else cart.push({ id: itemId, qty });
  saveCart(cart);
  updateCartButton();
  alert('Added to cart');
}

function updateCartButton() {
  const btn = document.getElementById('floating-cart-button');
  const count = getCartCount();
  if (btn) {
    btn.textContent = `Cart (${count})`;
  }
  if (cartNavLink) {
    cartNavLink.style.display = isCustomerLoggedIn() ? 'inline-flex' : 'none';
    cartNavLink.textContent = isCustomerLoggedIn() ? `Cart (${count})` : 'Cart';
  }
}

function createAccountModal() {
  if (document.getElementById('account-modal')) return;
  const div = document.createElement('div');
  div.id = 'account-modal';
  div.className = 'modal hidden';
  div.innerHTML = `
    <div class="modal-content">
      <button type="button" class="modal-close" aria-label="Close account dialog">×</button>
      <h3 id="account-modal-title">Account access</h3>
      <p class="modal-subtitle">Log in or register to start shopping, manage your cart, and book appointments.</p>
      <div id="account-forms">
        <form id="customer-login-form" class="account-card">
          <h4>Log in</h4>
          <div class="input-group"><label for="cust-login-email">Email</label><input id="cust-login-email" type="email" required /></div>
          <div class="input-group password-toggle-wrapper"><label for="cust-login-password">Password</label><input id="cust-login-password" type="password" required /><button type="button" id="toggle-login-password" class="password-toggle">Show</button></div>
          <div class="form-actions"><button class="button" type="submit">Log in</button><button type="button" id="switch-to-register" class="button-secondary">Register</button></div>
          <p id="customer-login-msg" style="display:none;color:#c53030;margin:0;font-weight:600;"></p>
        </form>
        <form id="customer-register-form" class="account-card" style="display:none">
          <h4>Create account</h4>
          <div class="input-group"><label for="cust-name">Full name</label><input id="cust-name" type="text" required /></div>
          <div class="input-group"><label for="cust-email">Email</label><input id="cust-email" type="email" required /></div>
          <div class="input-group"><label for="cust-phone">Phone</label><input id="cust-phone" type="text" /></div>
          <div class="input-group password-toggle-wrapper"><label for="cust-password">Password</label><input id="cust-password" type="password" required /><button type="button" id="toggle-register-password" class="password-toggle">Show</button></div>
          <div class="form-actions"><button class="button" type="submit">Register</button><button type="button" id="switch-to-login" class="button-secondary">Back to log in</button></div>
          <p id="customer-register-msg" style="display:none;color:#0f4c81;margin:0;font-weight:600;"></p>
        </form>
      </div>
      <div id="account-info" class="account-card" style="display:none">
        <h4>Signed in</h4>
        <div id="account-user"></div>
        <div class="form-actions"><button id="customer-logout" class="button-secondary">Logout</button><button id="close-account-modal" class="button">Close</button></div>
      </div>
    </div>
  `;
  document.body.appendChild(div);

  // wiring
  const loginForm = document.getElementById('customer-login-form');
  const regForm = document.getElementById('customer-register-form');
  const switchToReg = document.getElementById('switch-to-register');
  const switchToLogin = document.getElementById('switch-to-login');
  const accountInfo = document.getElementById('account-info');
  const accountForms = document.getElementById('account-forms');
  const closeBtn = document.getElementById('close-account-modal');
  const modalClose = document.querySelector('#account-modal .modal-close');
  const logoutBtn = document.getElementById('customer-logout');

  switchToReg.addEventListener('click', () => { loginForm.style.display = 'none'; regForm.style.display = 'block'; });
  switchToLogin.addEventListener('click', () => { regForm.style.display = 'none'; loginForm.style.display = 'block'; });
  closeBtn.addEventListener('click', closeAccountModal);
  modalClose?.addEventListener('click', closeAccountModal);
  logoutBtn.addEventListener('click', () => { logoutCustomer(); updateAccountDisplay(); closeAccountModal(); });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('cust-login-email').value.trim();
    const pwd = document.getElementById('cust-login-password').value;

    if (isValidAdminCredentials(email, pwd)) {
      setAdminLoggedIn(true);
      updateNavLinks();
      closeAccountModal();
      window.location.replace('admin.html');
      return;
    }

    const res = loginCustomer(email, pwd);
    if (!res.ok) {
      document.getElementById('customer-login-msg').textContent = 'Invalid credentials';
      document.getElementById('customer-login-msg').style.display = 'block';
      return;
    }
    document.getElementById('customer-login-msg').style.display = 'none';
    updateAccountDisplay();
    closeAccountModal();
  });

  regForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cust-name').value.trim();
    const email = document.getElementById('cust-email').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const pwd = document.getElementById('cust-password').value;
    const res = registerCustomer(name, email, pwd, phone);
    if (!res.ok) { document.getElementById('customer-register-msg').textContent = res.message; document.getElementById('customer-register-msg').style.display = 'block'; return; }
    document.getElementById('customer-register-msg').textContent = 'Account created'; document.getElementById('customer-register-msg').style.display = 'block';
    updateAccountDisplay();
    setTimeout(() => closeAccountModal(), 900);
  });

  const toggleLoginPassword = document.getElementById('toggle-login-password');
  const toggleRegisterPassword = document.getElementById('toggle-register-password');

  toggleLoginPassword?.addEventListener('click', () => {
    const input = document.getElementById('cust-login-password');
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    toggleLoginPassword.textContent = isPassword ? 'Hide' : 'Show';
  });

  toggleRegisterPassword?.addEventListener('click', () => {
    const input = document.getElementById('cust-password');
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    toggleRegisterPassword.textContent = isPassword ? 'Hide' : 'Show';
  });
}

function handleAccountButtonClick(event) {
  event.preventDefault();
  event.stopPropagation();
  if (!document.getElementById('account-modal')) {
    createAccountModal();
  }
  updateAccountDisplay();
  openAccountModal();
}

function bindAccountButtons() {
  document.querySelectorAll('#account-button').forEach((button) => {
    button.removeEventListener('click', handleAccountButtonClick);
    button.addEventListener('click', handleAccountButtonClick);
  });
}

function openAccountModal() { const m = document.getElementById('account-modal'); if (!m) return; m.classList.remove('hidden'); m.setAttribute('aria-hidden', 'false'); }
function closeAccountModal() { const m = document.getElementById('account-modal'); if (!m) return; m.classList.add('hidden'); m.setAttribute('aria-hidden', 'true'); }

function updateAccountDisplay() {
  const btns = document.querySelectorAll('#account-button');
  const user = getCurrentCustomer();
  btns.forEach(b => {
    b.innerHTML = '<span class="account-icon">👤</span>';
    b.title = user ? `Signed in as ${user.name || user.email}` : 'Account';
  });
  const accountInfo = document.getElementById('account-info');
  const accountForms = document.getElementById('account-forms');
  if (accountInfo && accountForms) {
    if (user) {
      accountForms.style.display = 'none';
      accountInfo.style.display = 'block';
      document.getElementById('account-user').textContent = `${user.name || ''} (${user.email})`;
    } else {
      accountForms.style.display = 'grid';
      accountInfo.style.display = 'none';
    }
  }
  updateNavLinks();
}

async function backendDeleteItem(itemId) {
  const cfg = getBackendConfig();
  const headers = {};
  const auth = getBackendAuthToken();
  if (auth) headers['Authorization'] = `Bearer ${auth}`;
  else if (cfg.token) headers['x-admin-token'] = cfg.token;
  const res = await fetch(cfg.url.replace(/\/$/, '') + `/api/catalog/${encodeURIComponent(itemId)}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error('Backend delete failed');
  return await res.json();
}

async function backendReplaceCatalog(items) {
  const cfg = getBackendConfig();
  const headers = { 'Content-Type': 'application/json' };
  const auth = getBackendAuthToken();
  if (auth) headers['Authorization'] = `Bearer ${auth}`;
  else if (cfg.token) headers['x-admin-token'] = cfg.token;
  const res = await fetch(cfg.url.replace(/\/$/, '') + '/api/catalog/replace', { method: 'POST', headers, body: JSON.stringify(items) });
  if (!res.ok) throw new Error('Backend replace failed');
  return await res.json();
}

async function deleteCatalogItem(itemId, itemTitle) {
  const confirmation = confirm(`Delete "${itemTitle}" from the catalog? This action cannot be undone.`);
  if (!confirmation) return;

  const backendCfg = getBackendConfig();
  const updatedCatalog = catalogItems.filter((product) => product.id !== itemId);
  updateCatalogItems(updatedCatalog);
  markPendingCatalogChanges();
  renderCatalog();
  renderAdminItemList();
  createToast(`Removed “${itemTitle}” from the catalog. Click Save changes to persist.`, { type: 'success' });
}

function renderAdminItemList() {
  if (!adminItemList) return;
  adminItemList.innerHTML = '';

  catalogItems.forEach((item) => {
    const entry = document.createElement('div');
    entry.className = 'admin-item-entry';
    entry.innerHTML = `
      <div class="admin-item-header">
        <div>
          <strong>${item.title}</strong>
          <p style="margin:0.35rem 0 0; color: var(--muted);">${item.category}</p>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center">
          <button class="button" type="button" data-edit-id="${item.id}">Edit</button>
          <button class="button danger-button" type="button" data-delete-id="${item.id}">Delete</button>
        </div>
      </div>
      <p style="margin:0.75rem 0 0; color: var(--text);">${item.description}</p>
      ${item.image ? `<img class="card-image" loading="lazy" src="${item.image}" alt="${item.title}" />` : ''}
    `;
    adminItemList.appendChild(entry);

    const deleteButton = entry.querySelector('[data-delete-id]');
    if (deleteButton) {
      deleteButton.addEventListener('click', async () => deleteCatalogItem(item.id, item.title));
    }
    const editButton = entry.querySelector('[data-edit-id]');
    if (editButton) {
      editButton.addEventListener('click', () => startEditItem(item.id));
    }
  });
}

function startEditItem(itemId) {
  const item = (catalogItems || []).find(i => i.id === itemId);
  if (!item) return;
  // populate add form for editing
  const editIdField = document.getElementById('admin-edit-id');
  const categoryField = document.getElementById('admin-item-category');
  const titleField = document.getElementById('admin-item-title');
  const descField = document.getElementById('admin-item-description');
  const priceField = document.getElementById('admin-item-price');
  const imagePreview = document.getElementById('admin-item-image-preview');
  if (editIdField) editIdField.value = item.id;
  if (categoryField) categoryField.value = item.category || 'frames';
  if (titleField) titleField.value = item.title || '';
  if (descField) descField.value = item.description || '';
  if (priceField) priceField.value = item.price || 0;
  if (imagePreview && item.image) {
    imagePreview.src = item.image;
    imagePreview.style.display = 'block';
  }
  // scroll to form
  const form = document.getElementById('admin-add-item-form');
  if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // change button text to indicate update
  const submitBtn = form?.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Save changes';
  if (adminItemSaveButton) adminItemSaveButton.style.display = 'inline-flex';
}

function showAdminDashboard() {
  if (adminLoginCard) adminLoginCard.style.display = 'none';
  if (adminDashboard) adminDashboard.classList.remove('hidden');
}

function hideAdminDashboard() {
  if (adminLoginCard) adminLoginCard.style.display = 'block';
  if (adminDashboard) adminDashboard.classList.add('hidden');
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getResetBackendUrl() {
  const cfg = getBackendConfig();
  return cfg.url ? cfg.url.replace(/\/$/, '') : BACKEND_DEFAULT_URL;
}

function setAdminFeedback(element, message, isError) {
  if (!element) return;
  element.textContent = message || '';
  element.style.display = message ? 'block' : 'none';
  element.style.color = isError ? '#c53030' : '#0f4c81';
}

function showAdminForgotPasswordSection(show) {
  const section = document.getElementById('admin-forgot-section');
  if (!section) return;
  section.classList.toggle('hidden', !show);
}

function showAdminResetSection(token) {
  const section = document.getElementById('admin-reset-section');
  if (!section) return;
  if (token && adminResetTokenInput) adminResetTokenInput.value = token;
  section.classList.remove('hidden');
  showAdminForgotPasswordSection(false);
  if (adminLoginCard) adminLoginCard.style.display = 'none';
}

async function handleAdminForgotPassword(event) {
  event.preventDefault();
  if (!adminForgotEmail) return;
  const email = adminForgotEmail.value.trim();
  if (!email) {
    setAdminFeedback(adminForgotError, 'Please enter the admin email.', true);
    setAdminFeedback(adminForgotMessage, '', false);
    return;
  }

  const backendUrl = getResetBackendUrl();
  try {
    const res = await fetch(`${backendUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to request password reset');
    }
    const msg = data.emailSent
      ? 'Reset email sent. Check your inbox and follow the link.'
      : `Reset link ready. Open this URL: ${data.resetUrl}`;
    setAdminFeedback(adminForgotMessage, msg, false);
    setAdminFeedback(adminForgotError, '', false);
  } catch (err) {
    console.warn('Forgot password failed', err);
    setAdminFeedback(adminForgotError, err.message || 'Failed to request reset link.', true);
    setAdminFeedback(adminForgotMessage, '', false);
  }
}

async function handleAdminResetPassword(event) {
  event.preventDefault();
  if (!adminResetPassword || !adminResetConfirm || !adminResetTokenInput) return;

  const password = adminResetPassword.value;
  const confirm = adminResetConfirm.value;
  const token = adminResetTokenInput.value || getQueryParam('resetToken');

  if (!password || !confirm) {
    setAdminFeedback(adminResetError, 'Please enter and confirm your new password.', true);
    setAdminFeedback(adminResetMessage, '', false);
    return;
  }
  if (password !== confirm) {
    setAdminFeedback(adminResetError, 'Passwords do not match.', true);
    setAdminFeedback(adminResetMessage, '', false);
    return;
  }
  if (!token) {
    setAdminFeedback(adminResetError, 'Reset token is missing. Use the link from your email.', true);
    setAdminFeedback(adminResetMessage, '', false);
    return;
  }

  const backendUrl = getResetBackendUrl();
  try {
    const res = await fetch(`${backendUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to reset password');
    }
    setAdminFeedback(adminResetMessage, 'Password has been reset. Return to login.', false);
    setAdminFeedback(adminResetError, '', false);
    if (adminResetForm) adminResetForm.reset();
  } catch (err) {
    console.warn('Reset password failed', err);
    setAdminFeedback(adminResetError, err.message || 'Failed to reset password.', true);
    setAdminFeedback(adminResetMessage, '', false);
  }
}

async function handleAdminLogin(event) {
  event.preventDefault();
  if (!adminLoginForm) return;

  const email = adminLoginForm.querySelector('#admin-email')?.value.trim() || '';
  const password = adminLoginForm.querySelector('#admin-password')?.value || '';
  let loginError = 'Login failed. Check email and password.';

  if (!email || !password) {
    loginError = 'Please enter both admin email and password.';
    if (adminLoginError) {
      adminLoginError.textContent = loginError;
      adminLoginError.style.display = 'block';
    }
    return;
  }

  const normalizedEmail = email.replace(',', '@').toLowerCase();
  const validEmail = normalizedEmail === ADMIN_EMAIL.toLowerCase() || normalizedEmail === ADMIN_EMAIL_ALT.replace(',', '@').toLowerCase();
  const validPassword = password === ADMIN_PASSWORD;

  // Try the built-in admin account first so the normal form login works reliably.
  if (validEmail && validPassword) {
    if (adminLoginError) adminLoginError.style.display = 'none';
    setAdminLoggedIn(true);
    updateWhatsAppDisplay();
    renderAdminItemList();
    updateNavLinks();
    if (currentPage.toLowerCase() === 'admin.html') {
      window.location.replace('admin-dashboard.html');
    } else {
      showAdminDashboard();
    }
    return;
  }

  // If backend is configured and enabled, try backend auth as a fallback.
  const backendCfg = getBackendConfig();
  if (backendCfg.enabled && backendCfg.url) {
    try {
      await backendLogin(email, password);
      if (adminLoginError) adminLoginError.style.display = 'none';
      setAdminLoggedIn(true);
      updateWhatsAppDisplay();
      renderAdminItemList();
      updateNavLinks();
      if (currentPage.toLowerCase() === 'admin.html') {
        window.location.replace('admin-dashboard.html');
      } else {
        showAdminDashboard();
      }
      return;
    } catch (e) {
      console.warn('Backend login failed', e);
      const errMsg = (e && e.message) ? e.message : '';
      if (errMsg.includes('Backend not configured')) {
        loginError = 'Backend is not configured correctly. Check the backend URL and enable backend sync.';
      } else if (/unauthorized|401|invalid/i.test(errMsg)) {
        loginError = 'Backend credentials are incorrect. Use the correct admin email and password.';
      } else if (/failed|network|fetch/i.test(errMsg)) {
        loginError = 'Backend login failed due to network or server connection issues.';
      } else {
        loginError = 'Backend login failed. Check the backend settings and try again.';
      }
    }
  }

  if (validEmail && validPassword) {
    if (adminLoginError) adminLoginError.style.display = 'none';
    setAdminLoggedIn(true);
    updateWhatsAppDisplay();
    renderAdminItemList();
    updateNavLinks();
    if (currentPage.toLowerCase() === 'admin.html') {
      window.location.replace('admin-dashboard.html');
    } else {
      showAdminDashboard();
    }
  } else if (adminLoginError) {
    if (!validEmail && !validPassword) {
      loginError = 'Admin email and password do not match our records.';
    } else if (!validEmail) {
      loginError = 'Admin email not recognized. Please verify the admin email.';
    } else if (!validPassword) {
      loginError = 'Incorrect password. Please try again.';
    }
    adminLoginError.textContent = loginError;
    adminLoginError.style.display = 'block';
  }
}

async function handleAdminSettings(event) {
  event.preventDefault();
  if (!adminWhatsappInput) return;
  const number = normalizeWhatsApp(adminWhatsappInput.value) || DEFAULT_WHATSAPP;
  saveWhatsAppNumber(number);
  updateWhatsAppDisplay();
  // save firebase config and cloud sync flag if provided
  const firebaseTextarea = document.getElementById('firebase-config');
  const cloudCheckbox = document.getElementById('admin-cloud-sync-enable');
  const supabaseTextarea = document.getElementById('supabase-config');
  const supabaseCheckbox = document.getElementById('admin-supabase-sync-enable');
  if (firebaseTextarea) {
    const raw = firebaseTextarea.value.trim();
    if (raw) saveFirebaseConfig(raw);
  }
  if (cloudCheckbox) {
    setCloudSyncEnabled(!!cloudCheckbox.checked);
  }
  if (supabaseTextarea) {
    const raw = supabaseTextarea.value.trim();
    if (raw) saveSupabaseConfig(raw);
  }
  if (supabaseCheckbox) {
    setSupabaseSyncEnabled(!!supabaseCheckbox.checked);
  }
  initFirebaseIfConfigured().then(ok => {
    const status = document.getElementById('cloud-status');
    if (status) status.textContent = ok ? 'Cloud: configured' : 'Cloud: not configured';
    // start or stop listener based on checkbox
    if (ok && isCloudSyncEnabled()) startCloudListener(); else stopCloudListener();
  });
  if (isSupabaseSyncEnabled()) {
    const ok = await initSupabaseIfConfigured();
    const status = document.getElementById('supabase-status');
    if (status) status.textContent = ok ? 'Supabase: configured' : 'Supabase: not configured';
    if (ok) startSupabasePoller(); else stopSupabasePoller();
  } else {
    stopSupabasePoller();
  }
  // save backend config
  const backendUrlInput = document.getElementById('backend-api-url');
  const backendTokenInput = document.getElementById('backend-admin-token');
  const backendCheckbox = document.getElementById('backend-sync-enable');
  if (backendUrlInput) localStorage.setItem(STORAGE_BACKEND_URL, backendUrlInput.value.trim());
  if (backendTokenInput) localStorage.setItem(STORAGE_BACKEND_TOKEN, backendTokenInput.value.trim());
  if (backendCheckbox) localStorage.setItem(STORAGE_BACKEND_ENABLED, backendCheckbox.checked ? '1' : '0');
  // start or stop backend sync
  if (getBackendConfig().enabled) {
    startBackendRealtime();
    await loadCatalogFromBackendIfConfigured();
  } else stopBackendPoller();
  if (adminSettingsMessage) {
    adminSettingsMessage.style.display = 'block';
    setTimeout(() => {
      adminSettingsMessage.style.display = 'none';
    }, 2500);
  }
}

function updateAdminRemoveCategoryPreview() {
  const category = adminRemoveCategorySelect?.value;
  if (!category || !adminRemoveCategoryPreview) return;
  const matching = catalogItems.filter(item => item.category === category);
  if (!matching.length) {
    adminRemoveCategoryPreview.innerHTML = '<p style="margin:0; color:var(--muted);">No items found in this category.</p>';
    return;
  }
  adminRemoveCategoryPreview.innerHTML = matching.map(item => `
    <div style="padding:0.75rem; border-radius:12px; background:white; border:1px solid rgba(15,76,129,0.08);">
      <strong>${item.title}</strong>
      <p style="margin:0.35rem 0 0; color:var(--muted);">${item.description}</p>
    </div>
  `).join('');
}

function handleAdminRemoveCategory(event) {
  event.preventDefault();
  if (!adminRemoveCategoryForm) return;
  const category = adminRemoveCategoryForm.querySelector('#admin-remove-category')?.value;
  if (!category) return;
  const matching = catalogItems.filter(item => item.category === category);
  if (!matching.length) {
    createToast(`No items found in ${category}.`, { type: 'warning' });
    return;
  }
  const confirmed = confirm(`Remove all ${category} items from the catalog? This cannot be undone.`);
  if (!confirmed) return;
  const updated = catalogItems.filter(item => item.category !== category);
  updateCatalogItems(updated);
  renderCatalog();
  renderAdminItemList();
  updateAdminRemoveCategoryPreview();
  markPendingCatalogChanges();
  createToast(`Removed ${matching.length} ${category} item${matching.length === 1 ? '' : 's'}. Click Save changes to persist.`, { type: 'success' });
}

async function handleAdminAddItem(event) {
  event.preventDefault();
  if (!adminAddItemForm) return;

  const category = adminAddItemForm.querySelector('#admin-item-category')?.value;
  const fileInput = adminAddItemForm.querySelector('#admin-item-image');
  const title = adminAddItemForm.querySelector('#admin-item-title')?.value.trim();
  const description = adminAddItemForm.querySelector('#admin-item-description')?.value.trim();
  const price = parseFloat(adminAddItemForm.querySelector('#admin-item-price')?.value || '0') || 0;

  if (!category || !title || !description) return;
  const file = fileInput?.files && fileInput.files[0];
  if (!file) return;

  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const item = {
    id: `${category}-${Date.now()}`,
    category,
    title,
    description,
    image: dataUrl,
    price,
  };

  // If editing an existing item, update instead of creating new
  const editIdField = document.getElementById('admin-edit-id');
  const isEdit = editIdField && editIdField.value;
  if (isEdit) {
    const existingId = editIdField.value;
    const updated = (catalogItems || []).map(it => {
      if (it.id === existingId) {
        return { ...it, category, title, description, price, image: dataUrl };
      }
      return it;
    });

    updateCatalogItems(updated);
    markPendingCatalogChanges();

    // reset edit state
    if (editIdField) editIdField.value = '';
    const submitBtn = adminAddItemForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Add item';

    renderCatalog();
    renderAdminItemList();
    createToast('Item updated. Click Save changes to persist.', { type: 'success' });
    adminAddItemForm.reset();
    if (adminItemImagePreview) { adminItemImagePreview.style.display = 'none'; adminItemImagePreview.src = ''; }
    return;
  }

  updateCatalogItems([...(catalogItems || []), item]);
  markPendingCatalogChanges();
  renderCatalog();
  renderAdminItemList();
  createToast('Item added. Click Save changes to persist.', { type: 'success' });

  if (adminAddMessage) {
    adminAddMessage.style.display = 'block';
    setTimeout(() => {
      adminAddMessage.style.display = 'none';
    }, 2500);
  }

  if (adminItemImagePreview) {
    adminItemImagePreview.style.display = 'none';
    adminItemImagePreview.src = '';
  }

  adminAddItemForm.reset();

    `Phone: ${phonePrefix} ${phone}\n` +
    `Service: ${service}\n` +
    `Preferred date: ${date}\n` +
    `Preferred time: ${timeSlot}\n` +
    `Notes: ${message || 'N/A'}`
  );
  const whatsappUrl = `https://wa.me/${number.replace('+', '')}?text=${text}`;

  if (formMessage) {
    formMessage.textContent = 'Your appointment request is being sent to WhatsApp.';
    formMessage.style.display = 'block';
  }

  window.open(whatsappUrl, '_blank');
  appointmentForm.reset();
}

async function initialize() {
  createAccountModal();
  updateAccountDisplay();
  updateWhatsAppDisplay();
  await initializeCatalog();
  await loadCatalogFromBackendIfConfigured();
  updateCartButton();
  bindAccountButtons();

  serviceButtons.forEach((button) => {
    button.addEventListener('click', () => {
      serviceButtons.forEach((btn) => btn.classList.remove('active'));
      servicePanels.forEach((panel) => panel.classList.remove('active'));

      button.classList.add('active');
      const target = document.getElementById(button.dataset.target);
      if (target) {
        target.classList.add('active');
      }
    });
  });

  if (appointmentForm) {
    appointmentForm.addEventListener('submit', handleAppointmentSubmit);
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', handleAdminLogin);
  }

  if (adminForgotLink) {
    adminForgotLink.addEventListener('click', () => {
      if (adminLoginCard) adminLoginCard.style.display = 'block';
      showAdminForgotPasswordSection(true);
      if (document.getElementById('admin-reset-section')) {
        document.getElementById('admin-reset-section').classList.add('hidden');
      }
      setAdminFeedback(adminForgotMessage, '', false);
      setAdminFeedback(adminForgotError, '', false);
    });
  }

  if (adminForgotForm) {
    adminForgotForm.addEventListener('submit', handleAdminForgotPassword);
  }

  if (adminResetForm) {
    adminResetForm.addEventListener('submit', handleAdminResetPassword);
  }

  if (adminSettingsForm) {
    adminSettingsForm.addEventListener('submit', handleAdminSettings);
  }

  if (adminRemoveCategoryForm) {
    adminRemoveCategoryForm.addEventListener('submit', handleAdminRemoveCategory);
  }

  if (adminRemoveCategorySelect) {
    adminRemoveCategorySelect.addEventListener('change', updateAdminRemoveCategoryPreview);
    updateAdminRemoveCategoryPreview();
  }

  if (adminAddItemForm) {
    adminAddItemForm.addEventListener('submit', handleAdminAddItem);
    if (adminItemSaveButton) {
      adminItemSaveButton.style.display = 'none';
      adminItemSaveButton.addEventListener('click', savePendingCatalogChanges);
    }
    const fileInput = adminAddItemForm.querySelector('#admin-item-image');
    if (adminItemUploadButton && fileInput) {
      adminItemUploadButton.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        if (!fileInput.files || !fileInput.files[0]) {
          adminItemImagePreview.style.display = 'none';
          adminItemImagePreview.src = '';
          return;
        }
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = () => {
          adminItemImagePreview.src = reader.result;
          adminItemImagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      });
    }
  }

  if (adminLogoutButton) {
    adminLogoutButton.addEventListener('click', () => {
      setAdminLoggedIn(false);
      hideAdminDashboard();
      // clear backend JWT and stop realtime/poller
      setBackendAuthToken('');
      stopBackendRealtime();
      stopBackendSSE();
      stopBackendPoller();
      updateNavLinks();
    });
  }

  // Cloud sync controls
  const firebaseTextarea = document.getElementById('firebase-config');
  const cloudCheckbox = document.getElementById('admin-cloud-sync-enable');
  const cloudSyncBtn = document.getElementById('cloud-sync-now');
  const cloudLoadBtn = document.getElementById('cloud-load-now');
  const cloudStatus = document.getElementById('cloud-status');
  const supabaseTextarea = document.getElementById('supabase-config');
  const supabaseCheckbox = document.getElementById('admin-supabase-sync-enable');
  const supabaseSyncBtn = document.getElementById('supabase-sync-now');
  const supabaseLoadBtn = document.getElementById('supabase-load-now');
  const supabaseStatus = document.getElementById('supabase-status');
  if (firebaseTextarea) firebaseTextarea.value = getFirebaseConfigRaw();
  if (cloudCheckbox) cloudCheckbox.checked = isCloudSyncEnabled();
  if (cloudStatus) cloudStatus.textContent = (getFirebaseConfigRaw() ? 'Cloud: configured' : 'Cloud: not configured');
  if (supabaseTextarea) supabaseTextarea.value = getSupabaseConfigRaw();
  if (supabaseCheckbox) supabaseCheckbox.checked = isSupabaseSyncEnabled();
  if (supabaseStatus) supabaseStatus.textContent = (getSupabaseConfigRaw() ? 'Supabase: configured' : 'Supabase: not configured');
  // backend UI
  const backendUrlInput = document.getElementById('backend-api-url');
  const backendTokenInput = document.getElementById('backend-admin-token');
  const backendCheckbox = document.getElementById('backend-sync-enable');
  const backendTestBtn = document.getElementById('backend-test-connection');
  const storedBackendUrl = localStorage.getItem(STORAGE_BACKEND_URL);
  const backendUrl = storedBackendUrl || BACKEND_DEFAULT_URL;
  const backendEnabledStored = localStorage.getItem(STORAGE_BACKEND_ENABLED) === '1';
  const backendEnabled = backendEnabledStored || !!backendUrl;
  if (backendUrlInput) {
    backendUrlInput.value = backendUrl;
    if (!storedBackendUrl) {
      // Auto-fill the deployed backend URL if no custom URL is stored yet.
      backendUrlInput.value = backendUrl;
    }
  }
  if (backendTokenInput) backendTokenInput.value = localStorage.getItem(STORAGE_BACKEND_TOKEN) || '';
  if (backendCheckbox) {
    backendCheckbox.checked = backendEnabled;
    if (backendEnabled && !backendEnabledStored) {
      localStorage.setItem(STORAGE_BACKEND_ENABLED, '1');
    }
  }
  if (backendTestBtn) backendTestBtn.addEventListener('click', async () => { await backendTestConnection(); });
  if (backendCheckbox && backendCheckbox.checked) {
    // try to start poller
    // prefer realtime
    startBackendRealtime();
    backendTestConnection();
  }

  const resetToken = getQueryParam('resetToken');
  if (resetToken) {
    showAdminResetSection(resetToken);
  }
  if (cloudSyncBtn) cloudSyncBtn.addEventListener('click', async () => {
    if (!isCloudSyncEnabled()) {
      createToast('Enable cloud sync in settings first', { type: 'warning' });
      return;
    }
    await syncCatalogToCloud();
  });
  if (cloudLoadBtn) cloudLoadBtn.addEventListener('click', async () => {
    if (!isCloudSyncEnabled()) {
      createToast('Enable cloud sync in settings first', { type: 'warning' });
      return;
    }
    await loadCatalogFromCloud();
  });
  if (supabaseSyncBtn) supabaseSyncBtn.addEventListener('click', async () => {
    if (!isSupabaseSyncEnabled()) {
      createToast('Enable Supabase sync in settings first', { type: 'warning' });
      return;
    }
    try {
      await syncCatalogToSupabase();
      createToast('Catalog synced to Supabase', { type: 'success' });
    } catch (e) {
      createToast('Supabase sync failed', { type: 'error' });
    }
  });
  if (supabaseLoadBtn) supabaseLoadBtn.addEventListener('click', async () => {
    if (!isSupabaseSyncEnabled()) {
      createToast('Enable Supabase sync in settings first', { type: 'warning' });
      return;
    }
    await loadCatalogFromSupabase();
  });
  // ensure listener is running if cloud sync enabled on init
  if (isCloudSyncEnabled()) {
    initFirebaseIfConfigured().then(ok => { if (ok) startCloudListener(); });
  }
  if (isSupabaseSyncEnabled()) {
    initSupabaseIfConfigured().then(ok => { if (ok) startSupabasePoller(); });
  }
  if (getBackendConfig().enabled) {
    startBackendRealtime();
  }
  const cloudTestBtn = document.getElementById('cloud-test-connection');
  if (cloudTestBtn) cloudTestBtn.addEventListener('click', async () => {
    createToast('Testing cloud connection...');
    const ok = await initFirebaseIfConfigured();
    const status = document.getElementById('cloud-status');
    if (!ok) {
      createToast('Firebase init failed — check config', { type: 'error' });
      if (status) status.textContent = 'Cloud: not configured / invalid';
      return;
    }
    try {
      // try to read catalog doc
      const doc = await firebaseFirestore.doc('visionplus/catalog').get();
      createToast('Cloud connection OK' + (doc.exists ? ' (catalog found)' : ''), { type: 'success' });
      if (status) status.textContent = 'Cloud: connected';
    } catch (e) {
      console.error(e);
      createToast('Connected to Firebase but failed to access Firestore (check rules)', { type: 'warning' });
      if (status) status.textContent = 'Cloud: connected (access denied?)';
    }
  });

  // Firebase rules UI wiring
  const rulesToggle = document.getElementById('firebase-rules-toggle');
  const rulesPanel = document.getElementById('firebase-rules-panel');
  const firestoreTa = document.getElementById('firestore-rules');
  const storageTa = document.getElementById('storage-rules');
  const copyFsBtn = document.getElementById('copy-firestore-rules');
  const copyFsTestBtn = document.getElementById('copy-firestore-testing');
  const copyStBtn = document.getElementById('copy-storage-rules');
  const copyStTestBtn = document.getElementById('copy-storage-testing');
  if (firestoreTa) firestoreTa.value = RULES.firestore_secure;
  if (storageTa) storageTa.value = RULES.storage_secure;
  if (rulesToggle && rulesPanel) {
    rulesToggle.addEventListener('click', () => {
      rulesPanel.style.display = rulesPanel.style.display === 'none' ? 'block' : 'none';
    });
  }
  if (copyFsBtn) copyFsBtn.addEventListener('click', () => copyToClipboard(RULES.firestore_secure).then(() => createToast('Firestore rules copied')));
  if (copyFsTestBtn) copyFsTestBtn.addEventListener('click', () => copyToClipboard(RULES.firestore_testing).then(() => createToast('Testing Firestore rules copied')));
  if (copyStBtn) copyStBtn.addEventListener('click', () => copyToClipboard(RULES.storage_secure).then(() => createToast('Storage rules copied')));
  if (copyStTestBtn) copyStTestBtn.addEventListener('click', () => copyToClipboard(RULES.storage_testing).then(() => createToast('Testing Storage rules copied')));

  const pageName = currentPage.toLowerCase();
  if (pageName === 'admin-dashboard.html') {
    if (!isAdminLoggedIn()) {
      window.location.replace('admin.html');
      return;
    }
  } else if (pageName === 'admin.html' && isAdminLoggedIn()) {
    window.location.replace('admin-dashboard.html');
    return;
  }

  if (isAdminLoggedIn()) showAdminDashboard(); else hideAdminDashboard();
  updateNavLinks();
  setActiveNavLink();
  if (cartContents) renderCartPage();
}

function setActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    let normalized = href.split('#')[0].split('?')[0];
    if (!normalized) normalized = 'index.html';
    const active = normalized === currentPage || (currentPage === 'index.html' && href === '#home');
    link.classList.toggle('active', active);
  });
}

initialize();
