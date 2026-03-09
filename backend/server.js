const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, 'bmw_parts.db'));

// ── GET /api/models ──────────────────────────────────────────────────────────
app.get('/api/models', (req, res) => {
  const rows = db.prepare(`
    SELECT m.id, m.name
    FROM models m
    JOIN brands b ON b.id = m.brand_id
    WHERE b.name = 'BMW'
    ORDER BY m.name
  `).all();
  res.json(rows);
});

// ── GET /api/years?model_id= ─────────────────────────────────────────────────
app.get('/api/years', (req, res) => {
  const { model_id } = req.query;
  const rows = db.prepare(`
    SELECT DISTINCT year FROM years
    WHERE model_id = ?
    ORDER BY year DESC
  `).all(model_id);
  res.json(rows.map(r => r.year));
});

// ── GET /api/variants?model_id=&year= ────────────────────────────────────────
app.get('/api/variants', (req, res) => {
  const { model_id, year } = req.query;
  const rows = db.prepare(`
    SELECT v.id, v.name, v.engine
    FROM variants v
    JOIN years y ON y.id = v.year_id
    WHERE y.model_id = ? AND y.year = ?
    ORDER BY v.name
  `).all(model_id, year);
  res.json(rows);
});

// ── GET /api/parts?variant_id=&category=Brakes ───────────────────────────────
app.get('/api/parts', (req, res) => {
  const { variant_id, category } = req.query;
  const rows = db.prepare(`
    SELECT p.id, p.name, p.part_number, p.price, p.stock, p.brand, p.notes,
           c.name AS category
    FROM parts p
    JOIN categories c ON c.id = p.category_id
    JOIN variants v   ON v.id = p.variant_id
    WHERE p.variant_id = ?
    ${category ? "AND c.name = ?" : ""}
    ORDER BY c.name, p.name
  `).all(...(category ? [variant_id, category] : [variant_id]));
  res.json(rows);
});

// ── GET /api/search?q= ───────────────────────────────────────────────────────
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  const rows = db.prepare(`
    SELECT p.id, p.name, p.part_number, p.price, p.stock, p.brand,
           m.name AS model, y.year, v.name AS variant
    FROM parts p
    JOIN variants v ON v.id = p.variant_id
    JOIN years    y ON y.id = v.year_id
    JOIN models   m ON m.id = y.model_id
    WHERE p.name LIKE ? OR p.part_number LIKE ?
    LIMIT 50
  `).all(`%${q}%`, `%${q}%`);
  res.json(rows);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
