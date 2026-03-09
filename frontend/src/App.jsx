import { useState, useEffect } from "react";

// In production API calls go to same origin, in dev Vite proxies to :3001
const API = "/api";

const brandColors = {
  BMW:        "#0066CC",
  Audi:       "#BB0A21",
  Volkswagen: "#1B6DB5",
  Toyota:     "#EB0A1E",
};

const Select = ({ label, value, onChange, options, placeholder, disabled }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:6, flex:"1 1 180px" }}>
    <label style={{ fontSize:11, fontWeight:600, color:"#64748b",
      textTransform:"uppercase", letterSpacing:1 }}>{label}</label>
    <select
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      disabled={disabled || options.length === 0}
      style={{
        padding:"10px 14px", borderRadius:8, fontSize:14, fontWeight:500,
        border: value ? "2px solid #3b82f6" : "2px solid #334155",
        background: disabled || options.length===0 ? "#0f172a" : "#1e293b",
        color: value ? "#f1f5f9" : "#64748b",
        cursor: disabled || options.length===0 ? "not-allowed" : "pointer",
        appearance:"none",
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center",
        paddingRight:32, transition:"border-color 0.15s", outline:"none",
      }}
    >
      <option value="" disabled>{options.length === 0 ? "—" : placeholder}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Cart = ({ items, onRemove }) => {
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  if (!items.length) return null;
  return (
    <div style={{ background:"#0f172a", border:"1px solid #1e3a5f",
      borderRadius:14, padding:20, marginTop:24 }}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700,
        letterSpacing:1, color:"#60a5fa", marginBottom:14, textTransform:"uppercase" }}>
        🛒 Cart ({items.length} item{items.length>1?"s":""})
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", padding:"8px 0", borderBottom:"1px solid #1e293b" }}>
          <div>
            <div style={{ color:"#e2e8f0", fontSize:13, fontWeight:600 }}>{item.name}</div>
            <div style={{ color:"#64748b", fontSize:11 }}>{item.part_number} · Qty: {item.qty}</div>
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

export default function App() {
  const [brands, setBrands]     = useState([]);
  const [models, setModels]     = useState([]);
  const [years, setYears]       = useState([]);
  const [variants, setVariants] = useState([]);
  const [parts, setParts]       = useState([]);

  const [brand, setBrand]       = useState(null);
  const [model, setModel]       = useState(null);
  const [year, setYear]         = useState(null);
  const [variant, setVariant]   = useState(null);
  const [search, setSearch]     = useState("");
  const [cart, setCart]         = useState([]);
  const [added, setAdded]       = useState(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    fetch(`${API}/brands`).then(r => r.json()).then(setBrands);
  }, []);

  useEffect(() => {
    if (!brand) return;
    setModel(null); setYear(null); setVariant(null);
    setModels([]); setYears([]); setVariants([]); setParts([]);
    fetch(`${API}/models?brand_id=${brand.id}`).then(r => r.json()).then(setModels);
  }, [brand]);

  useEffect(() => {
    if (!model) return;
    setYear(null); setVariant(null); setYears([]); setVariants([]); setParts([]);
    fetch(`${API}/years?model_id=${model.id}`).then(r => r.json()).then(setYears);
  }, [model]);

  useEffect(() => {
    if (!model || !year) return;
    setVariant(null); setVariants([]); setParts([]);
    fetch(`${API}/variants?model_id=${model.id}&year=${year}`)
      .then(r => r.json()).then(setVariants);
  }, [year]);

  useEffect(() => {
    if (!variant) return;
    setLoading(true); setParts([]);
    fetch(`${API}/parts?variant_id=${variant.id}&category=Brakes`)
      .then(r => r.json())
      .then(data => { setParts(data); setLoading(false); });
  }, [variant]);

  const filtered = search.trim()
    ? parts.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.part_number.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase()))
    : parts;

  const addToCart = (part) => {
    setCart(c => {
      const ex = c.findIndex(i => i.part_number === part.part_number);
      if (ex >= 0) { const n=[...c]; n[ex]={...n[ex],qty:n[ex].qty+1}; return n; }
      return [...c, {...part, qty:1}];
    });
    setAdded(part.part_number);
    setTimeout(() => setAdded(null), 1200);
  };

  const reset = () => {
    setBrand(null); setModel(null); setYear(null); setVariant(null);
    setModels([]); setYears([]); setVariants([]); setParts([]); setSearch("");
  };

  const accentColor = brand ? (brandColors[brand.name] || "#3b82f6") : "#3b82f6";

  const handleBrand   = val => setBrand(brands.find(x => x.id === parseInt(val)) || null);
  const handleModel   = val => setModel(models.find(x => x.id === parseInt(val)) || null);
  const handleYear    = val => setYear(parseInt(val));
  const handleVariant = val => setVariant(variants.find(x => x.id === parseInt(val)) || null);

  return (
    <div style={{ minHeight:"100vh", background:"#020617",
      fontFamily:"'Inter',sans-serif", padding:"0 0 60px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)",
        borderBottom:"1px solid #1e293b", padding:"20px 32px",
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:26, fontWeight:800, color:"#f8fafc",
            fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:2, textTransform:"uppercase" }}>
            <span style={{ color: accentColor }}>⬡</span> PartsFinder
          </div>
          <div style={{ fontSize:11, color:"#64748b", letterSpacing:2, textTransform:"uppercase", marginTop:2 }}>
            {brand ? `${brand.name} Brake Parts` : "Multi-Brand Brake Parts Specialist"}
          </div>
        </div>
        {brand && (
          <button onClick={reset} style={{ background:"#1e293b", border:"1px solid #334155",
            color:"#94a3b8", padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:12 }}>
            ↺ Start over
          </button>
        )}
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"32px 24px" }}>

        <div style={{ background:"#0f172a", borderRadius:14, border:"1px solid #1e293b",
          padding:"24px", marginBottom:24 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700,
            color:"#64748b", letterSpacing:2, textTransform:"uppercase", marginBottom:16 }}>
            Find Parts For Your Vehicle
          </div>
          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
            <Select label="Brand"          value={brand?.id}    onChange={handleBrand}
              placeholder="Select brand..."   options={brands.map(b=>({value:b.id,label:b.name}))} />
            <Select label="Model"          value={model?.id}    onChange={handleModel}
              placeholder="Select model..."   disabled={!brand}
              options={models.map(m=>({value:m.id,label:m.name}))} />
            <Select label="Year"           value={year}         onChange={handleYear}
              placeholder="Select year..."    disabled={!model}
              options={years.map(y=>({value:y,label:y}))} />
            <Select label="Variant / Engine" value={variant?.id} onChange={handleVariant}
              placeholder="Select variant..." disabled={!year}
              options={variants.map(v=>({value:v.id,label:`${v.name} — ${v.engine}`}))} />
          </div>
        </div>

        {variant && (
          <div style={{ background:"#1e293b", borderRadius:10, padding:"12px 20px",
            marginBottom:20, display:"flex", gap:24, flexWrap:"wrap",
            borderLeft:`4px solid ${accentColor}` }}>
            {[["Brand",brand?.name],["Model",model?.name],["Year",year],
              ["Variant",variant?.name],["Engine",variant?.engine]].map(([l,v]) => (
              <div key={l}>
                <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>{l}</div>
                <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginTop:2}}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {variant && (
          <div style={{ background:"#0f172a", borderRadius:14, border:"1px solid #1e293b", overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", background:"#1e293b",
              display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700,
                color:"#f1f5f9", letterSpacing:1, textTransform:"uppercase" }}>Brake Parts</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Filter by name, part number or brand..."
                style={{ padding:"8px 14px", borderRadius:8, border:"1px solid #334155",
                  background:"#0f172a", color:"#f1f5f9", fontSize:13, width:280, outline:"none" }} />
            </div>
            <div style={{ padding:16, display:"flex", flexDirection:"column", gap:8 }}>
              {loading && <div style={{color:"#64748b",padding:20,textAlign:"center"}}>Loading parts...</div>}
              {filtered.map((p, i) => (
                <div key={i} style={{
                  background:"#1e293b", borderRadius:10, padding:"14px 18px",
                  display:"flex", alignItems:"center", gap:16, flexWrap:"wrap",
                  border:"1px solid #334155",
                  boxShadow: added===p.part_number ? `0 0 0 2px ${accentColor}` : "none",
                  transition:"box-shadow 0.2s",
                }}>
                  <div style={{ flex:"1 1 200px" }}>
                    <div style={{ fontWeight:700, color:"#f1f5f9", fontSize:14 }}>{p.name}</div>
                    <div style={{ fontSize:11, color:"#64748b", marginTop:3 }}>
                      {p.part_number} · <span style={{color:"#94a3b8"}}>{p.brand}</span>
                      {p.notes && <> · <span style={{color:"#64748b"}}>{p.notes}</span></>}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
                    <div style={{
                      fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:700,
                      background: p.stock>10?"#052e16":p.stock>3?"#1c1917":"#2d0000",
                      color: p.stock>10?"#34d399":p.stock>3?"#fbbf24":"#f87171",
                    }}>
                      {p.stock>10?"In Stock":p.stock>3?`Low (${p.stock})`:`Last ${p.stock}`}
                    </div>
                    <div style={{ fontSize:18, fontWeight:800, color:"#34d399", minWidth:70, textAlign:"right" }}>
                      €{Number(p.price).toFixed(2)}
                    </div>
                    <button onClick={() => addToCart(p)} style={{
                      padding:"8px 18px", borderRadius:8, border:"none", cursor:"pointer",
                      fontWeight:700, fontSize:13, whiteSpace:"nowrap",
                      background: added===p.part_number ? "#059669" : accentColor,
                      color:"#fff", transition:"background 0.2s",
                    }}>
                      {added===p.part_number ? "✓ Added" : "+ Add"}
                    </button>
                  </div>
                </div>
              ))}
              {!loading && filtered.length===0 && parts.length>0 && (
                <div style={{color:"#64748b",padding:20,textAlign:"center"}}>No parts match your filter.</div>
              )}
            </div>
          </div>
        )}

        {!variant && (
          <div style={{ textAlign:"center", padding:"60px 20px", color:"#334155" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🔧</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700,
              letterSpacing:1, textTransform:"uppercase", color:"#475569" }}>
              Select your vehicle above to find parts
            </div>
          </div>
        )}

        <Cart items={cart} onRemove={i => setCart(c => c.filter((_,j) => j!==i))} />
      </div>
    </div>
  );
}
