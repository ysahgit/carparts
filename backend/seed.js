/**
 * seed.js — can be run standalone (node seed.js)
 * or imported by server.js for auto-seeding
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'bmw_parts.db');

async function run(SQL) {
  if (!SQL) SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE brands (id INTEGER PRIMARY KEY, name TEXT UNIQUE);
    CREATE TABLE models (id INTEGER PRIMARY KEY, brand_id INTEGER, name TEXT);
    CREATE TABLE years (id INTEGER PRIMARY KEY, model_id INTEGER, year INTEGER);
    CREATE TABLE variants (id INTEGER PRIMARY KEY, year_id INTEGER, name TEXT, engine TEXT);
    CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT UNIQUE);
    CREATE TABLE parts (
      id INTEGER PRIMARY KEY, variant_id INTEGER, category_id INTEGER,
      name TEXT, part_number TEXT, price REAL, stock INTEGER DEFAULT 0,
      brand TEXT, notes TEXT
    );
  `);

  db.run("INSERT INTO categories VALUES (1,'Brakes')");

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

  const bmwPadP   = {'318i':19,'320i':22,'330i':28,'M340i':68,'520i':24,'530i':30,'540i':44,'M550i':95,'xDrive20i':26,'xDrive30i':32,'M40i':72,'116i':17,'118i':17,'120i':21,'M135i':62};
  const audiPadP  = {'30 TFSI':18,'35 TFSI':22,'40 TFSI':27,'S3':58,'45 TFSI':30,'S4':75,'40 TDI':25,'55 TFSI':48,'SQ5':82,'S6':88};
  const vwPadP    = {'1.0 TSI':15,'1.5 TSI':18,'2.0 TDI':20,'GTI':45,'2.0 TSI':24,'GTE':28,'2.0 TSI 4Motion':28,'R':55,'1.0 MPI':14};
  const toyPadP   = {'1.2T':16,'1.8 Hybrid':20,'2.0 GR Sport':26,'GR Corolla':55,'2.0 AWD-i':22,'2.5 Hybrid':24,'2.5 PHEV':28,'2.5 AWD':24,'1.0 VVT-i':13,'1.5 VVT-i':16,'1.5 Hybrid':18,'GR Yaris':52,'1.8 C-HR Hybrid':19,'2.0 Hybrid':22,'2.0 GR Sport Hybrid':30};

  const r = (min=2,range=15) => Math.ceil(Math.random()*range+min);

  const partFns = {
    BMW: (vname, slug) => {
      const fp = bmwPadP[vname]||25;
      const fpn = vname.startsWith('M') ? `Brembo P06091` : `Bosch BP${1800+r(0,299)}`;
      return [
        ['Front Brake Pad Set',fpn,fp,r(),fpn.split(' ')[0],'OE equivalent'],
        ['Rear Brake Pad Set',fpn+'R',fp*0.85,r(),fpn.split(' ')[0],'OE equivalent'],
        ['Front Brake Disc (each)',`FD-${slug}-F`,fp*1.8,r(),'ATE','Vented disc'],
        ['Rear Brake Disc (each)',`FD-${slug}-R`,fp*1.4,r(),'ATE','Solid disc'],
        ['Front Caliper (Left)',`BC-${slug}-FL`,fp*6,r(1,4),'TRW','Remanufactured'],
        ['Front Caliper (Right)',`BC-${slug}-FR`,fp*6,r(1,4),'TRW','Remanufactured'],
        ['Brake Fluid DOT4 1L','BF-DOT4-1L',8.50,50,'ATE','Universal fit'],
        ['Brake Wear Sensor (F)',`WS-${slug}-F`,12.00,r(),'Bosch',''],
      ];
    },
    Audi: (vname, slug) => {
      const fp = audiPadP[vname]||27;
      const isS = vname.startsWith('S')||vname.startsWith('RS');
      const fpn = isS ? `Brembo P85091` : `TRW GDB${1700+r(0,199)}`;
      return [
        ['Front Brake Pad Set',fpn,fp,r(),fpn.split(' ')[0],'OE spec'],
        ['Rear Brake Pad Set',fpn+'R',fp*0.80,r(),fpn.split(' ')[0],'OE spec'],
        ['Front Brake Disc (each)',`AUD-FD-${slug}`,fp*2.0,r(),'Zimmermann','Coated vented disc'],
        ['Rear Brake Disc (each)',`AUD-RD-${slug}`,fp*1.5,r(),'Zimmermann','Coated solid disc'],
        ['Front Caliper (Left)',`AUD-CL-${slug}`,fp*5.5,r(1,4),'Ate','Exchange unit'],
        ['Front Caliper (Right)',`AUD-CR-${slug}`,fp*5.5,r(1,4),'Ate','Exchange unit'],
        ['Brake Fluid DOT4 Plus 1L','AUD-BF-DOT4P',9.90,40,'Ate','Low viscosity'],
        ['Brake Wear Sensor (F)',`AUD-WS-${slug}`,13.50,r(),'Hella',''],
        ['Handbrake Cable',`AUD-HB-${slug}`,fp*1.2,r(),'Cofle','Rear only'],
      ];
    },
    Volkswagen: (vname, slug) => {
      const fp = vwPadP[vname]||18;
      const isPerf = vname.includes('GTI')||vname==='R';
      const fpn = isPerf ? `EBC DP${2000+r(0,999)}` : `Valeo 601${r(400,599)}`;
      return [
        ['Front Brake Pad Set',fpn,fp,r(),fpn.split(' ')[0],'OE equivalent'],
        ['Rear Brake Pad Set',fpn+'R',fp*0.75,r(),fpn.split(' ')[0],'OE equivalent'],
        ['Front Brake Disc (each)',`VW-FD-${slug}`,fp*1.9,r(),'Textar','Vented disc'],
        ['Rear Brake Disc (each)',`VW-RD-${slug}`,fp*1.3,r(),'Textar','Solid disc'],
        ['Rear Brake Drum',`VW-DR-${slug}`,fp*1.1,r(),'LPR','Non-GTI models'],
        ['Front Caliper (Left)',`VW-CL-${slug}`,fp*5,r(1,4),'TRW','Remanufactured'],
        ['Front Caliper (Right)',`VW-CR-${slug}`,fp*5,r(1,4),'TRW','Remanufactured'],
        ['Brake Fluid DOT4 1L','VW-BF-DOT4',7.90,60,'Liqui-Moly','Universal fit'],
        ['Brake Wear Indicator (F)',`VW-WI-${slug}`,9.50,r(),'Bosch',''],
      ];
    },
    Toyota: (vname, slug) => {
      const fp = toyPadP[vname]||20;
      const isGR = vname.startsWith('GR');
      const fpn = isGR ? `Endless MX72` : `Nisshinbo NP${1000+r(0,999)}`;
      const parts = [
        ['Front Brake Pad Set',fpn,fp,r(),fpn.split(' ')[0],'Japanese OEM spec'],
        ['Rear Brake Pad Set',fpn+'R',fp*0.80,r(),fpn.split(' ')[0],'Japanese OEM spec'],
        ['Front Brake Disc (each)',`TOY-FD-${slug}`,fp*1.7,r(),'Disco','Vented disc'],
        ['Rear Brake Disc (each)',`TOY-RD-${slug}`,fp*1.3,r(),'Disco','Solid disc'],
        ['Front Caliper (Left)',`TOY-CL-${slug}`,fp*5.2,r(1,4),'Aisin','OEM supplier'],
        ['Front Caliper (Right)',`TOY-CR-${slug}`,fp*5.2,r(1,4),'Aisin','OEM supplier'],
        ['Brake Fluid DOT3/4 1L','TOY-BF-D34',8.20,50,'Toyota Genuine','Universal fit'],
        ['Brake Wear Sensor (F)',`TOY-WS-${slug}`,11.00,r(),'Denso',''],
      ];
      if (vname.includes('Hybrid')) parts.push(
        ['Brake Booster (Hybrid)',`TOY-BB-${slug}`,fp*8,r(1,3),'Toyota Genuine','Hybrid e-booster']
      );
      return parts;
    },
  };

  let yid=1, vid=1, pid=1;
  for (const brand of brandData) {
    db.run('INSERT INTO brands VALUES (?,?)',[brand.id, brand.name]);
    for (const model of brand.models) {
      db.run('INSERT INTO models VALUES (?,?,?)',[model.id, brand.id, model.name]);
      for (let year=2018; year<=2023; year++) {
        db.run('INSERT INTO years VALUES (?,?,?)',[yid, model.id, year]);
        for (const [vname, engine] of model.variants) {
          db.run('INSERT INTO variants VALUES (?,?,?,?)',[vid, yid, vname, engine]);
          const slug = (brand.name[0]+vname).replace(/[\s\.]/g,'').substring(0,12);
          for (const [name,pn,price,stock,pb,notes] of partFns[brand.name](vname,slug)) {
            db.run('INSERT INTO parts VALUES (?,?,1,?,?,?,?,?,?)',
              [pid++, vid, name, pn, Math.round(price*100)/100, stock, pb, notes]);
          }
          vid++;
        }
        yid++;
      }
    }
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log(`Seeded: ${pid-1} parts | ${vid-1} variants`);
  db.close();
}

// Allow running standalone
if (require.main === module) {
  run().catch(console.error);
}

module.exports = { run };
