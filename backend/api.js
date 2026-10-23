require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

// ---------- helpers ----------
const httpError = (status, message) => Object.assign(new Error(message), { status });
// lets us throw errors inside async handlers and have Express catch them
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const signToken = (id) => jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: '1d' });

function readToken(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), JWT_SECRET).sub; } catch { return null; }
}

function auth(req, _res, next) {
  const id = readToken(req);
  if (!id) return next(httpError(401, 'Missing or invalid token'));
  req.userId = id;
  next();
}

const TYPES = ['LOST', 'FOUND'];
const STATUSES = ['OPEN', 'RECOVERED'];
const itemInclude = { user: { select: { id: true, username: true } } }; // never expose passwordHash

function parseId(v) {
  const id = Number(v);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, 'Invalid id');
  return id;
}

function parseDate(v, field) {
  if (v === undefined || v === null || v === '') return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw httpError(400, `${field} must be a valid date (YYYY-MM-DD)`);
  return d;
}

// Validate item body. partial=true for updates.
function buildItemData(body, partial = false) {
  const data = {};
  if (!partial || body.type !== undefined) {
    const t = String(body.type || '').toUpperCase();
    if (!TYPES.includes(t)) throw httpError(400, "type must be 'lost' or 'found'");
    data.type = t;
  }
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 120)
      throw httpError(400, 'title is required (max 120 characters)');
    data.title = body.title.trim();
  }
  for (const f of ['description', 'category', 'location', 'contact']) {
    if (body[f] !== undefined) {
      if (body[f] !== null && typeof body[f] !== 'string') throw httpError(400, `${f} must be a string`);
      data[f] = body[f] === null ? null : body[f].trim();
    }
  }
  if (body.dateEvent !== undefined) data.dateEvent = parseDate(body.dateEvent, 'dateEvent');
  return data;
}

async function getOwnedItem(req) {
  const id = parseId(req.params.id);
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) throw httpError(404, 'Item not found');
  if (item.userId !== req.userId) throw httpError(403, 'You can only modify your own reports');
  return item;
}

// ---------- auth ----------
app.post('/auth/register', wrap(async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || username.trim().length < 3 || username.length > 50)
    throw httpError(400, 'username must be 3-50 characters');
  if (typeof password !== 'string' || password.length < 6)
    throw httpError(400, 'password must be at least 6 characters');
  const user = await prisma.user.create({
    data: { username: username.trim(), passwordHash: await bcrypt.hash(password, 10) },
  });
  res.status(201).json({ id: user.id, username: user.username, token: signToken(user.id) });
}));

app.post('/auth/login', wrap(async (req, res) => {
  const { username, password } = req.body || {};
  const user = await prisma.user.findUnique({ where: { username: String(username || '') } });
  if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash)))
    throw httpError(401, 'Wrong username or password');
  res.json({ token: signToken(user.id) });
}));

// ---------- items ----------
// Report a lost or found item
app.post('/items', auth, wrap(async (req, res) => {
  const data = buildItemData(req.body || {});
  const item = await prisma.item.create({ data: { ...data, userId: req.userId }, include: itemInclude });
  res.status(201).json(item);
}));

// Search + filter (public). ?mine=true requires a token.
app.get('/items', wrap(async (req, res) => {
  const { q, type, status, category, location, dateFrom, dateTo, mine, sort } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

  const where = {};
  if (type) {
    if (!TYPES.includes(String(type).toUpperCase())) throw httpError(400, 'invalid type');
    where.type = String(type).toUpperCase();
  }
  if (status) {
    if (!STATUSES.includes(String(status).toUpperCase())) throw httpError(400, 'invalid status');
    where.status = String(status).toUpperCase();
  }
  if (category) where.category = String(category);
  if (location) where.location = { contains: String(location) };
  if (q) where.OR = [{ title: { contains: String(q) } }, { description: { contains: String(q) } }];
  if (dateFrom || dateTo) {
    where.dateEvent = {};
    if (dateFrom) where.dateEvent.gte = parseDate(dateFrom, 'dateFrom');
    if (dateTo) where.dateEvent.lte = parseDate(dateTo, 'dateTo');
  }
  if (mine === 'true') {
    const uid = readToken(req);
    if (!uid) throw httpError(401, 'Login required for mine=true');
    where.userId = uid;
  }

  const direction = sort === 'oldest' ? 'asc' : 'desc';
  const [total, items] = await prisma.$transaction([
    prisma.item.count({ where }),
    prisma.item.findMany({
      where, include: itemInclude,
      orderBy: [{ createdAt: direction }, { id: direction }],
      skip: (page - 1) * limit, take: limit,
    }),
  ]);
  res.json({ total, page, limit, items });
}));

// Item details
app.get('/items/:id', wrap(async (req, res) => {
  const item = await prisma.item.findUnique({ where: { id: parseId(req.params.id) }, include: itemInclude });
  if (!item) throw httpError(404, 'Item not found');
  res.json(item);
}));

// Update own report
app.patch('/items/:id', auth, wrap(async (req, res) => {
  const item = await getOwnedItem(req);
  const data = buildItemData(req.body || {}, true);
  delete data.type; // type cannot be changed after creation
  const updated = await prisma.item.update({ where: { id: item.id }, data, include: itemInclude });
  res.json(updated);
}));

// Mark as recovered
app.patch('/items/:id/recovered', auth, wrap(async (req, res) => {
  const item = await getOwnedItem(req);
  const updated = await prisma.item.update({
    where: { id: item.id }, data: { status: 'RECOVERED' }, include: itemInclude,
  });
  res.json(updated);
}));

// Delete own report
app.delete('/items/:id', auth, wrap(async (req, res) => {
  const item = await getOwnedItem(req);
  await prisma.item.delete({ where: { id: item.id } });
  res.status(204).end();
}));

// ---------- errors ----------
app.use((req, _res, next) => next(httpError(404, 'Route not found')));
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (err.code === 'P2002') return res.status(409).json({ error: 'Username already taken' });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});

app.listen(PORT, () => console.log(`Lost & Found API running on http://localhost:${PORT}`));
