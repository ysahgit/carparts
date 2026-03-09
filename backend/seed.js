/**
 * seed.js — Run once to populate bmw_parts.db
 * Usage: node seed.js
 */
const Database = require('better-sqlite3');
const db = new Database('bmw_parts.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS brands (
    id   INTEGER PRIMARY KEY,
    name TEXT UNIQUE
  );
  CREATE TABLE IF NOT EXISTS models (
    id       INTEGER PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id),
    name     TEXT
  );
  CREATE TABLE IF NOT EXISTS years (
    id       INTEGER PRIMARY KEY,
    model_id INTEGER REFERENCES models(id),
    year     INTEGER
  );
  CREATE TABLE IF NOT EXISTS variants (
    id      INTEGER PRIMARY KEY,
    year_id INTEGER REFERENCES years(id),
    name    TEXT,
    engine  TEXT
  );
  CREATE TABLE IF NOT EXISTS categories (
    id   INTEGER PRIMARY KEY,
    name TEXT UNIQUE
  );
  CREATE TABLE IF NOT EXISTS parts (
    id          INTEGER PRIMARY KEY,
    variant_id  INTEGER REFERENCES variants(id),
    category_id INTEGER REFERENCES categories(id),
    name        TEXT,
    part_number TEXT,
    price       REAL,
    stock       INTEGER DEFAULT 0,
    brand       TEXT,
    notes       TEXT
  );
`);

// ── Seed data ─────────────────────────────────────────────────────────────────

const ins = (sql) => db.prepare(sql);

ins('INSERT OR IGNORE INTO brands VALUES (1,"BMW")').run();
ins('INSERT OR IGNORE INTO categories VALUES (1,"Brakes")').run();

const models = [
  [1, 1, '3 Series'],
  [2, 1, '5 Series'],
  [3, 1, 'X3'],
  [4, 1, '1 Series'],
];
models.forEach(([id, bid, name]) =>
  ins('INSERT OR IGNORE INTO models VALUES (?,?,?)').run(id, bid, name)
);

const variantDefs = {
  1: [['318i','1.5L 3-cyl Turbo'],['320i','2.0L 4-cyl Turbo'],['330i','2.0L 4-cyl TwinPower'],['M340i','3.0L 6-cyl TwinPower']],
  2: [['520i','2.0L 4-cyl Turbo'],['530i','2.0L 4-cyl TwinPower'],['540i','3.0L 6-cyl TwinPower'],['M550i','4.4L V8 TwinPower']],
  3: [['xDrive20i','2.0L 4-cyl Turbo'],['xDrive30i','2.0L 4-cyl TwinPower'],['M40i','3.0L 6-cyl TwinPower']],
  4: [['116i','1.5L 3-cyl Turbo'],['118i','1.5L 3-cyl Turbo'],['120i','2.0L 4-cyl Turbo'],['M135i','2.0L 4-cyl TwinPower']],
};

const frontPads = {
  '318i':['Bosch BP2026',18.50],'320i':['Bosch BP1894',22.00],'330i':['TRW GDB1822',28.00],'M340i':['Brembo P06091',68.00],
  '520i':['Bosch BP1894',24.00],'530i':['TRW GDB1768',30.00],'540i':['Ate 13.0460',44.00],'M550i':['Brembo P06094',95.00],
  'xDrive20i':['Bosch BP2125',26.00],'xDrive30i':['TRW GDB1834',32.00],'M40i':['Brembo P06097',72.00],
  '116i':['Bosch BP1936',17.00],'118i':['Bosch BP1936',17.00],'120i':['TRW GDB1799',21.00],'M135i':['Brembo P06095',62.00],
};

let yid = 1, vid = 1, pid = 1;

for (const [mid] of models) {
  for (let year = 2018; year <= 2023; year++) {
    ins('INSERT OR IGNORE INTO years VALUES (?,?,?)').run(yid, mid, year);
    for (const [vname, engine] of variantDefs[mid]) {
      ins('INSERT OR IGNORE INTO variants VALUES (?,?,?,?)').run(vid, yid, vname, engine);
      const [fpn, fpp] = frontPads[vname] || ['Bosch BP0000', 25.00];
      const slug = vname.replace(/\s/g,'');
      const parts = [
        ['Front Brake Pad Set',     fpn,                          fpp,        Math.ceil(Math.random()*20+2), fpn.split(' ')[0], 'OE equivalent'],
        ['Rear Brake Pad Set',      fpn+'R',                      fpp*0.85,   Math.ceil(Math.random()*15+2), fpn.split(' ')[0], 'OE equivalent'],
        ['Front Brake Disc (each)', `FD-${slug}-F`,               fpp*1.8,    Math.ceil(Math.random()*10+1), 'ATE',             'Vented disc'],
        ['Rear Brake Disc (each)',  `FD-${slug}-R`,               fpp*1.4,    Math.ceil(Math.random()*10+1), 'ATE',             'Solid disc'],
        ['Front Caliper (Left)',    `BC-${slug}-FL`,              fpp*6,      Math.ceil(Math.random()*5+1),  'TRW',             'Remanufactured'],
        ['Front Caliper (Right)',   `BC-${slug}-FR`,              fpp*6,      Math.ceil(Math.random()*5+1),  'TRW',             'Remanufactured'],
        ['Brake Fluid DOT4 1L',     'BF-DOT4-1L',                8.50,       50,                            'ATE',             'Universal fit'],
        ['Brake Wear Sensor (F)',   `WS-${slug}-F`,               12.00,      Math.ceil(Math.random()*15+3), 'Bosch',           ''],
      ];
      parts.forEach(([name, pn, price, stock, brand, notes]) =>
        ins('INSERT OR IGNORE INTO parts VALUES (?,?,1,?,?,?,?,?,?)').run(pid++, vid, name, pn, price, stock, brand, notes)
      );
      vid++;
    }
    yid++;
  }
}

console.log(`✅ Seeded: ${pid-1} parts across ${vid-1} variants`);
db.close();
