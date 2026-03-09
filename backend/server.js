const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

let db;

async function loadDb() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'bmw_parts.db');
  if (!fs.existsSync(dbPath)) {
    console.error('bmw_parts.db not found — run: node seed.js');
    process.exit(1);
  }
  db = new SQL.Database(fs.readFileSync(dbPath));
  console.log('Database loaded OK');
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ── GET /api/brands ──────────────────────────────────────────────────────────
app.get('/api/brands', (req, res) => {
  res.json(query('SELECT id, name FROM brands ORDER BY name'));
});

// ── GET /api/models?brand_id= ────────────────────────────────────────────────
app.get('/api/models', (req, res) => {
  const { brand_id } = req.query;
  const sql = brand_id
    ? 'SELECT id, name FROM models WHERE brand_id = ? ORDER BY name'
    : 'SELECT id, name FROM models ORDER BY name';
  res.json(query(sql, brand_id ? [brand_id] : []));
});

// ── GET /api/years?model_id= ─────────────────────────────────────────────────
app.get('/api/years', (req, res) => {
  const { model_id } = req.query;
  const rows = query(
    'SELECT DISTINCT year FROM years WHERE model_id = ? ORDER BY year DESC',
    [model_id]
  );
  res.json(rows.map(r => r.year));
});

// ── GET /api/variants?model_id=&year= ────────────────────────────────────────
app.get('/api/variants', (req, res) => {
  const { model_id, year } = req.query;
  res.json(query(`
    SELECT v.id, v.name, v.engine
    FROM variants v
    JOIN years y ON y.id = v.year_id
    WHERE y.model_id = ? AND y.year = ?
    ORDER BY v.name
  `, [model_id, year]));
});

// ── GET /api/parts?variant_id=&category= ────────────────────────────────────
app.get('/api/parts', (req, res) => {
  const { variant_id, category } = req.query;
  let sql = `
    SELECT p.id, p.name, p.part_number, p.price, p.stock, p.brand, p.notes,
           c.name AS category
    FROM parts p
    JOIN categories c ON c.id = p.category_id
    WHERE p.variant_id = ?
  `;
  const params = [variant_id];
  if (category) { sql += ' AND c.name = ?'; params.push(category); }
  sql += ' ORDER BY p.name';
  res.json(query(sql, params));
});

// ── GET /api/search?q= ───────────────────────────────────────────────────────
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  res.json(query(`
    SELECT p.id, p.name, p.part_number, p.price, p.stock, p.brand,
           b.name AS brand_name, m.name AS model, y.year, v.name AS variant
    FROM parts p
    JOIN variants v ON v.id = p.variant_id
    JOIN years    y ON y.id = v.year_id
    JOIN models   m ON m.id = y.model_id
    JOIN brands   b ON b.id = m.brand_id
    WHERE p.name LIKE ? OR p.part_number LIKE ?
    LIMIT 50
  `, [`%${q}%`, `%${q}%`]));
});

const PORT = process.env.PORT || 3001;
loadDb().then(() => app.listen(PORT, () =>
  console.log(`API running on http://localhost:${PORT}`)
));
