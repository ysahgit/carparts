/**
 * seed.js — Run once to create and populate parts.db
 * Usage: node seed.js
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'bmw_parts.db');

async function run(SQL) {
  if (!SQL) SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE brands     (id INTEGER PRIMARY KEY, name TEXT UNIQUE);
    CREATE TABLE models     (id INTEGER PRIMARY KEY, brand_id INTEGER, name TEXT);
    CREATE TABLE years      (id INTEGER PRIMARY KEY, model_id INTEGER, year INTEGER);
    CREATE TABLE variants   (id INTEGER PRIMARY KEY, year_id INTEGER, name TEXT, engine TEXT);
    CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT UNIQUE);
    CREATE TABLE parts (
      id INTEGER PRIMARY KEY, variant_id INTEGER, category_id INTEGER,
      name TEXT, part_number TEXT, price REAL, stock INTEGER DEFAULT 0,
      brand TEXT, notes TEXT
    );
  `);

  // ── Categories ───────────────────────────────────────────────────────────────
  [
    [1,'Brakes'], [2,'Suspension'], [3,'Filters'],
    [4,'Exhausts'], [5,'Clutch'], [6,'Steering'],
  ].forEach(([id,name]) => db.run('INSERT INTO categories VALUES (?,?)', [id, name]));

  // ── Brands & Models ──────────────────────────────────────────────────────────
  const brandData = [
    { id:1, name:'BMW', models:[
      { id:1,  name:'3 Series', variants:[['318i','1.5L 3-cyl Turbo'],['320i','2.0L 4-cyl Turbo'],['330i','2.0L 4-cyl TwinPower'],['M340i','3.0L 6-cyl TwinPower']] },
      { id:2,  name:'5 Series', variants:[['520i','2.0L 4-cyl Turbo'],['530i','2.0L 4-cyl TwinPower'],['540i','3.0L 6-cyl TwinPower'],['M550i','4.4L V8 TwinPower']] },
      { id:3,  name:'X3',       variants:[['xDrive20i','2.0L 4-cyl Turbo'],['xDrive30i','2.0L 4-cyl TwinPower'],['M40i','3.0L 6-cyl TwinPower']] },
      { id:4,  name:'1 Series', variants:[['116i','1.5L 3-cyl Turbo'],['118i','1.5L 3-cyl Turbo'],['120i','2.0L 4-cyl Turbo'],['M135i','2.0L 4-cyl TwinPower']] },
    ]},
    { id:2, name:'Audi', models:[
      { id:5,  name:'A3', variants:[['30 TFSI','1.0L 3-cyl Turbo'],['35 TFSI','1.5L 4-cyl Turbo'],['40 TFSI','2.0L 4-cyl Turbo'],['S3','2.0L 4-cyl Turbo 310hp']] },
      { id:6,  name:'A4', variants:[['35 TFSI','1.5L 4-cyl Turbo'],['45 TFSI','2.0L 4-cyl Turbo 265hp'],['S4','3.0L V6 Turbo']] },
      { id:7,  name:'Q5', variants:[['40 TDI','2.0L 4-cyl Diesel'],['45 TFSI','2.0L 4-cyl Turbo'],['55 TFSI','3.0L V6 Turbo'],['SQ5','3.0L V6 TDI']] },
      { id:8,  name:'A6', variants:[['40 TDI','2.0L 4-cyl Diesel'],['45 TFSI','2.0L 4-cyl Turbo'],['55 TFSI','3.0L V6 Turbo'],['S6','2.9L V6 BiTurbo']] },
    ]},
    { id:3, name:'Volkswagen', models:[
      { id:9,  name:'Golf',   variants:[['1.0 TSI','1.0L 3-cyl Turbo'],['1.5 TSI','1.5L 4-cyl Turbo'],['2.0 TDI','2.0L 4-cyl Diesel'],['GTI','2.0L 4-cyl Turbo 245hp']] },
      { id:10, name:'Passat', variants:[['1.5 TSI','1.5L 4-cyl Turbo'],['2.0 TDI','2.0L 4-cyl Diesel'],['2.0 TSI','2.0L 4-cyl Turbo'],['GTE','1.4L PHEV']] },
      { id:11, name:'Tiguan', variants:[['1.5 TSI','1.5L 4-cyl Turbo'],['2.0 TDI','2.0L 4-cyl Diesel'],['2.0 TSI 4Motion','2.0L 4-cyl AWD'],['R','2.0L 4-cyl Turbo 320hp']] },
      { id:12, name:'Polo',   variants:[['1.0 MPI','1.0L 3-cyl NA'],['1.0 TSI','1.0L 3-cyl Turbo'],['1.5 TSI','1.5L 4-cyl Turbo'],['GTI','2.0L 4-cyl Turbo 207hp']] },
    ]},
    { id:4, name:'Toyota', models:[
      { id:13, name:'Corolla', variants:[['1.2T','1.2L 4-cyl Turbo'],['1.8 Hybrid','1.8L 4-cyl Hybrid'],['2.0 GR Sport','2.0L 4-cyl NA'],['GR Corolla','1.6L 3-cyl Turbo 300hp']] },
      { id:14, name:'RAV4',    variants:[['2.0 AWD-i','2.0L 4-cyl'],['2.5 Hybrid','2.5L 4-cyl Hybrid'],['2.5 PHEV','2.5L 4-cyl Plug-in Hybrid'],['2.5 AWD','2.5L 4-cyl AWD']] },
      { id:15, name:'Yaris',   variants:[['1.0 VVT-i','1.0L 3-cyl NA'],['1.5 VVT-i','1.5L 3-cyl NA'],['1.5 Hybrid','1.5L 3-cyl Hybrid'],['GR Yaris','1.6L 3-cyl Turbo 261hp']] },
      { id:16, name:'C-HR',    variants:[['1.8 Hybrid','1.8L 4-cyl Hybrid'],['2.0 Hybrid','2.0L 4-cyl Hybrid'],['2.0 GR Sport Hybrid','2.0L 4-cyl Hybrid Sport']] },
    ]},
  ];

  const r = (min=2, range=15) => Math.ceil(Math.random()*range+min);
  const isPerf = n => /^(M|S|R$|GR|GTI|SQ)/.test(n);

  // ── Part generators per category & brand ─────────────────────────────────────

  const catParts = {

    // 1 — BRAKES
    Brakes: (brandName, vname, slug) => {
      const base = { BMW:{'318i':19,'320i':22,'330i':28,'M340i':68,'520i':24,'530i':30,'540i':44,'M550i':95,'xDrive20i':26,'xDrive30i':32,'M40i':72,'116i':17,'118i':17,'120i':21,'M135i':62}, Audi:{'30 TFSI':18,'35 TFSI':22,'40 TFSI':27,'S3':58,'45 TFSI':30,'S4':75,'40 TDI':25,'55 TFSI':48,'SQ5':82,'S6':88}, Volkswagen:{'1.0 TSI':15,'1.5 TSI':18,'2.0 TDI':20,'GTI':45,'2.0 TSI':24,'GTE':28,'2.0 TSI 4Motion':28,'R':55,'1.0 MPI':14}, Toyota:{'1.2T':16,'1.8 Hybrid':20,'2.0 GR Sport':26,'GR Corolla':55,'2.0 AWD-i':22,'2.5 Hybrid':24,'2.5 PHEV':28,'2.5 AWD':24,'1.0 VVT-i':13,'1.5 VVT-i':16,'1.5 Hybrid':18,'GR Yaris':52,'2.0 Hybrid':22,'2.0 GR Sport Hybrid':30} };
      const suppliers = { BMW:['Bosch','Brembo','ATE','TRW'], Audi:['TRW','Brembo','Zimmermann','Ate'], Volkswagen:['Valeo','EBC','Textar','TRW'], Toyota:['Nisshinbo','Endless','Disco','Aisin'] };
      const fp = (base[brandName]||{})[vname] || 22;
      const sup = suppliers[brandName];
      const perf = isPerf(vname);
      const fpn = perf ? `${sup[1]} P06${r(10,89)}` : `${sup[0]} BP${1800+r(0,299)}`;
      const parts = [
        ['Front Brake Pad Set',     fpn,             fp,      r(),   sup[perf?1:0], 'OE equivalent'],
        ['Rear Brake Pad Set',      fpn+'R',         fp*0.85, r(),   sup[perf?1:0], 'OE equivalent'],
        ['Front Brake Disc (each)', `FD-${slug}-F`,  fp*1.8,  r(),   sup[2],        'Vented disc'],
        ['Rear Brake Disc (each)',  `FD-${slug}-R`,  fp*1.4,  r(),   sup[2],        'Solid disc'],
        ['Front Caliper (Left)',    `BC-${slug}-FL`, fp*6,    r(1,4),sup[3],        'Remanufactured'],
        ['Front Caliper (Right)',   `BC-${slug}-FR`, fp*6,    r(1,4),sup[3],        'Remanufactured'],
        ['Brake Fluid DOT4 1L',     'BF-DOT4-1L',   8.50,    50,    sup[2],        'Universal'],
        ['Brake Wear Sensor (F)',   `WS-${slug}-F`,  12.00,   r(),   sup[0],        ''],
      ];
      if (vname.includes('Hybrid')) parts.push(['Brake Booster (Hybrid)', `BB-${slug}`, fp*8, r(1,3), sup[3], 'e-booster']);
      return parts;
    },

    // 2 — SUSPENSION
    Suspension: (brandName, vname, slug) => {
      const perf = isPerf(vname);
      const base = perf ? 95 : 55;
      const sup = { BMW:'Bilstein', Audi:'KW', Volkswagen:'Monroe', Toyota:'KYB' }[brandName] || 'Monroe';
      return [
        ['Front Shock Absorber (each)', `SA-${slug}-F`,  base,      r(),   sup,       perf?'Sport tuned':'OE spec'],
        ['Rear Shock Absorber (each)',  `SA-${slug}-R`,  base*0.9,  r(),   sup,       perf?'Sport tuned':'OE spec'],
        ['Front Coil Spring (each)',    `CS-${slug}-F`,  base*0.7,  r(),   'Eibach',  ''],
        ['Rear Coil Spring (each)',     `CS-${slug}-R`,  base*0.65, r(),   'Eibach',  ''],
        ['Front Anti-Roll Bar Link',    `ARB-${slug}-F`, 18.50,     r(),   'Meyle',   'Pair'],
        ['Rear Anti-Roll Bar Link',     `ARB-${slug}-R`, 16.00,     r(),   'Meyle',   'Pair'],
        ['Front Wishbone (Left)',       `WB-${slug}-FL`, base*1.2,  r(),   'Lemförder','With bushes'],
        ['Front Wishbone (Right)',      `WB-${slug}-FR`, base*1.2,  r(),   'Lemförder','With bushes'],
        ['Front Strut Mount',           `SM-${slug}-F`,  32.00,     r(),   'SKF',     'Bearing included'],
        ['Suspension Bush Kit',         `BK-${slug}`,    45.00,     r(),   'Powerflex','Full axle kit'],
      ];
    },

    // 3 — FILTERS
    Filters: (brandName, vname, slug) => {
      const diesel = vname.includes('TDI') || vname.includes('d ');
      const hybrid = vname.includes('Hybrid') || vname.includes('PHEV');
      const sup = { BMW:'Mann', Audi:'Mahle', Volkswagen:'Hengst', Toyota:'Toyota Genuine' }[brandName] || 'Mann';
      const parts = [
        ['Engine Oil Filter',       `OF-${slug}`,   8.50,  r(5,20), sup,         'OE spec'],
        ['Air Filter',              `AF-${slug}`,   14.00, r(5,20), sup,         ''],
        ['Cabin / Pollen Filter',   `CF-${slug}`,   12.00, r(5,20), sup,         'Activated carbon'],
        ['Fuel Filter',             `FF-${slug}`,   22.00, r(3,15), sup,         diesel?'Diesel':'Petrol'],
      ];
      if (diesel) parts.push(['Diesel Particulate Filter (DPF)', `DPF-${slug}`, 320.00, r(1,5), 'Delphi', 'OEM equivalent']);
      if (hybrid)  parts.push(['Hybrid Battery Air Filter',       `HBF-${slug}`,  28.00, r(2,8), 'Toyota Genuine', 'Hybrid only']);
      if (isPerf(vname)) parts.push(['Performance Air Filter',    `PAF-${slug}`,  55.00, r(2,8), 'K&N',   'High flow, washable']);
      return parts;
    },

    // 4 — EXHAUSTS
    Exhausts: (brandName, vname, slug) => {
      const perf = isPerf(vname);
      const base = perf ? 420 : 180;
      const sup = perf
        ? { BMW:'Akrapovic', Audi:'Milltek', Volkswagen:'Remus', Toyota:'HKS' }[brandName]
        : { BMW:'Bosal', Audi:'Bosal', Volkswagen:'Klarius', Toyota:'Toyoda Gosei' }[brandName];
      return [
        ['Centre Exhaust Section',     `EX-${slug}-C`,  base*0.6,  r(),   sup,      'Direct fit'],
        ['Rear Silencer / Back Box',   `EX-${slug}-R`,  base,      r(),   sup,      perf?'Sport sound':'Standard'],
        ['Front Downpipe',             `EX-${slug}-DP`, base*0.8,  r(),   sup,      perf?'De-cat':'Cat section'],
        ['Exhaust Manifold Gasket',    `EG-${slug}`,    18.00,     r(),   'Elring', 'Full set'],
        ['Exhaust Mounting Rubber',    `EM-${slug}`,    9.00,      r(5,20),'Bosal', 'Pack of 4'],
        ['Lambda / O2 Sensor (front)', `O2-${slug}-F`,  65.00,     r(),   'Bosch',  'Pre-cat'],
        ['Lambda / O2 Sensor (rear)',  `O2-${slug}-R`,  58.00,     r(),   'Bosch',  'Post-cat'],
      ];
    },

    // 5 — CLUTCH
    Clutch: (brandName, vname, slug) => {
      if (vname.includes('Hybrid') || vname.includes('PHEV') || vname.includes('GTE')) {
        return [['Clutch Not Applicable', `N/A-${slug}`, 0, 0, '-', 'Hybrid/EV — no clutch']];
      }
      const perf = isPerf(vname);
      const base = perf ? 320 : 145;
      const sup = { BMW:'Sachs', Audi:'LuK', Volkswagen:'Valeo', Toyota:'Aisin' }[brandName] || 'Sachs';
      return [
        ['Clutch Kit (3-piece)',        `CK-${slug}`,    base,      r(),   sup,      'Plate, cover & bearing'],
        ['Clutch Plate Only',           `CP-${slug}`,    base*0.45, r(),   sup,      ''],
        ['Clutch Cover / Pressure Plate',`CC-${slug}`,   base*0.40, r(),   sup,      ''],
        ['Release / Thrust Bearing',    `CB-${slug}`,    35.00,     r(),   'SKF',    ''],
        ['Clutch Master Cylinder',      `CMC-${slug}`,   65.00,     r(),   'Ate',    ''],
        ['Clutch Slave Cylinder',       `CSC-${slug}`,   48.00,     r(),   'Ate',    'Concentric'],
        ['Dual Mass Flywheel (DMF)',     `DMF-${slug}`,   base*1.8,  r(1,4),'Sachs', 'Replace with clutch'],
      ];
    },

    // 6 — STEERING
    Steering: (brandName, vname, slug) => {
      const base = 85;
      const sup = { BMW:'ZF', Audi:'TRW', Volkswagen:'Meyle', Toyota:'JTEKT' }[brandName] || 'TRW';
      return [
        ['Steering Rack (remanufactured)', `SR-${slug}`,   base*3.5, r(1,4),sup,     'Exchange unit'],
        ['Power Steering Pump',            `PSP-${slug}`,  base*2,   r(1,4),sup,     'Remanufactured'],
        ['Tie Rod End (Left)',              `TR-${slug}-L`, base*0.4, r(),   'Lemförder','With nut'],
        ['Tie Rod End (Right)',             `TR-${slug}-R`, base*0.4, r(),   'Lemförder','With nut'],
        ['Inner Tie Rod (Left)',            `ITR-${slug}-L`,base*0.35,r(),  'Meyle',  ''],
        ['Inner Tie Rod (Right)',           `ITR-${slug}-R`,base*0.35,r(),  'Meyle',  ''],
        ['Steering Column Joint',          `SCJ-${slug}`,  55.00,    r(),   'Febi',   ''],
        ['Power Steering Fluid 1L',        'PSF-1L',        9.50,    40,    'Pentosin','Universal'],
        ['Steering Boot / Gaiter Kit',     `SBK-${slug}`,  22.00,    r(),   'Corteco','Left & right'],
      ];
    },
  };

  // ── Insert all data ──────────────────────────────────────────────────────────
  let yid=1, vid=1, pid=1;

  for (const brand of brandData) {
    db.run('INSERT INTO brands VALUES (?,?)', [brand.id, brand.name]);
    for (const model of brand.models) {
      db.run('INSERT INTO models VALUES (?,?,?)', [model.id, brand.id, model.name]);
      for (let year=2018; year<=2023; year++) {
        db.run('INSERT INTO years VALUES (?,?,?)', [yid, model.id, year]);
        for (const [vname, engine] of model.variants) {
          db.run('INSERT INTO variants VALUES (?,?,?,?)', [vid, yid, vname, engine]);
          const slug = (brand.name[0]+vname).replace(/[\s\.]/g,'').substring(0,12);

          const catMap = { Brakes:1, Suspension:2, Filters:3, Exhausts:4, Clutch:5, Steering:6 };
          for (const [catName, catId] of Object.entries(catMap)) {
            const parts = catParts[catName](brand.name, vname, slug);
            for (const [name, pn, price, stock, pb, notes] of parts) {
              if (price === 0) continue; // skip N/A hybrid clutch rows
              db.run('INSERT INTO parts VALUES (?,?,?,?,?,?,?,?,?)',
                [pid++, vid, catId, name, pn, Math.round(price*100)/100, stock, pb, notes]);
            }
          }
          vid++;
        }
        yid++;
      }
    }
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log(`Seeded: ${pid-1} parts | ${vid-1} variants | 6 categories`);
  db.close();
}

if (require.main === module) run().catch(console.error);
module.exports = { run };
