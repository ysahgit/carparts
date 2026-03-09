const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'bmw_parts.db');

let db;
let sqlJs;

async function loadDb() {
  sqlJs = await initSqlJs();
  if (!fs.existsSync(DB_PATH)) {
    console.log('No database found — seeding...');
    await require('./seed').run(sqlJs);
  }
  db = new sqlJs.Database(fs.readFileSync(DB_PATH));
  console.log('Database loaded OK');
}

function saveDb() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorised' });
  next();
}

// ── Public API ────────────────────────────────────────────────────────────────
app.get('/api/brands', (req, res) =>
  res.json(query('SELECT id, name FROM brands ORDER BY name')));

app.get('/api/categories', (req, res) =>
  res.json(query('SELECT id, name FROM categories ORDER BY name')));

app.get('/api/models', (req, res) => {
  const { brand_id } = req.query;
  res.json(query(
    brand_id ? 'SELECT id, name FROM models WHERE brand_id = ? ORDER BY name'
             : 'SELECT id, name FROM models ORDER BY name',
    brand_id ? [brand_id] : []
  ));
});

app.get('/api/years', (req, res) => {
  const { model_id } = req.query;
  res.json(query(
    'SELECT DISTINCT year FROM years WHERE model_id = ? ORDER BY year DESC',
    [model_id]
  ).map(r => r.year));
});

app.get('/api/variants', (req, res) => {
  const { model_id, year } = req.query;
  res.json(query(`
    SELECT v.id, v.name, v.engine FROM variants v
    JOIN years y ON y.id = v.year_id
    WHERE y.model_id = ? AND y.year = ? ORDER BY v.name
  `, [model_id, year]));
});

app.get('/api/parts', (req, res) => {
  const { variant_id, category } = req.query;
  let sql = `
    SELECT p.id, p.name, p.part_number, p.price, p.stock, p.brand, p.notes,
           c.name AS category
    FROM parts p JOIN categories c ON c.id = p.category_id
    WHERE p.variant_id = ?
  `;
  const params = [variant_id];
  if (category && category !== 'All') { sql += ' AND c.name = ?'; params.push(category); }
  sql += ' ORDER BY c.name, p.name';
  res.json(query(sql, params));
});

app.get('/api/search', (req, res) => {
  const { q, limit = 12 } = req.query;
  if (!q || q.trim().length < 2) return res.json([]);
  const like = `%${q.trim()}%`;
  res.json(query(`
    SELECT p.id, p.name AS part_name, p.part_number, p.price, p.stock,
           p.brand AS supplier, b.name AS car_brand, m.name AS car_model,
           y.year, v.name AS variant, v.engine, c.name AS category
    FROM parts p
    JOIN variants v ON v.id = p.variant_id JOIN years y ON y.id = v.year_id
    JOIN models m ON m.id = y.model_id JOIN brands b ON b.id = m.brand_id
    JOIN categories c ON c.id = p.category_id
    WHERE p.name LIKE ? OR p.part_number LIKE ? OR p.brand LIKE ? OR m.name LIKE ?
    GROUP BY p.part_number, m.name, v.name, y.year
    ORDER BY CASE WHEN p.part_number LIKE ? THEN 0 WHEN p.name LIKE ? THEN 1 ELSE 2 END, p.name
    LIMIT ?
  `, [like, like, like, like, like, like, parseInt(limit)]));
});

// ── Admin: Auth check ─────────────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ error: 'Wrong password' });
});

// ── Admin: Parts ──────────────────────────────────────────────────────────────
app.get('/api/admin/parts', adminAuth, (req, res) => {
  const { search, category, page = 1, limit = 30 } = req.query;
  let sql = `
    SELECT p.id, p.name, p.part_number, p.price, p.stock, p.brand, p.notes,
           c.name AS category, b.name AS car_brand, m.name AS car_model,
           v.name AS variant
    FROM parts p
    JOIN categories c ON c.id = p.category_id
    JOIN variants v ON v.id = p.variant_id
    JOIN years y ON y.id = v.year_id
    JOIN models m ON m.id = y.model_id
    JOIN brands b ON b.id = m.brand_id
    WHERE 1=1
  `;
  const params = [];
  if (search) { sql += ' AND (p.name LIKE ? OR p.part_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (category) { sql += ' AND c.name = ?'; params.push(category); }
  sql += ' ORDER BY b.name, m.name, c.name, p.name';
  sql += ` LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page)-1)*parseInt(limit)}`;
  res.json(query(sql, params));
});

app.patch('/api/admin/parts/:id', adminAuth, (req, res) => {
  const { price, stock, notes } = req.body;
  run('UPDATE parts SET price=?, stock=?, notes=? WHERE id=?',
    [price, stock, notes, req.params.id]);
  res.json({ ok: true });
});

app.delete('/api/admin/parts/:id', adminAuth, (req, res) => {
  run('DELETE FROM parts WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

app.post('/api/admin/parts', adminAuth, (req, res) => {
  const { variant_id, category_id, name, part_number, price, stock, brand, notes } = req.body;
  const maxId = query('SELECT MAX(id) as m FROM parts')[0].m || 0;
  run('INSERT INTO parts VALUES (?,?,?,?,?,?,?,?,?)',
    [maxId+1, variant_id, category_id, name, part_number, price, stock, brand, notes||'']);
  res.json({ ok: true, id: maxId+1 });
});

// ── Admin: Models & Variants ──────────────────────────────────────────────────
app.get('/api/admin/models', adminAuth, (req, res) => {
  res.json(query(`
    SELECT m.id, m.name, b.name AS brand, COUNT(DISTINCT v.id) AS variant_count
    FROM models m JOIN brands b ON b.id = m.brand_id
    LEFT JOIN years y ON y.model_id = m.id
    LEFT JOIN variants v ON v.year_id = y.id
    GROUP BY m.id ORDER BY b.name, m.name
  `));
});

app.post('/api/admin/models', adminAuth, (req, res) => {
  const { brand_id, name } = req.body;
  const maxId = query('SELECT MAX(id) as m FROM models')[0].m || 0;
  run('INSERT INTO models VALUES (?,?,?)', [maxId+1, brand_id, name]);
  // Add years 2018–2025
  let yMaxId = query('SELECT MAX(id) as m FROM years')[0].m || 0;
  for (let y = 2018; y <= 2025; y++) {
    run('INSERT INTO years VALUES (?,?,?)', [++yMaxId, maxId+1, y]);
  }
  res.json({ ok: true, id: maxId+1 });
});

app.post('/api/admin/variants', adminAuth, (req, res) => {
  const { model_id, name, engine } = req.body;
  // Insert variant for all years of this model
  const years = query('SELECT id FROM years WHERE model_id = ?', [model_id]);
  const maxId = query('SELECT MAX(id) as m FROM variants')[0].m || 0;
  let vid = maxId;
  years.forEach(y => {
    run('INSERT INTO variants VALUES (?,?,?,?)', [++vid, y.id, name, engine]);
  });
  res.json({ ok: true, count: years.length });
});

// Catch-all
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html')));

const PORT = process.env.PORT || 3001;
loadDb().then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)));
