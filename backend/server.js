const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'bmw_parts.db');

// Email config (set via env vars)
const mailer = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

let db;

async function loadDb() {
  const SQL = await initSqlJs();
  if (!fs.existsSync(DB_PATH)) {
    console.log('No database found — seeding...');
    await require('./seed').run(SQL);
  }
  db = new SQL.Database(fs.readFileSync(DB_PATH));

  // Create orders tables if they don't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id          INTEGER PRIMARY KEY,
      reference   TEXT UNIQUE,
      name        TEXT,
      email       TEXT,
      phone       TEXT,
      address     TEXT,
      city        TEXT,
      postcode    TEXT,
      country     TEXT,
      notes       TEXT,
      total       REAL,
      status      TEXT DEFAULT 'pending',
      paypal_id   TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id          INTEGER PRIMARY KEY,
      order_id    INTEGER REFERENCES orders(id),
      part_number TEXT,
      name        TEXT,
      brand       TEXT,
      price       REAL,
      qty         INTEGER
    );
  `);
  saveDb();
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

// ── Orders ────────────────────────────────────────────────────────────────────
function generateRef() {
  return 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
}

app.post('/api/orders', async (req, res) => {
  const { customer, items, paypal_id } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'No items' });

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const ref   = generateRef();
  const maxId = query('SELECT MAX(id) as m FROM orders')[0].m || 0;
  const orderId = maxId + 1;

  run(`INSERT INTO orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`, [
    orderId, ref,
    customer.name, customer.email, customer.phone,
    customer.address, customer.city, customer.postcode, customer.country,
    customer.notes || '',
    Math.round(total * 100) / 100,
    'paid', paypal_id || ''
  ]);

  let itemId = query('SELECT MAX(id) as m FROM order_items')[0].m || 0;
  items.forEach(item => {
    run('INSERT INTO order_items VALUES (?,?,?,?,?,?,?)',
      [++itemId, orderId, item.part_number, item.name, item.brand, item.price, item.qty]);
  });

// Send emails
if (process.env.SMTP_USER) {
  const itemRows = items.map(i =>
    `<tr><td>${i.name}</td><td>${i.part_number}</td><td>${i.qty}</td><td>€${(i.price*i.qty).toFixed(2)}</td></tr>`
  ).join('');

  // Email to customer
  if (customer.email) {
    try {
      await mailer.sendMail({
        from: `PartsFinder <${process.env.SMTP_USER}>`,
        to: customer.email,
        subject: `Order Confirmed — ${ref}`,
        html: `
          <h2>Thank you, ${customer.name}!</h2>
          <p>Your order <strong>${ref}</strong> has been received.</p>
          <table border="1" cellpadding="6" cellspacing="0">
            <thead><tr><th>Part</th><th>Part No.</th><th>Qty</th><th>Price</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
          <p><strong>Total: €${total.toFixed(2)}</strong></p>
          <h3>Shipping to:</h3>
          <p>${customer.name}<br>${customer.address}<br>${customer.city} ${customer.postcode}<br>${customer.country}</p>
          <p>We will be in touch shortly with shipping details.</p>
        `,
      });
    } catch (e) {
      console.error('Customer email error:', e.message);
    }
  }

  // Email to admin
  try {
    await mailer.sendMail({
      from: `PartsFinder <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      subject: `🛒 New Order — ${ref} — €${total.toFixed(2)}`,
      html: `
        <h2>New Order Received</h2>
        <p><strong>Reference:</strong> ${ref}</p>
        <p><strong>Customer:</strong> ${customer.name} (${customer.email})</p>
        <p><strong>Phone:</strong> ${customer.phone}</p>
        <p><strong>Address:</strong> ${customer.address}, ${customer.city} ${customer.postcode}, ${customer.country}</p>
        ${customer.notes ? `<p><strong>Notes:</strong> ${customer.notes}</p>` : ''}
        <table border="1" cellpadding="6" cellspacing="0">
          <thead><tr><th>Part</th><th>Part No.</th><th>Qty</th><th>Price</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <p><strong>Total: €${total.toFixed(2)}</strong></p>
        <p><a href="https://www.yyaass.site/admin">View in Admin Panel →</a></p>
      `,
    });
  } catch (e) {
    console.error('Admin email error:', e.message);
  }
}


// ── Admin Auth ────────────────────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ error: 'Wrong password' });
});

// ── Admin Parts ───────────────────────────────────────────────────────────────
app.get('/api/admin/parts', adminAuth, (req, res) => {
  const { search, category, page = 1, limit = 30 } = req.query;
  let sql = `
    SELECT p.id, p.name, p.part_number, p.price, p.stock, p.brand, p.notes,
           c.name AS category, b.name AS car_brand, m.name AS car_model, v.name AS variant
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
  sql += ` ORDER BY b.name, m.name, c.name, p.name LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page)-1)*parseInt(limit)}`;
  res.json(query(sql, params));
});

app.patch('/api/admin/parts/:id', adminAuth, (req, res) => {
  const { price, stock, notes } = req.body;
  run('UPDATE parts SET price=?, stock=?, notes=? WHERE id=?', [price, stock, notes, req.params.id]);
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

// ── Admin Models ──────────────────────────────────────────────────────────────
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
  let yMaxId = query('SELECT MAX(id) as m FROM years')[0].m || 0;
  for (let y = 2018; y <= 2025; y++) run('INSERT INTO years VALUES (?,?,?)', [++yMaxId, maxId+1, y]);
  res.json({ ok: true, id: maxId+1 });
});

app.post('/api/admin/variants', adminAuth, (req, res) => {
  const { model_id, name, engine } = req.body;
  const years = query('SELECT id FROM years WHERE model_id = ?', [model_id]);
  const maxId = query('SELECT MAX(id) as m FROM variants')[0].m || 0;
  let vid = maxId;
  years.forEach(y => run('INSERT INTO variants VALUES (?,?,?,?)', [++vid, y.id, name, engine]));
  res.json({ ok: true, count: years.length });
});

// ── Admin Orders ──────────────────────────────────────────────────────────────
app.get('/api/admin/orders', adminAuth, (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page)-1)*parseInt(limit)}`;
  const orders = query(sql, params);
  res.json(orders);
});

app.get('/api/admin/orders/:id', adminAuth, (req, res) => {
  const order = query('SELECT * FROM orders WHERE id = ?', [req.params.id])[0];
  if (!order) return res.status(404).json({ error: 'Not found' });
  const items = query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
  res.json({ ...order, items });
});

app.patch('/api/admin/orders/:id', adminAuth, (req, res) => {
  const { status } = req.body;
  run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ ok: true });
});

// Catch-all
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html')));

const PORT = process.env.PORT || 3001;
loadDb().then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)));
