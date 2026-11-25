import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {put,del} from '@vercel/blob';
import {
  getProducts,
  getProduct,
  insertProduct,
  updateProduct,
  deleteProduct,
  getSettings,
  saveSettingsToDb,
  getOrders,
  getOrderRefs,
  getOrder,
  insertOrder,
  updateOrder,
} from './db.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, 'data');
const uploadDir = path.join(here, 'uploads');
const dbFile = path.join(dataDir, 'products.json');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

// Read server/.env ourselves so this works on any Node version and any shell.
const envFile = path.join(here, '.env');
let envFound = false;
try {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  envFound = true;
} catch { /* no .env file; fall back to real environment variables */ }

const PASSWORD = process.env.ADMIN_PASSWORD;
if (!PASSWORD || PASSWORD.length < 8) {
  console.error(envFound
    ? 'ADMIN_PASSWORD in server/.env is missing or shorter than 8 characters.'
    : `Could not find ${envFile}. Create a file named exactly ".env" in the server folder (not ".env.txt") containing: ADMIN_PASSWORD=your-password-here`);
  process.exit(1);
}
const SECRET = crypto.createHash('sha256').update(`session:${process.env.SESSION_SECRET ?? PASSWORD}`).digest();
const PORT = Number(process.env.PORT ?? 3001);
const WEEK = 7 * 24 * 60 * 60 * 1000;
const CATEGORIES = ['cylinder', 'accessory', 'other'];
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

/* ---------- storage ---------- */
const load = () => { try { return JSON.parse(fs.readFileSync(dbFile, 'utf8')); } catch { return []; } };
const save = (items) => { const tmp = `${dbFile}.tmp`; fs.writeFileSync(tmp, JSON.stringify(items, null, 2)); fs.renameSync(tmp, dbFile); };
//const dropFile = (name) => fs.unlink(path.join(uploadDir, path.basename(name)), () => {});
const dropFile = async (url) => {
  if (url?.startsWith('https://')) {
    await del(url);
  }
};

//const publicShape = (p) => ({ ...p, images: p.images.map((f) => `/uploads/${f}`) });

const publicShape = (p) => ({
  ...p,
  images: p.images ?? [],
});

const storeUploads = async (files = []) => {
  const uploaded = [];

  try {
    for (const file of files) {
      const blob = await put(
        `products/${crypto.randomUUID()}${EXT[file.mimetype]}`,
        file.buffer,
        {
          access: 'public',
          addRandomSuffix: true,
          contentType: file.mimetype,
        }
      );

      uploaded.push(blob.url);
    }

    return uploaded;
  } catch (error) {
    if (uploaded.length) {
      await del(uploaded);
    }
    throw error;
  }
};
/* ---------- auth: signed, expiring cookie ---------- */
const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('hex');
const safeEq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const makeToken = () => { const exp = String(Date.now() + WEEK); return `${exp}.${sign(exp)}`; };
const validToken = (t) => { if (!t) return false; const [exp, sig] = t.split('.'); return !!exp && !!sig && safeEq(sig, sign(exp)) && Number(exp) > Date.now(); };
const cookieOf = (req, name) => (req.headers.cookie ?? '').split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name}=`))?.slice(name.length + 1);
const requireAdmin = (req, res, next) => (validToken(cookieOf(req, 'admin')) ? next() : res.status(401).json({ error: 'Please sign in again.' }));
const attempts = new Map();

/* ---------- uploads ---------- */
{/*const upload = multer({
  storage: multer.diskStorage({ destination: uploadDir, filename: (_r, f, cb) => cb(null, crypto.randomBytes(12).toString('hex') + EXT[f.mimetype]) }),
  fileFilter: (_r, f, cb) => (EXT[f.mimetype] ? cb(null, true) : cb(new Error('Images must be JPG, PNG or WebP.'))),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});
*/}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_r, f, cb) =>
    EXT[f.mimetype]
      ? cb(null, true)
      : cb(new Error('Images must be JPG, PNG or WebP.')),
  limits: {
    fileSize: 800 * 1024,
    files: 5,
  },
});

function parse(body) {
  const str = (v, max) => String(v ?? '').trim().slice(0, max);
  const num = (v) => { if (v === undefined || v === null || v === '') return null; const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? Math.round(n) : NaN; };
  const p = {
    name: str(body.name, 80), category: str(body.category, 20), brand: str(body.brand, 40), size: str(body.size, 10),
    description: str(body.description, 1000), price: num(body.price), refillPrice: num(body.refillPrice), inStock: body.inStock === 'true',
  };
  if (p.name.length < 2) return { error: 'Enter a product name.' };
  if (!CATEGORIES.includes(p.category)) return { error: 'Choose a category.' };
  if (p.price === null || Number.isNaN(p.price)) return { error: 'Enter a valid price.' };
  if (Number.isNaN(p.refillPrice)) return { error: 'Enter a valid refill price.' };
  if (p.category !== 'cylinder') { p.refillPrice = null; p.size = ''; }
  return { product: p };
}

/* ---------- site settings (business, branches, prices) ---------- */
const settingsFile = path.join(dataDir, 'settings.json');
const loadSettings = () => { try { return JSON.parse(fs.readFileSync(settingsFile, 'utf8')); } catch { return null; } };
const saveSettings = (v) => { const tmp = `${settingsFile}.tmp`; fs.writeFileSync(tmp, JSON.stringify(v, null, 2)); fs.renameSync(tmp, settingsFile); };
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const trimTo = (v, max) => String(v ?? '').trim().slice(0, max);
const intIn = (v, min, max) => { const n = Number(v); return v !== '' && v !== null && Number.isInteger(n) && n >= min && n <= max ? n : null; };
const digits = (v) => String(v ?? '').replace(/\D/g, '');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'branch';
const strList = (v, max, len) => (Array.isArray(v) ? v : []).map((x) => trimTo(x, len)).filter(Boolean).slice(0, max);

function parseBranches(items, businessName) {
  if (!Array.isArray(items) || !items.length || items.length > 20) return { error: 'Keep between 1 and 20 branches.' };
  const out = [];
  const used = new Set();
  for (const b of items) {
    const name = trimTo(b?.name, 40);
    if (!name) return { error: 'Every branch needs a name.' };
    const phone = trimTo(b.phone, 20);
    const wa = digits(b.whatsapp);
    if (digits(phone).length < 9) return { error: `${name}: enter a valid phone number.` };
    if (wa.length < 9 || wa.length > 15) return { error: `${name}: enter a WhatsApp number with country code, for example 254712345678.` };
    const hours = {};
    for (const k of ['weekday', 'sat', 'sun']) {
      const h = b.hours?.[k];
      if (!Array.isArray(h) || !TIME.test(h[0]) || !TIME.test(h[1]) || h[0] >= h[1]) return { error: `${name}: check the opening hours. Opening time must be before closing time.` };
      hours[k] = [h[0], h[1]];
    }
    const fee = intIn(b.delivery?.fee, 0, 100000);
    if (fee === null) return { error: `${name}: enter a valid delivery fee.` };
    let id = /^[a-z0-9-]{1,40}$/.test(b.id ?? '') && !used.has(b.id) ? b.id : slug(name);
    for (let n = 2; used.has(id); n++) id = `${slug(name)}-${n}`;
    used.add(id);
    out.push({
      id, name, phone, whatsapp: wa, query: trimTo(b.query, 100) || `${businessName} ${name}`, hours,
      delivery: { areas: strList(b.delivery?.areas, 20, 40), fee, time: trimTo(b.delivery?.time, 40), cutoff: trimTo(b.delivery?.cutoff, 20) },
    });
  }
  return { branches: out };
}

function parseSettings(b) {
  if (!b || typeof b !== 'object') return { error: 'Invalid settings.' };
  const bi = b.business ?? {};
  const business = {
    name: trimTo(bi.name, 60), pitch: trimTo(bi.pitch, 120), announcement: trimTo(bi.announcement, 120),
    phone: trimTo(bi.phone, 20), whatsapp: digits(bi.whatsapp), email: trimTo(bi.email, 80),
    founded: intIn(bi.founded, 1900, new Date().getFullYear()),
    socials: (Array.isArray(bi.socials) ? bi.socials : []).slice(0, 6).map((s) => ({ label: trimTo(s?.label, 20), href: trimTo(s?.href, 200) })).filter((s) => s.label || s.href),
  };
  if (!business.name) return { error: 'Enter the business name.' };
  if (digits(business.phone).length < 9) return { error: 'Enter a valid main phone number.' };
  if (business.whatsapp.length < 9 || business.whatsapp.length > 15) return { error: 'Enter the main WhatsApp number with country code, for example 254712345678.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(business.email)) return { error: 'Enter a valid email address.' };
  if (business.founded === null) return { error: 'Enter the year the business started.' };
  if (business.socials.some((s) => !s.label || !/^https?:\/\//i.test(s.href))) return { error: 'Each social link needs a name and a full address starting with https://' };

  const sizes = [];
  for (const s of Array.isArray(b.sizes) ? b.sizes.slice(0, 12) : []) {
    const kg = trimTo(s?.kg, 8);
    const refill = intIn(s?.refill, 0, 1_000_000);
    const fresh = intIn(s?.fresh, 0, 1_000_000);
    if (!/^\d+(\.\d+)?$/.test(kg) || refill === null || fresh === null) return { error: 'Each size needs a weight in kg and valid prices.' };
    if (sizes.some((x) => x.kg === kg)) return { error: `${kg} kg is listed twice.` };
    sizes.push({ kg, refill, fresh, use: trimTo(s.use, 100) });
  }
  if (!sizes.length) return { error: 'Keep at least one cylinder size.' };

  const { branches, error } = parseBranches(b.branches, business.name);
  if (error) return { error };
  return { settings: { business, branches, brands: strList(b.brands, 30, 30), sizes } };
}

/* ---------- orders ---------- */
const ordersFile = path.join(dataDir, 'orders.json');
const loadOrders = () => { try { return JSON.parse(fs.readFileSync(ordersFile, 'utf8')); } catch { return []; } };
const saveOrders = (v) => { const tmp = `${ordersFile}.tmp`; fs.writeFileSync(tmp, JSON.stringify(v, null, 2)); fs.renameSync(tmp, ordersFile); };
const STATUSES = ['new', 'confirmed', 'dispatched', 'completed', 'cancelled'];
const REF_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid misreading
const makeRef = (taken) => { for (;;) { let r = 'CG-'; for (let i = 0; i < 5; i++) r += REF_CHARS[crypto.randomInt(REF_CHARS.length)]; if (!taken.has(r)) return r; } };
const phoneKey = (v) => digits(v).slice(-9);
const hits = new Map();
const limited = (key, max, windowMs) => {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { hits.set(key, recent); return true; }
  recent.push(now);
  hits.set(key, recent);
  return false;
};
const csvCell = (v) => { let t = String(v ?? ''); if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`; return `"${t.replace(/"/g, '""')}"`; };

async function parseOrder(b) {
  const name = trimTo(b?.name, 80);
  const phone = trimTo(b?.phone, 20);
  if (name.length < 2) return { error: 'Enter your name.' };
  if (digits(phone).length < 9) return { error: 'Enter a valid phone number.' };
  const mode = b.mode === 'pickup' ? 'pickup' : 'delivery';
  const location = trimTo(b.location, 200);
  if (mode === 'delivery' && !location) return { error: 'Add a delivery location.' };
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 10).map((i) => ({
    size: trimTo(i?.size, 8), kind: i?.kind === 'fresh' ? 'fresh' : 'refill', qty: intIn(i?.qty, 1, 50), brand: trimTo(i?.brand, 30), unitPrice: intIn(i?.unitPrice, 0, 1_000_000),
  }));
  if (!items.length || items.some((i) => !i.size || i.qty === null || i.unitPrice === null)) return { error: 'Check the items in your order.' };
  const branchId = trimTo(b.branchId, 40);
  const saved = await getSettings();
  const known = saved?.branches?.find((x) => x.id === branchId);
  if (saved && !known) return { error: 'Choose a branch.' };
  const deliveryFee = mode === 'delivery' ? (intIn(b.deliveryFee, 0, 100000) ?? 0) : 0;
  return {
    order: {
      name, phone, branchId, branchName: known?.name ?? trimTo(b.branchName, 40), mode, location: mode === 'delivery' ? location : '',
      payment: trimTo(b.payment, 40), note: trimTo(b.note, 300), items, deliveryFee, total: items.reduce((t, i) => t + i.unitPrice * i.qty, 0),
    },
  };
}

/* ---------- app ---------- */
const app = express();
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1)); // trust first proxy by default, for req.ip and rate limiting
app.use(express.json({ limit: '100kb' }));
app.use((_req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); next(); });
//app.use('/uploads', express.static(uploadDir, { maxAge: '7d', index: false }));

//app.get('/api/products', (_req, res) => res.json(load().map(publicShape)));

app.post('/api/admin/login', (req, res) => {
  const now = Date.now();
  const a = attempts.get(req.ip);
  if (a && a.reset > now && a.count >= 5) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  const ok = typeof req.body?.password === 'string' && safeEq(sign(req.body.password), sign(PASSWORD));
  if (!ok) {
    attempts.set(req.ip, a && a.reset > now ? { ...a, count: a.count + 1 } : { count: 1, reset: now + 15 * 60 * 1000 });
    return res.status(401).json({ error: 'That password is not right.' });
  }
  attempts.delete(req.ip);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.set('Set-Cookie', `admin=${makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${WEEK / 1000}${secure}`);
  res.json({ ok: true });
});
app.post('/api/admin/logout', (_req, res) => { res.set('Set-Cookie', 'admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); res.json({ ok: true }); });
app.get('/api/admin/session', requireAdmin, (_req, res) => res.json({ ok: true }));

//const discard = (req) => (req.files ?? []).forEach((f) => dropFile(f.filename));
const discard = (req) => {
  // Memory storage needs no local-file cleanup.
};
{/*app.post('/api/admin/products', requireAdmin, upload.array('images', 5), (req, res) => {
  const { product, error } = parse(req.body);
  if (error) { discard(req); return res.status(400).json({ error }); }
  const item = { id: crypto.randomUUID(), ...product, images: (req.files ?? []).map((f) => f.filename), createdAt: new Date().toISOString() };
  save([item, ...load()]);
  res.status(201).json(publicShape(item));
});

app.put('/api/admin/products/:id', requireAdmin, upload.array('images', 5), (req, res) => {
  const items = load();
  const i = items.findIndex((p) => p.id === req.params.id);
  if (i < 0) { discard(req); return res.status(404).json({ error: 'Product not found.' }); }
  const { product, error } = parse(req.body);
  if (error) { discard(req); return res.status(400).json({ error }); }
  let keep = [];
  try { keep = JSON.parse(req.body.keepImages ?? '[]'); } catch { /* treat as none * 
  keep = items[i].images.filter((f) => keep.includes(f));
  const added = (req.files ?? []).map((f) => f.filename);
  if (keep.length + added.length > 5) { discard(req); return res.status(400).json({ error: 'A product can have at most 5 photos.' }); }
  items[i].images.filter((f) => !keep.includes(f)).forEach(dropFile);
  items[i] = { ...items[i], ...product, images: [...keep, ...added] };
  save(items);
  res.json(publicShape(items[i]));
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const items = load();
  const found = items.find((p) => p.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'Product not found.' });
  found.images.forEach(dropFile);
  save(items.filter((p) => p.id !== found.id));
  res.json({ ok: true });
});
*/}


app.get('/api/products', async (_req, res) => {
  const products = await getProducts();
  res.json(products.map(publicShape));
});


app.post('/api/admin/products', requireAdmin, upload.array('images', 5), async (req, res) => {
  const { product, error } = parse(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  let images = [];

  try {
    images = await storeUploads(req.files);

    const item = {
      id: crypto.randomUUID(),
      ...product,
      images,
      createdAt: new Date().toISOString(),
    };

    await insertProduct(item);

    res.status(201).json(publicShape(item));
  } catch (err) {
    if (images.length) await del(images);
    throw err;
  }
});



app.put('/api/admin/products/:id', requireAdmin, upload.array('images', 5), async (req, res) => {
  const existing = await getProduct(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const { product, error } = parse(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  let keep = [];

  try {
    keep = JSON.parse(req.body.keepImages ?? '[]');
  } catch {
    keep = [];
  }

  keep = (existing.images ?? []).filter((url) => keep.includes(url));

  if (keep.length + (req.files ?? []).length > 5) {
    return res.status(400).json({
      error: 'A product can have at most 5 photos.'
    });
  }

  let added = [];

  try {
    added = await storeUploads(req.files);

    const updated = {
      ...existing,
      ...product,
      images: [...keep, ...added],
    };

    await updateProduct(updated);

    const removed = (existing.images ?? []).filter(
      (url) => !keep.includes(url)
    );

    await Promise.all(removed.map(dropFile));

    res.json(publicShape(updated));
  } catch (err) {
    if (added.length) await del(added);
    throw err;
  }
});



app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const existing = await getProduct(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  await deleteProduct(req.params.id);

  await Promise.all(
    (existing.images ?? []).map(dropFile)
  );

  res.json({ ok: true });
});



{/*app.get('/api/settings', (_req, res) => res.json(loadSettings()));
app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const { settings, error } = parseSettings(req.body);
  if (error) return res.status(400).json({ error });
  saveSettings(settings);
  res.json(settings);
});
*/}

app.get('/api/settings', async (_req, res) => {
  const settings = await getSettings();
  res.json(settings ?? loadSettings());
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  const { settings, error } = parseSettings(req.body);

  if (error) return res.status(400).json({ error });

  await saveSettingsToDb(settings);
  res.json(settings);
});

{/*app.post('/api/orders', (req, res) => {
  if (limited(`order:${req.ip}`, 10, 60 * 60 * 1000)) return res.status(429).json({ error: 'Too many orders from this connection. Please call the branch.' });
  const { order, error } = parseOrder(req.body);
  if (error) return res.status(400).json({ error });
  const orders = loadOrders();
  const now = new Date().toISOString();
  const record = { ref: makeRef(new Set(orders.map((o) => o.ref))), createdAt: now, status: 'new', ...order, history: [{ status: 'new', at: now }] };
  saveOrders([record, ...orders]);
  res.status(201).json({ ref: record.ref });
});

app.get('/api/orders/track', (req, res) => {
  if (limited(`track:${req.ip}`, 20, 15 * 60 * 1000)) return res.status(429).json({ error: 'Too many lookups. Try again in a few minutes.' });
  const ref = trimTo(req.query.ref, 20).toUpperCase();
  const o = loadOrders().find((x) => x.ref === ref);
  if (!o || phoneKey(o.phone) !== phoneKey(req.query.phone)) return res.status(404).json({ error: 'No order found with those details. Check the reference and the phone number you ordered with.' });
  const { ref: r, status, mode, branchName, items, total, deliveryFee, createdAt, history } = o;
  res.json({ ref: r, status, mode, branchName, items, total, deliveryFee, createdAt, history });
});

app.get('/api/admin/orders', requireAdmin, (_req, res) => res.json(loadOrders()));

app.get('/api/admin/orders.csv', requireAdmin, (_req, res) => {
  const head = ['Reference', 'Placed', 'Status', 'Name', 'Phone', 'Branch', 'Type', 'Location', 'Payment', 'Items', 'Cylinders total (KES)', 'Delivery fee (KES)', 'Note'];
  const rows = loadOrders().map((o) => [o.ref, o.createdAt, o.status, o.name, o.phone, o.branchName, o.mode, o.location, o.payment,
    o.items.map((i) => `${i.qty} x ${i.size}kg ${i.kind === 'refill' ? 'refill' : 'new'}${i.brand ? ` ${i.brand}` : ''}`).join('; '), o.total, o.deliveryFee, o.note]);
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="orders.csv"' });
  res.send('\ufeff' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n'));
});

app.patch('/api/admin/orders/:ref', requireAdmin, (req, res) => {
  const orders = loadOrders();
  const o = orders.find((x) => x.ref === req.params.ref);
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  const status = req.body?.status;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown status.' });
  if (status !== o.status) { o.status = status; o.history.push({ status, at: new Date().toISOString() }); }
  saveOrders(orders);
  res.json(o);
});
*/}


app.post('/api/orders', async (req, res) => {
  if (limited(`order:${req.ip}`, 10, 60 * 60 * 1000)) {
    return res.status(429).json({
      error: 'Too many orders from this connection. Please call the branch.'
    });
  }

  const { order, error } =await parseOrder(req.body);
  if (error) return res.status(400).json({ error });

  const refs = new Set(await getOrderRefs());
  const now = new Date().toISOString();

  const record = {
    ref: makeRef(refs),
    createdAt: now,
    status: 'new',
    ...order,
    history: [{ status: 'new', at: now }]
  };

  await insertOrder(record);

  res.status(201).json({ ref: record.ref });
});

app.get('/api/orders/track', async (req, res) => {
  if (limited(`track:${req.ip}`, 20, 15 * 60 * 1000)) {
    return res.status(429).json({
      error: 'Too many lookups. Try again in a few minutes.'
    });
  }

  const ref = trimTo(req.query.ref, 20).toUpperCase();
  const o = await getOrder(ref);

  if (!o || phoneKey(o.phone) !== phoneKey(req.query.phone)) {
    return res.status(404).json({
      error: 'No order found with those details. Check the reference and the phone number you ordered with.'
    });
  }

  const {
    ref: r,
    status,
    mode,
    branchName,
    items,
    total,
    deliveryFee,
    createdAt,
    history
  } = o;

  res.json({
    ref: r,
    status,
    mode,
    branchName,
    items,
    total,
    deliveryFee,
    createdAt,
    history
  });
});

app.get('/api/admin/orders', requireAdmin, async (_req, res) => {
  res.json(await getOrders());
});

app.get('/api/admin/orders.csv', requireAdmin, async (_req, res) => {
  const head = [
    'Reference', 'Placed', 'Status', 'Name', 'Phone', 'Branch',
    'Type', 'Location', 'Payment', 'Items',
    'Cylinders total (KES)', 'Delivery fee (KES)', 'Note'
  ];

  const orders = await getOrders();

  const rows = orders.map((o) => [
    o.ref,
    o.createdAt,
    o.status,
    o.name,
    o.phone,
    o.branchName,
    o.mode,
    o.location,
    o.payment,
    o.items.map((i) =>
      `${i.qty} x ${i.size}kg ${i.kind === 'refill' ? 'refill' : 'new'}${i.brand ? ` ${i.brand}` : ''}`
    ).join('; '),
    o.total,
    o.deliveryFee,
    o.note
  ]);

  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="orders.csv"'
  });

  res.send(
    '\ufeff' + [head, ...rows]
      .map((r) => r.map(csvCell).join(','))
      .join('\r\n')
  );
});

app.patch('/api/admin/orders/:ref', requireAdmin, async (req, res) => {
  const o = await getOrder(req.params.ref);

  if (!o) return res.status(404).json({ error: 'Order not found.' });

  const status = req.body?.status;

  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Unknown status.' });
  }

  if (status !== o.status) {
    o.status = status;
    o.history.push({
      status,
      at: new Date().toISOString()
    });
  }

  await updateOrder(o);

  res.json(o);
});



// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const message = err instanceof multer.MulterError
    ? (err.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be under 5 MB.' : 'You can upload at most 5 photos.')
    : err.message || 'Something went wrong.';
  res.status(400).json({ error: message });
});

//app.listen(PORT, () => console.log(`County Gas API on http://localhost:${PORT}`));

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`County Gas API on http://localhost:${PORT}`);
  });
}