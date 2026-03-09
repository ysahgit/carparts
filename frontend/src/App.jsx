import { useState, useMemo } from "react";

// ── Inline database (mirrors the SQLite schema exactly) ──────────────────────
const DB = {
  models: [
    { id: 1, name: "3 Series" },
    { id: 2, name: "5 Series" },
    { id: 3, name: "X3" },
    { id: 4, name: "1 Series" },
  ],
  years: (() => {
    const rows = [];
    let id = 1;
    for (let mid = 1; mid <= 4; mid++)
      for (let y = 2018; y <= 2023; y++) rows.push({ id: id++, model_id: mid, year: y });
    return rows;
  })(),
  variantDefs: {
    1: [["318i","1.5L 3-cyl Turbo"],["320i","2.0L 4-cyl Turbo"],["330i","2.0L 4-cyl TwinPower"],["M340i","3.0L 6-cyl TwinPower"]],
    2: [["520i","2.0L 4-cyl Turbo"],["530i","2.0L 4-cyl TwinPower"],["540i","3.0L 6-cyl TwinPower"],["M550i","4.4L V8 TwinPower"]],
    3: [["xDrive20i","2.0L 4-cyl Turbo"],["xDrive30i","2.0L 4-cyl TwinPower"],["M40i","3.0L 6-cyl TwinPower"]],
    4: [["116i","1.5L 3-cyl Turbo"],["118i","1.5L 3-cyl Turbo"],["120i","2.0L 4-cyl Turbo"],["M135i","2.0L 4-cyl TwinPower"]],
  },
  frontPads: {
    "318i":["Bosch BP2026",18.50],"320i":["Bosch BP1894",22.00],"330i":["TRW GDB1822",28.00],"M340i":["Brembo P06091",68.00],
    "520i":["Bosch BP1894",24.00],"530i":["TRW GDB1768",30.00],"540i":["Ate 13.0460",44.00],"M550i":["Brembo P06094",95.00],
    "xDrive20i":["Bosch BP2125",26.00],"xDrive30i":["TRW GDB1834",32.00],"M40i":["Brembo P06097",72.00],
    "116i":["Bosch BP1936",17.00],"118i":["Bosch BP1936",17.00],"120i":["TRW GDB1799",21.00],"M135i":["Brembo P06095",62.00],
  },
};

// Deterministic stock from variant name
const pseudoStock = (seed, min, range) => {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return min + (Math.abs(h) % range);
};

function getParts(variantName) {
  const [fpn, fpp] = DB.frontPads[variantName] || ["Bosch BP0000", 25.00];
  const slug = variantName.replace(/\s/g, "");
  return [
    { name:"Front Brake Pad Set",    pn:fpn,              price:fpp,      stock:pseudoStock(slug+"fp",2,20), brand:fpn.split(" ")[0], notes:"OE equivalent" },
    { name:"Rear Brake Pad Set",     pn:fpn+"R",          price:fpp*0.85, stock:pseudoStock(slug+"rp",2,15), brand:fpn.split(" ")[0], notes:"OE equivalent" },
    { name:"Front Brake Disc (each)",pn:`FD-${slug}-F`,   price:fpp*1.8,  stock:pseudoStock(slug+"fd",1,10), brand:"ATE",             notes:"Vented disc" },
    { name:"Rear Brake Disc (each)", pn:`FD-${slug}-R`,   price:fpp*1.4,  stock:pseudoStock(slug+"rd",1,10), brand:"ATE",             notes:"Solid disc" },
    { name:"Front Caliper (Left)",   pn:`BC-${slug}-FL`,  price:fpp*6,    stock:pseudoStock(slug+"cl",1,5),  brand:"TRW",             notes:"Remanufactured" },
    { name:"Front Caliper (Right)",  pn:`BC-${slug}-FR`,  price:fpp*6,    stock:pseudoStock(slug+"cr",1,5),  brand:"TRW",             notes:"Remanufactured" },
    { name:"Brake Fluid DOT4 1L",    pn:"BF-DOT4-1L",     price:8.50,     stock:50,                          brand:"ATE",             notes:"Universal fit" },
    { name:"Brake Wear Sensor (F)",  pn:`WS-${slug}-F`,   price:12.00,    stock:pseudoStock(slug+"ws",3,15), brand:"Bosch",           notes:"" },
  ];
}

// ── UI Components ─────────────────────────────────────────────────────────────
const StepBadge = ({ n, active, done }) => (
  <div style={{
    width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:13, fontWeight:700, flexShrink:0,
    background: done ? "#10b981" : active ? "#2563eb" : "#1e293b",
    color: done || active ? "#fff" : "#64748b",
    border: active ? "2px solid #60a5fa" : "2px solid transparent",
    transition:"all 0.2s",
  }}>{done ? "✓" : n}</div>
);

const Chip = ({ label, selected, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding:"7px 16px", borderRadius:8, fontSize:13, fontWeight:600, cursor:disabled?"default":"pointer",
    border: selected ? "2px solid #3b82f6" : "2px solid #334155",
    background: selected ? "#1d4ed8" : disabled ? "#0f172a" : "#1e293b",
    color: disabled ? "#475569" : selected ? "#fff" : "#cbd5e1",
    transition:"all 0.15s", whiteSpace:"nowrap",
  }}>{label}</button>
);

const Section = ({ step, title, active, done, children }) => (
  <div style={{
    background:"#0f172a", borderRadius:14, border:`1px solid ${active?"#334155":"#1e293b"}`,
    overflow:"hidden", transition:"all 0.2s", opacity: (!active && !done) ? 0.4 : 1,
  }}>
    <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:12,
      background: active ? "#1e293b" : "#0f172a" }}>
      <StepBadge n={step} active={active} done={done} />
      <span style={{ fontWeight:700, fontSize:15, color: active?"#f1f5f9":"#94a3b8",
        fontFamily:"'Barlow Condensed', sans-serif", letterSpacing:1, textTransform:"uppercase" }}>
        {title}
      </span>
    </div>
    {(active || done) && <div style={{ padding:"16px 20px" }}>{children}</div>}
  </div>
);

// ── Cart ──────────────────────────────────────────────────────────────────────
const Cart = ({ items, onRemove }) => {
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  if (!items.length) return null;
  return (
    <div style={{ background:"#0f172a", border:"1px solid #1e3a5f", borderRadius:14, padding:20, marginTop:24 }}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700,
        letterSpacing:1, color:"#60a5fa", marginBottom:14, textTransform:"uppercase" }}>
        🛒 Cart ({items.length} item{items.length>1?"s":""})
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"8px 0", borderBottom:"1px solid #1e293b" }}>
          <div>
            <div style={{ color:"#e2e8f0", fontSize:13, fontWeight:600 }}>{item.name}</div>
            <div style={{ color:"#64748b", fontSize:11 }}>{item.pn} · Qty: {item.qty}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ color:"#34d399", fontWeight:700 }}>€{(item.price*item.qty).toFixed(2)}</span>
            <button onClick={() => onRemove(i)} style={{ background:"none", border:"none",
              color:"#ef4444", cursor:"pointer", fontSize:16 }}>×</button>
          </div>
        </div>
      ))}
      <div style={{ marginTop:14, textAlign:"right", fontSize:18, fontWeight:800, color:"#f1f5f9" }}>
        Total: <span style={{ color:"#34d399" }}>€{total.toFixed(2)}</span>
      </div>
    </div>
  );
};

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [model, setModel] = useState(null);
  const [year, setYear] = useState(null);
  const [variant, setVariant] = useState(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [added, setAdded] = useState(null);

  const years = useMemo(() => model
    ? DB.years.filter(y => y.model_id === model.id).map(y => y.year).sort((a,b)=>b-a)
    : [], [model]);

  const variants = useMemo(() => {
    if (!model || !year) return [];
    return (DB.variantDefs[model.id] || []).map(([name, engine], i) => ({ id: i+1, name, engine }));
  }, [model, year]);

  const parts = useMemo(() => variant ? getParts(variant.name) : [], [variant]);

  const filtered = useMemo(() => {
    if (!search.trim()) return parts;
    const q = search.toLowerCase();
    return parts.filter(p => p.name.toLowerCase().includes(q) || p.pn.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
  }, [parts, search]);

  const addToCart = (part) => {
    setCart(c => {
      const ex = c.findIndex(i => i.pn === part.pn);
      if (ex >= 0) { const n=[...c]; n[ex]={...n[ex],qty:n[ex].qty+1}; return n; }
      return [...c, {...part, qty:1}];
    });
    setAdded(part.pn);
    setTimeout(() => setAdded(null), 1200);
  };

  const reset = () => { setModel(null); setYear(null); setVariant(null); setSearch(""); };

  const step = !model ? 1 : !year ? 2 : !variant ? 3 : 4;

  return (
    <div style={{ minHeight:"100vh", background:"#020617", fontFamily:"'Inter',sans-serif", padding:"0 0 60px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)",
        borderBottom:"1px solid #1e293b", padding:"20px 32px", display:"flex",
        alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:26, fontWeight:800, color:"#f8fafc",
            fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:2, textTransform:"uppercase" }}>
            <span style={{ color:"#3b82f6" }}>⬡</span> PartsFinder
          </div>
          <div style={{ fontSize:11, color:"#64748b", letterSpacing:2, textTransform:"uppercase", marginTop:2 }}>
            BMW Brake Parts Specialist
          </div>
        </div>
        {model && (
          <button onClick={reset} style={{ background:"#1e293b", border:"1px solid #334155",
            color:"#94a3b8", padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:12 }}>
            ↺ Start over
          </button>
        )}
      </div>

      <div style={{ maxWidth:860, margin:"0 auto", padding:"32px 24px" }}>

        {/* Breadcrumb */}
        {model && (
          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:24, flexWrap:"wrap" }}>
            {[
              { label:"BMW", always:true },
              model && { label:model.name, onClick:()=>{setYear(null);setVariant(null);} },
              year && { label:year, onClick:()=>{setVariant(null);} },
              variant && { label:variant.name },
            ].filter(Boolean).map((b, i, arr) => (
              <span key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                {i>0 && <span style={{color:"#334155"}}>›</span>}
                <span onClick={b.onClick} style={{
                  color: b.onClick?"#60a5fa":"#f1f5f9", cursor:b.onClick?"pointer":"default",
                  fontSize:13, fontWeight:600,
                }}>{b.label}</span>
              </span>
            ))}
          </div>
        )}

        {/* Steps */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* Step 1 — Model */}
          <Section step={1} title="Select Model" active={step===1} done={step>1}>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {DB.models.map(m => (
                <Chip key={m.id} label={m.name} selected={model?.id===m.id}
                  onClick={() => { setModel(m); setYear(null); setVariant(null); }} />
              ))}
            </div>
          </Section>

          {/* Step 2 — Year */}
          <Section step={2} title="Select Year" active={step===2} done={step>2}>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {years.map(y => (
                <Chip key={y} label={y} selected={year===y}
                  onClick={() => { setYear(y); setVariant(null); }} />
              ))}
            </div>
          </Section>

          {/* Step 3 — Variant */}
          <Section step={3} title="Select Variant / Engine" active={step===3} done={step>3}>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {variants.map(v => (
                <Chip key={v.id} label={`${v.name}  ·  ${v.engine}`} selected={variant?.name===v.name}
                  onClick={() => setVariant(v)} />
              ))}
            </div>
          </Section>

          {/* Step 4 — Parts */}
          <Section step={4} title="Brake Parts" active={step===4} done={false}>
            {/* Vehicle summary */}
            <div style={{ background:"#1e293b", borderRadius:10, padding:"12px 16px", marginBottom:20,
              display:"flex", gap:24, flexWrap:"wrap" }}>
              {[["Model","BMW "+model?.name],["Year",year],["Variant",variant?.name],["Engine",variant?.engine]].map(([l,v])=>(
                <div key={l}>
                  <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>{l}</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginTop:2}}>{v}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Filter parts... (name, part number, brand)"
              style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #334155",
                background:"#1e293b", color:"#f1f5f9", fontSize:13, marginBottom:16, boxSizing:"border-box" }} />

            {/* Parts table */}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {filtered.map((p, i) => (
                <div key={i} style={{
                  background:"#1e293b", borderRadius:10, padding:"14px 18px",
                  display:"flex", alignItems:"center", gap:16, flexWrap:"wrap",
                  border:"1px solid #334155",
                  boxShadow: added===p.pn ? "0 0 0 2px #3b82f6" : "none",
                  transition:"box-shadow 0.2s",
                }}>
                  <div style={{ flex:"1 1 200px" }}>
                    <div style={{ fontWeight:700, color:"#f1f5f9", fontSize:14 }}>{p.name}</div>
                    <div style={{ fontSize:11, color:"#64748b", marginTop:3 }}>
                      {p.pn} · <span style={{color:"#94a3b8"}}>{p.brand}</span>
                      {p.notes && <> · <span style={{color:"#64748b"}}>{p.notes}</span></>}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
                    <div style={{
                      fontSize:11, padding:"3px 10px", borderRadius:20,
                      background: p.stock>10?"#052e16":p.stock>3?"#1c1917":"#2d0000",
                      color: p.stock>10?"#34d399":p.stock>3?"#fbbf24":"#f87171",
                      fontWeight:700,
                    }}>
                      {p.stock>10?"In Stock":p.stock>3?`Low (${p.stock})`:`Last ${p.stock}`}
                    </div>
                    <div style={{ fontSize:18, fontWeight:800, color:"#34d399", minWidth:70, textAlign:"right" }}>
                      €{p.price.toFixed(2)}
                    </div>
                    <button onClick={()=>addToCart(p)} style={{
                      padding:"8px 18px", borderRadius:8, border:"none", cursor:"pointer",
                      fontWeight:700, fontSize:13,
                      background: added===p.pn ? "#059669" : "#1d4ed8",
                      color:"#fff", transition:"background 0.2s", whiteSpace:"nowrap",
                    }}>
                      {added===p.pn ? "✓ Added" : "+ Add"}
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length===0 && (
                <div style={{color:"#64748b",padding:20,textAlign:"center"}}>No parts match your filter.</div>
              )}
            </div>
          </Section>
        </div>

        <Cart items={cart} onRemove={i => setCart(c => c.filter((_,j)=>j!==i))} />
      </div>
    </div>
  );
}
