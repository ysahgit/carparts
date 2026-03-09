import { useState, useEffect, useRef } from "react";

const API = "/api";

const brandColors = {
  BMW: "#0066CC", Audi: "#BB0A21", Volkswagen: "#1B6DB5", Toyota: "#EB0A1E",
};

const categoryIcons = {
  Brakes: "🛑", Suspension: "🔩", Filters: "🌀",
  Exhausts: "💨", Clutch: "⚙️", Steering: "🎯", All: "📦",
};

// ── Search Bar ────────────────────────────────────────────────────────────────
function SearchBar({ accentColor }) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null);
  const debounceRef = useRef(null);
  const wrapperRef  = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val); setSelected(null);
    if (val.trim().length < 2) { setResults([]); setOpen(false); return; }
    clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      fetch(`${API}/search?q=${encodeURIComponent(val)}`)
        .then(r => r.json())
        .then(data => { setResults(data); setOpen(true); setLoading(false); });
    }, 280);
  };

  const handleSelect = (item) => { setSelected(item); setQuery(item.part_name); setOpen(false); };
  const handleClear  = () => { setQuery(""); setResults([]); setOpen(false); setSelected(null); };

  return (
    <div ref={wrapperRef} style={{ position:"relative", width:"100%", maxWidth:480 }}>
      <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
        <span style={{ position:"absolute", left:12, color:"#64748b", fontSize:16, pointerEvents:"none" }}>🔍</span>
        <input value={query} onChange={handleChange} onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search parts, part numbers, models..."
          style={{ width:"100%", padding:"10px 36px 10px 38px", borderRadius:10,
            border:`1.5px solid ${open||query ? accentColor:"#334155"}`,
            background:"#1e293b", color:"#f1f5f9", fontSize:13, outline:"none",
            transition:"border-color 0.2s", boxSizing:"border-box" }} />
        {query && (
          <button onClick={handleClear} style={{ position:"absolute", right:10,
            background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:16 }}>×</button>
        )}
      </div>

      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0,
          background:"#1e293b", border:"1px solid #334155", borderRadius:10,
          boxShadow:"0 8px 32px rgba(0,0,0,0.5)", zIndex:100, maxHeight:420, overflowY:"auto" }}>
          {loading && <div style={{ padding:"14px 16px", color:"#64748b", fontSize:13 }}>Searching...</div>}
          {!loading && results.length === 0 && (
            <div style={{ padding:"14px 16px", color:"#64748b", fontSize:13 }}>No results for "{query}"</div>
          )}
          {!loading && results.map((r, i) => (
            <div key={i} onClick={() => handleSelect(r)}
              style={{ padding:"12px 16px", cursor:"pointer", borderBottom:"1px solid #0f172a", transition:"background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background="#0f172a"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color:"#f1f5f9", fontSize:13 }}>
                    {categoryIcons[r.category] || "🔧"} {highlightMatch(r.part_name, query)}
                  </div>
                  <div style={{ fontSize:11, color:"#64748b", marginTop:3, display:"flex", gap:6, flexWrap:"wrap" }}>
                    <span style={{ color:"#94a3b8" }}>{r.part_number}</span>
                    <span>·</span>
                    <span style={{ color: brandColors[r.car_brand]||"#60a5fa" }}>{r.car_brand}</span>
                    <span>{r.car_model} {r.variant} {r.year}</span>
                    <span>·</span>
                    <span style={{ color:"#60a5fa" }}>{r.category}</span>
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ color:"#34d399", fontWeight:700, fontSize:14 }}>€{Number(r.price).toFixed(2)}</div>
                  <div style={{ fontSize:10, marginTop:3, fontWeight:600,
                    color: r.stock>10?"#34d399":r.stock>3?"#fbbf24":"#f87171" }}>
                    {r.stock>10?"In Stock":r.stock>3?`Low (${r.stock})`:`Last ${r.stock}`}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!loading && results.length > 0 && (
            <div style={{ padding:"8px 16px", fontSize:11, color:"#475569",
              borderTop:"1px solid #0f172a", textAlign:"center" }}>
              {results.length} result{results.length!==1?"s":""} found
            </div>
          )}
        </div>
      )}

      {selected && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0,
          background:"#1e293b", border:`1.5px solid ${accentColor}`, borderRadius:10,
          padding:"16px", zIndex:100, boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontWeight:700, color:"#f1f5f9", fontSize:15 }}>
                {categoryIcons[selected.category]} {selected.part_name}
              </div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>
                {selected.part_number} · {selected.supplier} · <span style={{color:"#60a5fa"}}>{selected.category}</span>
              </div>
              <div style={{ fontSize:12, color:"#94a3b8", marginTop:6 }}>
                <span style={{ color:brandColors[selected.car_brand]||"#60a5fa", fontWeight:600 }}>{selected.car_brand}</span>
                {" "}{selected.car_model} · {selected.variant} · {selected.year}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:22, fontWeight:800, color:"#34d399" }}>€{Number(selected.price).toFixed(2)}</div>
              <div style={{ fontSize:11, marginTop:4, fontWeight:600,
                color: selected.stock>10?"#34d399":selected.stock>3?"#fbbf24":"#f87171" }}>
                {selected.stock>10?"In Stock":selected.stock>3?`Low (${selected.stock})`:`Last ${selected.stock}`}
              </div>
            </div>
          </div>
          <button onClick={handleClear} style={{ marginTop:12, fontSize:11, color:"#64748b",
            background:"none", border:"none", cursor:"pointer", padding:0 }}>← Back to search</button>
        </div>
      )}
    </div>
  );
}

function highlightMatch(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (<>{text.slice(0,idx)}<span style={{ background:"#1d4ed8", color:"#fff", borderRadius:3, padding:"0 2px" }}>{text.slice(idx,idx+query.length)}</span>{text.slice(idx+query.length)}</>);
}

// ── Select ────────────────────────────────────────────────────────────────────
const Select = ({ label, value, onChange, options, placeholder, disabled }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:6, flex:"1 1 180px" }}>
    <label style={{ fontSize:11, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:1 }}>{label}</label>
    <select value={value||""} onChange={e=>onChange(e.target.value)} disabled={disabled||options.length===0}
      style={{ padding:"10px 14px", borderRadius:8, fontSize:14, fontWeight:500,
        border: value?"2px solid #3b82f6":"2px solid #334155",
        background: disabled||options.length===0?"#0f172a":"#1e293b",
        color: value?"#f1f5f9":"#64748b",
        cursor: disabled||options.length===0?"not-allowed":"pointer",
        appearance:"none",
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center",
        paddingRight:32, outline:"none" }}>
      <option value="" disabled>{options.length===0?"—":placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ── Cart ──────────────────────────────────────────────────────────────────────
const Cart = ({ items, onRemove }) => {
  const total = items.reduce((s,i)=>s+i.price*i.qty,0);
  if (!items.length) return null;
  return (
    <div style={{ background:"#0f172a", border:"1px solid #1e3a5f", borderRadius:14, padding:20, marginTop:24 }}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700,
        letterSpacing:1, color:"#60a5fa", marginBottom:14, textTransform:"uppercase" }}>
        🛒 Cart ({items.length} item{items.length>1?"s":""})
      </div>
      {items.map((item,i) => (
        <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"8px 0", borderBottom:"1px solid #1e293b" }}>
          <div>
            <div style={{ color:"#e2e8f0", fontSize:13, fontWeight:600 }}>{item.name}</div>
            <div style={{ color:"#64748b", fontSize:11 }}>{item.part_number} · Qty: {item.qty}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ color:"#34d399", fontWeight:700 }}>€{(item.price*item.qty).toFixed(2)}</span>
            <button onClick={()=>onRemove(i)} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:16 }}>×</button>
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
  const [brands, setBrands]       = useState([]);
  const [categories, setCategories] = useState([]);
  const [models, setModels]       = useState([]);
  const [years, setYears]         = useState([]);
  const [variants, setVariants]   = useState([]);
  const [parts, setParts]         = useState([]);

  const [brand, setBrand]         = useState(null);
  const [model, setModel]         = useState(null);
  const [year, setYear]           = useState(null);
  const [variant, setVariant]     = useState(null);
  const [category, setCategory]   = useState("All");
  const [partFilter, setPartFilter] = useState("");
  const [cart, setCart]           = useState([]);
  const [added, setAdded]         = useState(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    fetch(`${API}/brands`).then(r=>r.json()).then(setBrands);
    fetch(`${API}/categories`).then(r=>r.json()).then(setCategories);
  }, []);

  useEffect(() => {
    if (!brand) return;
    setModel(null); setYear(null); setVariant(null);
    setModels([]); setYears([]); setVariants([]); setParts([]);
    fetch(`${API}/models?brand_id=${brand.id}`).then(r=>r.json()).then(setModels);
  }, [brand]);

  useEffect(() => {
    if (!model) return;
    setYear(null); setVariant(null); setYears([]); setVariants([]); setParts([]);
    fetch(`${API}/years?model_id=${model.id}`).then(r=>r.json()).then(setYears);
  }, [model]);

  useEffect(() => {
    if (!model||!year) return;
    setVariant(null); setVariants([]); setParts([]);
    fetch(`${API}/variants?model_id=${model.id}&year=${year}`).then(r=>r.json()).then(setVariants);
  }, [year]);

  useEffect(() => {
    if (!variant) return;
    setLoading(true); setParts([]);
    const cat = category === "All" ? "" : `&category=${encodeURIComponent(category)}`;
    fetch(`${API}/parts?variant_id=${variant.id}${cat}`)
      .then(r=>r.json()).then(data=>{ setParts(data); setLoading(false); });
  }, [variant, category]);

  const filtered = partFilter.trim()
    ? parts.filter(p =>
        p.name.toLowerCase().includes(partFilter.toLowerCase()) ||
        p.part_number.toLowerCase().includes(partFilter.toLowerCase()) ||
        p.brand.toLowerCase().includes(partFilter.toLowerCase()))
    : parts;

  // Group by category when showing All
  const grouped = category === "All"
    ? filtered.reduce((acc, p) => { (acc[p.category] = acc[p.category]||[]).push(p); return acc; }, {})
    : { [category]: filtered };

  const addToCart = (part) => {
    setCart(c => {
      const ex = c.findIndex(i=>i.part_number===part.part_number);
      if (ex>=0) { const n=[...c]; n[ex]={...n[ex],qty:n[ex].qty+1}; return n; }
      return [...c, {...part, qty:1}];
    });
    setAdded(part.part_number);
    setTimeout(()=>setAdded(null), 1200);
  };

  const reset = () => {
    setBrand(null); setModel(null); setYear(null); setVariant(null);
    setModels([]); setYears([]); setVariants([]); setParts([]);
    setCategory("All"); setPartFilter("");
  };

  const accentColor = brand ? (brandColors[brand.name]||"#3b82f6") : "#3b82f6";
  const handleBrand   = val => setBrand(brands.find(x=>x.id===parseInt(val))||null);
  const handleModel   = val => setModel(models.find(x=>x.id===parseInt(val))||null);
  const handleYear    = val => setYear(parseInt(val));
  const handleVariant = val => setVariant(variants.find(x=>x.id===parseInt(val))||null);

  const PartRow = ({ p }) => (
    <div style={{ background:"#1e293b", borderRadius:10, padding:"14px 18px",
      display:"flex", alignItems:"center", gap:16, flexWrap:"wrap",
      border:"1px solid #334155",
      boxShadow: added===p.part_number?`0 0 0 2px ${accentColor}`:"none",
      transition:"box-shadow 0.2s" }}>
      <div style={{ flex:"1 1 200px" }}>
        <div style={{ fontWeight:700, color:"#f1f5f9", fontSize:14 }}>{p.name}</div>
        <div style={{ fontSize:11, color:"#64748b", marginTop:3 }}>
          {p.part_number} · <span style={{color:"#94a3b8"}}>{p.brand}</span>
          {p.notes && <> · <span style={{color:"#64748b"}}>{p.notes}</span></>}
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
        <div style={{ fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:700,
          background: p.stock>10?"#052e16":p.stock>3?"#1c1917":"#2d0000",
          color: p.stock>10?"#34d399":p.stock>3?"#fbbf24":"#f87171" }}>
          {p.stock>10?"In Stock":p.stock>3?`Low (${p.stock})`:`Last ${p.stock}`}
        </div>
        <div style={{ fontSize:18, fontWeight:800, color:"#34d399", minWidth:70, textAlign:"right" }}>
          €{Number(p.price).toFixed(2)}
        </div>
        <button onClick={()=>addToCart(p)} style={{ padding:"8px 18px", borderRadius:8,
          border:"none", cursor:"pointer", fontWeight:700, fontSize:13, whiteSpace:"nowrap",
          background: added===p.part_number?"#059669":accentColor, color:"#fff", transition:"background 0.2s" }}>
          {added===p.part_number?"✓ Added":"+ Add"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#020617", fontFamily:"'Inter',sans-serif", padding:"0 0 60px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)",
        borderBottom:"1px solid #1e293b", padding:"16px 32px",
        display:"flex", alignItems:"center", gap:24, flexWrap:"wrap" }}>
        <div style={{ flexShrink:0 }}>
          <div style={{ fontSize:22, fontWeight:800, color:"#f8fafc",
            fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:2, textTransform:"uppercase",
            cursor:brand?"pointer":"default" }} onClick={brand?reset:undefined}>
            <span style={{ color:accentColor }}>⬡</span> PartsFinder
          </div>
          <div style={{ fontSize:10, color:"#64748b", letterSpacing:2, textTransform:"uppercase" }}>
            {brand?`${brand.name} Parts`:"Multi-Brand Parts Specialist"}
          </div>
        </div>
        <div style={{ flex:1, minWidth:240 }}><SearchBar accentColor={accentColor} /></div>
        {cart.length>0 && (
          <div style={{ flexShrink:0, background:"#1e293b", border:"1px solid #334155",
            borderRadius:10, padding:"8px 16px", display:"flex", alignItems:"center", gap:8 }}>
            <span>🛒</span>
            <span style={{ color:"#f1f5f9", fontWeight:700, fontSize:13 }}>{cart.length}</span>
            <span style={{ color:"#34d399", fontWeight:700, fontSize:13 }}>
              €{cart.reduce((s,i)=>s+i.price*i.qty,0).toFixed(2)}
            </span>
          </div>
        )}
        {brand && (
          <button onClick={reset} style={{ flexShrink:0, background:"#1e293b",
            border:"1px solid #334155", color:"#94a3b8", padding:"8px 16px",
            borderRadius:8, cursor:"pointer", fontSize:12 }}>↺ Reset</button>
        )}
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"32px 24px" }}>

        {/* Vehicle selector */}
        <div style={{ background:"#0f172a", borderRadius:14, border:"1px solid #1e293b", padding:"24px", marginBottom:24 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700,
            color:"#64748b", letterSpacing:2, textTransform:"uppercase", marginBottom:16 }}>
            Find Parts For Your Vehicle
          </div>
          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
            <Select label="Brand"          value={brand?.id}   onChange={handleBrand}
              placeholder="Select brand..."   options={brands.map(b=>({value:b.id,label:b.name}))} />
            <Select label="Model"          value={model?.id}   onChange={handleModel}
              placeholder="Select model..."   disabled={!brand}
              options={models.map(m=>({value:m.id,label:m.name}))} />
            <Select label="Year"           value={year}        onChange={handleYear}
              placeholder="Select year..."    disabled={!model}
              options={years.map(y=>({value:y,label:y}))} />
            <Select label="Variant / Engine" value={variant?.id} onChange={handleVariant}
              placeholder="Select variant..." disabled={!year}
              options={variants.map(v=>({value:v.id,label:`${v.name} — ${v.engine}`}))} />
          </div>
        </div>

        {/* Vehicle summary + Category selector */}
        {variant && (
          <div style={{ background:"#1e293b", borderRadius:10, padding:"12px 20px",
            marginBottom:20, display:"flex", gap:24, flexWrap:"wrap", alignItems:"center",
            borderLeft:`4px solid ${accentColor}` }}>
            {[["Brand",brand?.name],["Model",model?.name],["Year",year],["Variant",variant?.name]].map(([l,v])=>(
              <div key={l}>
                <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>{l}</div>
                <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginTop:2}}>{v}</div>
              </div>
            ))}
            {/* Category dropdown */}
            <div style={{ marginLeft:"auto" }}>
              <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Category</div>
              <select value={category} onChange={e=>{ setCategory(e.target.value); setPartFilter(""); }}
                style={{ padding:"8px 32px 8px 12px", borderRadius:8, fontSize:13, fontWeight:600,
                  border:`2px solid ${accentColor}`, background:"#0f172a", color:"#f1f5f9",
                  cursor:"pointer", appearance:"none", outline:"none",
                  backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat:"no-repeat", backgroundPosition:"right 10px center" }}>
                <option value="All">📦 All Categories</option>
                {categories.map(c=>(
                  <option key={c.id} value={c.name}>{categoryIcons[c.name]||"🔧"} {c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Parts list */}
        {variant && (
          <div style={{ background:"#0f172a", borderRadius:14, border:"1px solid #1e293b", overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", background:"#1e293b",
              display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15,
                fontWeight:700, color:"#f1f5f9", letterSpacing:1, textTransform:"uppercase" }}>
                {categoryIcons[category]||"📦"} {category === "All" ? "All Parts" : category}
              </span>
              <input value={partFilter} onChange={e=>setPartFilter(e.target.value)}
                placeholder="Filter listed parts..."
                style={{ padding:"8px 14px", borderRadius:8, border:"1px solid #334155",
                  background:"#0f172a", color:"#f1f5f9", fontSize:13, width:240, outline:"none" }} />
            </div>

            <div style={{ padding:16, display:"flex", flexDirection:"column", gap:16 }}>
              {loading && <div style={{color:"#64748b",padding:20,textAlign:"center"}}>Loading parts...</div>}

              {!loading && Object.entries(grouped).map(([catName, catParts]) => (
                <div key={catName}>
                  {category === "All" && (
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                      <span style={{ fontSize:16 }}>{categoryIcons[catName]||"🔧"}</span>
                      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14,
                        fontWeight:700, color:"#94a3b8", letterSpacing:1, textTransform:"uppercase" }}>
                        {catName}
                      </span>
                      <div style={{ flex:1, height:1, background:"#1e293b" }} />
                      <span style={{ fontSize:11, color:"#475569" }}>{catParts.length} parts</span>
                    </div>
                  )}
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {catParts.map((p,i) => <PartRow key={i} p={p} />)}
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
          <div style={{ textAlign:"center", padding:"60px 20px" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🔧</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20,
              fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:"#475569" }}>
              Select your vehicle above or search in the header
            </div>
          </div>
        )}

        <Cart items={cart} onRemove={i=>setCart(c=>c.filter((_,j)=>j!==i))} />
      </div>
    </div>
  );
}
