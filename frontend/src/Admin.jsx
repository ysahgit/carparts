import { useState, useEffect, useCallback } from "react";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs";

const API = "/api/admin";

const brandColors = {
  BMW:"#0066CC", Audi:"#BB0A21", Volkswagen:"#1B6DB5", Toyota:"#EB0A1E"
};

const categoryIcons = {
  Brakes:"🛑", Suspension:"🔩", Filters:"🌀", Exhausts:"💨", Clutch:"⚙️", Steering:"🎯"
};

// ── Login ─────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true); setErr("");
    const res = await fetch("/api/admin/login", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ password: pw })
    });
    if (res.ok) { onLogin(pw); }
    else { setErr("Wrong password"); setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#020617", display:"flex",
      alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif" }}>
      <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16,
        padding:"40px 48px", width:340, textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:8 }}>🔒</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:800,
          color:"#f1f5f9", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>
          Admin Panel
        </div>
        <div style={{ fontSize:12, color:"#475569", marginBottom:28 }}>PartsFinder Management</div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&submit()}
          placeholder="Enter admin password"
          style={{ width:"100%", padding:"12px 14px", borderRadius:8, border:"1px solid #334155",
            background:"#1e293b", color:"#f1f5f9", fontSize:14, outline:"none",
            boxSizing:"border-box", marginBottom:12 }} />
        {err && <div style={{ color:"#f87171", fontSize:13, marginBottom:10 }}>{err}</div>}
        <button onClick={submit} disabled={loading||!pw}
          style={{ width:"100%", padding:"12px", borderRadius:8, border:"none",
            background: pw?"#2563eb":"#1e293b", color: pw?"#fff":"#475569",
            fontWeight:700, fontSize:14, cursor:pw?"pointer":"default" }}>
          {loading ? "Checking..." : "Login"}
        </button>
      </div>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────
const Input = ({ label, value, onChange, type="text", style={} }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:5, ...style }}>
    {label && <label style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)}
      style={{ padding:"9px 12px", borderRadius:7, border:"1px solid #334155",
        background:"#0f172a", color:"#f1f5f9", fontSize:13, outline:"none" }} />
  </div>
);

const Sel = ({ label, value, onChange, options, style={} }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:5, ...style }}>
    {label && <label style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ padding:"9px 12px", borderRadius:7, border:"1px solid #334155",
        background:"#0f172a", color:"#f1f5f9", fontSize:13, outline:"none",
        appearance:"none",
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat:"no-repeat", backgroundPosition:"right 10px center", paddingRight:28 }}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Btn = ({ children, onClick, variant="primary", disabled=false, small=false }) => {
  const bg = variant==="primary"?"#2563eb":variant==="danger"?"#dc2626":variant==="success"?"#059669":"#334155";
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: small?"5px 12px":"9px 18px", borderRadius:7, border:"none",
        background: disabled?"#1e293b":bg, color: disabled?"#475569":"#fff",
        fontWeight:600, fontSize: small?12:13, cursor:disabled?"not-allowed":"pointer",
        whiteSpace:"nowrap", transition:"opacity 0.15s" }}>
      {children}
    </button>
  );
};

// ── Parts Tab ─────────────────────────────────────────────────────────────────
async function exportToExcel(token) {
  const headers = { "x-admin-token": token };
  let allParts = [], page = 1;
  while (true) {
    const data = await fetch(`${API}/parts?page=${page}&limit=500`, { headers }).then(r=>r.json());
    allParts = [...allParts, ...data];
    if (data.length < 500) break;
    page++;
  }
  const rows = allParts.map(p => ({
    ID: p.id, "Part Name": p.name, "Part No.": p.part_number,
    Category: p.category, "Car Brand": p.car_brand, Model: p.car_model,
    Variant: p.variant, "Price (€)": Number(p.price), Stock: p.stock,
    Supplier: p.brand, Notes: p.notes || "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{wch:6},{wch:30},{wch:18},{wch:14},{wch:12},{wch:14},{wch:16},{wch:10},{wch:8},{wch:16},{wch:24}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Parts");
  XLSX.writeFile(wb, `parts-export-${new Date().toISOString().slice(0,10)}.xlsx`);
}

async function importFromExcel(file, token, onProgress, onDone) {
  const headers = { "x-admin-token": token };
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  let updated = 0, errors = 0;
  for (const row of rows) {
    const id = row["ID"];
    if (!id) { errors++; continue; }
    try {
      const res = await fetch(`${API}/parts/${id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ price: parseFloat(row["Price (€)"]), stock: parseInt(row["Stock"]), notes: row["Notes"] || "" }),
      });
      if (res.ok) updated++; else errors++;
    } catch { errors++; }
    onProgress(updated + errors, rows.length);
  }
  onDone(updated, errors);
}

function PartsTab({ token, categories }) {
  const [parts, setParts]       = useState([]);
  const [search, setSearch]     = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [page, setPage]         = useState(1);
  const [editing, setEditing]   = useState({});
  const [saving, setSaving]     = useState(null);
  const [msg, setMsg]           = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);

  const headers = { "x-admin-token": token };

  const load = useCallback(() => {
    const params = new URLSearchParams({ page, limit:30 });
    if (search) params.set("search", search);
    if (catFilter) params.set("category", catFilter);
    fetch(`${API}/parts?${params}`, { headers })
      .then(r=>r.json()).then(setParts);
  }, [search, catFilter, page, token]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (p) => setEditing(e => ({
    ...e, [p.id]: { price: p.price, stock: p.stock, notes: p.notes||"" }
  }));

  const saveEdit = async (id) => {
    setSaving(id);
    await fetch(`${API}/parts/${id}`, {
      method:"PATCH", headers:{...headers,"Content-Type":"application/json"},
      body: JSON.stringify(editing[id])
    });
    setSaving(null);
    setEditing(e=>{ const n={...e}; delete n[id]; return n; });
    setMsg("✓ Saved"); setTimeout(()=>setMsg(""),2000);
    load();
  };

  const deletePart = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await fetch(`${API}/parts/${id}`, { method:"DELETE", headers });
    setMsg("✓ Deleted"); setTimeout(()=>setMsg(""),2000);
    load();
  };

  const handleExport = async () => {
    setMsg("Exporting...");
    await exportToExcel(token);
    setMsg("✓ Exported!"); setTimeout(()=>setMsg(""),3000);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setImporting(true); setImportProgress({ done:0, total:0 });
    await importFromExcel(file, token,
      (done, total) => setImportProgress({ done, total }),
      (updated, errors) => {
        setImporting(false); setImportProgress(null);
        setMsg(`✓ Import done: ${updated} updated, ${errors} errors`);
        setTimeout(()=>setMsg(""),5000); load();
        }
      );
      e.target.value = "";
    };

  return (
    <div>
      {/* Filters */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"flex-end" }}>
        <Input label="Search" value={search} onChange={v=>{setSearch(v);setPage(1);}}
          style={{ flex:"1 1 200px" }} />
        <Sel label="Category" value={catFilter} onChange={v=>{setCatFilter(v);setPage(1);}}
          style={{ flex:"0 0 180px" }}
          options={[{value:"",label:"All categories"},...categories.map(c=>({value:c.name,label:`${categoryIcons[c.name]||""} ${c.name}`}))]} />
        {msg && <div style={{ color:"#34d399", fontSize:13, fontWeight:600 }}>{msg}</div>}
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:"1px solid #334155" }}>
              {["Part","Part No.","Category","Vehicle","Price (€)","Stock","Notes",""].map(h=>(
                <th key={h} style={{ padding:"10px 12px", textAlign:"left", color:"#64748b",
                  fontSize:11, textTransform:"uppercase", letterSpacing:1, fontWeight:600,
                  whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parts.map(p => {
              const ed = editing[p.id];
              return (
                <tr key={p.id} style={{ borderBottom:"1px solid #1e293b",
                  background: ed?"#1a2744":"transparent" }}>
                  <td style={{ padding:"10px 12px", color:"#f1f5f9", fontWeight:600 }}>{p.name}</td>
                  <td style={{ padding:"10px 12px", color:"#64748b", fontFamily:"monospace", fontSize:11 }}>{p.part_number}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20,
                      background:"#1e293b", color:"#94a3b8" }}>
                      {categoryIcons[p.category]||""} {p.category}
                    </span>
                  </td>
                  <td style={{ padding:"10px 12px", fontSize:11 }}>
                    <span style={{ color: brandColors[p.car_brand]||"#60a5fa", fontWeight:600 }}>{p.car_brand}</span>
                    {" "}<span style={{ color:"#94a3b8" }}>{p.car_model}</span>
                    {" "}<span style={{ color:"#64748b" }}>{p.variant}</span>
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    {ed ? (
                      <input type="number" value={ed.price} step="0.01"
                        onChange={e=>setEditing(ev=>({...ev,[p.id]:{...ev[p.id],price:e.target.value}}))}
                        style={{ width:80, padding:"4px 8px", borderRadius:6, border:"1px solid #3b82f6",
                          background:"#0f172a", color:"#f1f5f9", fontSize:13, outline:"none" }} />
                    ) : (
                      <span style={{ color:"#34d399", fontWeight:700 }}>€{Number(p.price).toFixed(2)}</span>
                    )}
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    {ed ? (
                      <input type="number" value={ed.stock}
                        onChange={e=>setEditing(ev=>({...ev,[p.id]:{...ev[p.id],stock:e.target.value}}))}
                        style={{ width:70, padding:"4px 8px", borderRadius:6, border:"1px solid #3b82f6",
                          background:"#0f172a", color:"#f1f5f9", fontSize:13, outline:"none" }} />
                    ) : (
                      <span style={{ color: p.stock>10?"#34d399":p.stock>3?"#fbbf24":"#f87171", fontWeight:600 }}>{p.stock}</span>
                    )}
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    {ed ? (
                      <input value={ed.notes}
                        onChange={e=>setEditing(ev=>({...ev,[p.id]:{...ev[p.id],notes:e.target.value}}))}
                        style={{ width:120, padding:"4px 8px", borderRadius:6, border:"1px solid #3b82f6",
                          background:"#0f172a", color:"#f1f5f9", fontSize:13, outline:"none" }} />
                    ) : (
                      <span style={{ color:"#64748b" }}>{p.notes}</span>
                    )}
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      {ed ? (
                        <>
                          <Btn small variant="success" onClick={()=>saveEdit(p.id)} disabled={saving===p.id}>
                            {saving===p.id?"...":"Save"}
                          </Btn>
                          <Btn small variant="ghost" onClick={()=>setEditing(e=>{const n={...e};delete n[p.id];return n;})}>
                            Cancel
                          </Btn>
                        </>
                      ) : (
                        <>
                          <Btn small onClick={()=>startEdit(p)}>Edit</Btn>
                          <Btn small variant="danger" onClick={()=>deletePart(p.id, p.name)}>Del</Btn>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display:"flex", gap:10, marginTop:16, alignItems:"center" }}>
        <Btn small variant="ghost" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</Btn>
        <span style={{ color:"#64748b", fontSize:13 }}>Page {page}</span>
        <Btn small variant="ghost" onClick={()=>setPage(p=>p+1)} disabled={parts.length<30}>Next →</Btn>
      </div>
    </div>
  );
}

// ── Add Part Tab ──────────────────────────────────────────────────────────────
function AddPartTab({ token, categories, brands }) {
  const headers = { "x-admin-token": token };
  const [brandId, setBrandId]     = useState("");
  const [modelId, setModelId]     = useState("");
  const [year, setYear]           = useState("");
  const [variantId, setVariantId] = useState("");
  const [catId, setCatId]         = useState("");
  const [name, setName]           = useState("");
  const [partNo, setPartNo]       = useState("");
  const [price, setPrice]         = useState("");
  const [stock, setStock]         = useState("");
  const [brand, setBrand]         = useState("");
  const [notes, setNotes]         = useState("");
  const [models, setModels]       = useState([]);
  const [years, setYears]         = useState([]);
  const [variants, setVariants]   = useState([]);
  const [msg, setMsg]             = useState("");

  useEffect(() => {
    if (!brandId) return;
    fetch(`/api/models?brand_id=${brandId}`).then(r=>r.json()).then(setModels);
    setModelId(""); setYear(""); setVariantId("");
  }, [brandId]);

  useEffect(() => {
    if (!modelId) return;
    fetch(`/api/years?model_id=${modelId}`).then(r=>r.json()).then(setYears);
    setYear(""); setVariantId("");
  }, [modelId]);

  useEffect(() => {
    if (!modelId||!year) return;
    fetch(`/api/variants?model_id=${modelId}&year=${year}`).then(r=>r.json()).then(setVariants);
    setVariantId("");
  }, [year]);

  const submit = async () => {
    if (!variantId||!catId||!name||!partNo||!price||!stock||!brand) {
      setMsg("⚠ Please fill all required fields"); return;
    }
    const res = await fetch(`${API}/parts`, {
      method:"POST", headers:{...headers,"Content-Type":"application/json"},
      body: JSON.stringify({ variant_id:parseInt(variantId), category_id:parseInt(catId),
        name, part_number:partNo, price:parseFloat(price), stock:parseInt(stock), brand, notes })
    });
    if (res.ok) {
      setMsg("✓ Part added!");
      setName(""); setPartNo(""); setPrice(""); setStock(""); setBrand(""); setNotes("");
    } else setMsg("✗ Error adding part");
    setTimeout(()=>setMsg(""),3000);
  };

  return (
    <div style={{ maxWidth:700 }}>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700,
        color:"#94a3b8", letterSpacing:1, textTransform:"uppercase", marginBottom:20 }}>
        Add New Part
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
        <Sel label="Car Brand *" value={brandId} onChange={setBrandId}
          options={[{value:"",label:"Select brand..."},...brands.map(b=>({value:b.id,label:b.name}))]} />
        <Sel label="Model *" value={modelId} onChange={setModelId}
          options={[{value:"",label:"Select model..."},...models.map(m=>({value:m.id,label:m.name}))]} />
        <Sel label="Year *" value={year} onChange={setYear}
          options={[{value:"",label:"Select year..."},...years.map(y=>({value:y,label:y}))]} />
        <Sel label="Variant *" value={variantId} onChange={setVariantId}
          options={[{value:"",label:"Select variant..."},...variants.map(v=>({value:v.id,label:`${v.name} — ${v.engine}`}))]} />
        <Sel label="Category *" value={catId} onChange={setCatId}
          options={[{value:"",label:"Select category..."},...categories.map(c=>({value:c.id,label:`${categoryIcons[c.name]||""} ${c.name}`}))]} />
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          <label style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>Excel</label>
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="success" small onClick={handleExport}>⬇ Export</Btn>
            <label style={{ padding:"5px 12px", borderRadius:7, background:"#d97706", color:"#fff",
              fontWeight:600, fontSize:12, cursor:"pointer" }}>
              ⬆ Import
              <input type="file" accept=".xlsx" onChange={handleImport} style={{ display:"none" }} />
            </label>
          </div>
        </div>
        {importProgress && <div style={{ fontSize:13, color:"#60a5fa" }}>Importing... {importProgress.done}/{importProgress.total}</div>}
        <Input label="Supplier Brand *" value={brand} onChange={setBrand} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:14 }}>
        <Input label="Part Number *" value={partNo} onChange={setPartNo} />
        <Input label="Price (€) *" value={price} onChange={setPrice} type="number" />
        <Input label="Stock *" value={stock} onChange={setStock} type="number" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
        <Input label="Part Name *" value={name} onChange={setName} />
        <Input label="Notes" value={notes} onChange={setNotes} />
      </div>

      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
        <Btn onClick={submit}>+ Add Part</Btn>
        {msg && <span style={{ color: msg.startsWith("✓")?"#34d399":"#f87171", fontSize:13 }}>{msg}</span>}
      </div>
    </div>
  );
}

// ── Models & Variants Tab ─────────────────────────────────────────────────────
function ModelsTab({ token, brands }) {
  const headers = { "x-admin-token": token };
  const [models, setModels] = useState([]);
  const [msg, setMsg]       = useState("");

  // New model form
  const [newBrandId, setNewBrandId] = useState("");
  const [newModelName, setNewModelName] = useState("");

  // New variant form
  const [varModelId, setVarModelId]   = useState("");
  const [varName, setVarName]         = useState("");
  const [varEngine, setVarEngine]     = useState("");

  const loadModels = () =>
    fetch(`${API}/models`, { headers }).then(r=>r.json()).then(setModels);

  useEffect(() => { loadModels(); }, []);

  const addModel = async () => {
    if (!newBrandId||!newModelName) { setMsg("⚠ Fill all fields"); return; }
    const res = await fetch(`${API}/models`, {
      method:"POST", headers:{...headers,"Content-Type":"application/json"},
      body: JSON.stringify({ brand_id:parseInt(newBrandId), name:newModelName })
    });
    if (res.ok) {
      setMsg("✓ Model added (years 2018–2025 created)");
      setNewModelName(""); loadModels();
    } else setMsg("✗ Error");
    setTimeout(()=>setMsg(""),3000);
  };

  const addVariant = async () => {
    if (!varModelId||!varName||!varEngine) { setMsg("⚠ Fill all fields"); return; }
    const res = await fetch(`${API}/variants`, {
      method:"POST", headers:{...headers,"Content-Type":"application/json"},
      body: JSON.stringify({ model_id:parseInt(varModelId), name:varName, engine:varEngine })
    });
    if (res.ok) {
      const data = await res.json();
      setMsg(`✓ Variant added across ${data.count} year entries`);
      setVarName(""); setVarEngine(""); loadModels();
    } else setMsg("✗ Error");
    setTimeout(()=>setMsg(""),3000);
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>

      {/* Add Model */}
      <div style={{ background:"#0f172a", borderRadius:12, border:"1px solid #1e293b", padding:20 }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700,
          color:"#94a3b8", letterSpacing:1, textTransform:"uppercase", marginBottom:16 }}>
          Add New Model
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Sel label="Brand *" value={newBrandId} onChange={setNewBrandId}
            options={[{value:"",label:"Select brand..."},...brands.map(b=>({value:b.id,label:b.name}))]} />
          <Input label="Model Name *" value={newModelName} onChange={setNewModelName} />
          <Btn onClick={addModel}>+ Add Model</Btn>
        </div>
      </div>

      {/* Add Variant */}
      <div style={{ background:"#0f172a", borderRadius:12, border:"1px solid #1e293b", padding:20 }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700,
          color:"#94a3b8", letterSpacing:1, textTransform:"uppercase", marginBottom:16 }}>
          Add New Variant
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Sel label="Model *" value={varModelId} onChange={setVarModelId}
            options={[{value:"",label:"Select model..."},...models.map(m=>({value:m.id,label:`${m.brand} ${m.name}`}))]} />
          <Input label="Variant Name * (e.g. 320d)" value={varName} onChange={setVarName} />
          <Input label="Engine * (e.g. 2.0L 4-cyl Diesel)" value={varEngine} onChange={setVarEngine} />
          <Btn onClick={addVariant}>+ Add Variant</Btn>
        </div>
      </div>

      {/* Models list */}
      <div style={{ gridColumn:"1/-1", background:"#0f172a", borderRadius:12,
        border:"1px solid #1e293b", padding:20 }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700,
          color:"#94a3b8", letterSpacing:1, textTransform:"uppercase", marginBottom:16 }}>
          All Models ({models.length})
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8 }}>
          {models.map(m => (
            <div key={m.id} style={{ background:"#1e293b", borderRadius:8, padding:"10px 14px",
              border:"1px solid #334155" }}>
              <div style={{ fontWeight:700, color:"#f1f5f9", fontSize:13 }}>{m.name}</div>
              <div style={{ fontSize:11, color: brandColors[m.brand]||"#60a5fa", marginTop:2 }}>{m.brand}</div>
              <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{m.variant_count} variants</div>
            </div>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{ gridColumn:"1/-1", color: msg.startsWith("✓")?"#34d399":"#f87171",
          fontSize:13, fontWeight:600 }}>{msg}</div>
      )}
    </div>
  );
}

// ── Main Admin ────────────────────────────────────────────────────────────────
export default function Admin() {
  const [token, setToken]       = useState(localStorage.getItem("admin_token")||"");
  const [tab, setTab]           = useState("parts");
  const [categories, setCategories] = useState([]);
  const [brands, setBrands]     = useState([]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/categories").then(r=>r.json()).then(setCategories);
    fetch("/api/brands").then(r=>r.json()).then(setBrands);
  }, [token]);

  const handleLogin = (pw) => {
    localStorage.setItem("admin_token", pw);
    setToken(pw);
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    setToken("");
  };

  if (!token) return <Login onLogin={handleLogin} />;

  const tabs = [
    { id:"parts",   label:"📋 Parts" },
    { id:"add",     label:"➕ Add Part" },
    { id:"models",  label:"🚗 Models & Variants" },
    { id:"orders",  label:"🛒 Orders" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#020617", fontFamily:"'Inter',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background:"#0f172a", borderBottom:"1px solid #1e293b",
        padding:"14px 32px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:800,
            color:"#f1f5f9", letterSpacing:2, textTransform:"uppercase" }}>
            ⬡ PartsFinder
          </span>
          <span style={{ marginLeft:12, fontSize:12, color:"#475569",
            background:"#1e293b", padding:"2px 10px", borderRadius:20 }}>Admin</span>
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <a href="/" style={{ fontSize:12, color:"#64748b", textDecoration:"none" }}>← View Shop</a>
          <button onClick={logout} style={{ background:"none", border:"1px solid #334155",
            color:"#94a3b8", padding:"6px 14px", borderRadius:7, cursor:"pointer", fontSize:12 }}>
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:"#0f172a", borderBottom:"1px solid #1e293b",
        padding:"0 32px", display:"flex", gap:4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"12px 18px", border:"none", background:"none", cursor:"pointer",
            fontSize:13, fontWeight:600,
            color: tab===t.id?"#f1f5f9":"#64748b",
            borderBottom: tab===t.id?"2px solid #3b82f6":"2px solid transparent",
            transition:"all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding:"28px 32px" }}>
        {tab==="parts"  && <PartsTab token={token} categories={categories} />}
        {tab==="add"    && <AddPartTab token={token} categories={categories} brands={brands} />}
        {tab==="models" && <ModelsTab token={token} brands={brands} />}
        {tab==="orders" && <OrdersTab token={token} />}
      </div>
    </div>
  );
}

// ── Orders Tab (append to existing Admin.jsx) ─────────────────────────────────
export function OrdersTab({ token }) {
  const headers = { "x-admin-token": token };
  const [orders, setOrders]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [msg, setMsg] = useState("");

  const statuses = ["pending","paid","processing","shipped","complete","cancelled"];
  const statusColors = {
    pending:"#fbbf24", paid:"#60a5fa", processing:"#a78bfa",
    shipped:"#34d399", complete:"#10b981", cancelled:"#f87171"
  };

  const load = () => {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    fetch(`/api/admin/orders${params}`, { headers })
      .then(r=>r.json()).then(setOrders);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const loadDetail = (id) => {
    fetch(`/api/admin/orders/${id}`, { headers })
      .then(r=>r.json()).then(setSelected);
  };

  const updateStatus = async (id, status) => {
    await fetch(`/api/admin/orders/${id}`, {
      method:"PATCH", headers:{...headers,"Content-Type":"application/json"},
      body: JSON.stringify({ status })
    });
    setMsg("✓ Status updated");
    setTimeout(()=>setMsg(""),2000);
    load();
    if (selected?.id === id) setSelected(s => ({...s, status}));
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns: selected?"1fr 380px":"1fr", gap:20 }}>
      {/* Orders list */}
      <div>
        <div style={{ display:"flex", gap:12, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
            style={{ padding:"8px 12px", borderRadius:7, border:"1px solid #334155",
              background:"#0f172a", color:"#f1f5f9", fontSize:13, outline:"none" }}>
            <option value="">All statuses</option>
            {statuses.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          {msg && <span style={{color:"#34d399",fontSize:13,fontWeight:600}}>{msg}</span>}
        </div>

        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:"1px solid #334155" }}>
              {["Reference","Customer","Total","Status","Date",""].map(h=>(
                <th key={h} style={{ padding:"10px 12px", textAlign:"left", color:"#64748b",
                  fontSize:11, textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(o=>(
              <tr key={o.id} style={{ borderBottom:"1px solid #1e293b",
                background: selected?.id===o.id?"#1a2744":"transparent",
                cursor:"pointer" }} onClick={()=>loadDetail(o.id)}>
                <td style={{ padding:"10px 12px", color:"#60a5fa", fontFamily:"monospace", fontSize:12 }}>{o.reference}</td>
                <td style={{ padding:"10px 12px" }}>
                  <div style={{color:"#f1f5f9",fontWeight:600}}>{o.name}</div>
                  <div style={{color:"#64748b",fontSize:11}}>{o.email}</div>
                </td>
                <td style={{ padding:"10px 12px", color:"#34d399", fontWeight:700 }}>€{Number(o.total).toFixed(2)}</td>
                <td style={{ padding:"10px 12px" }}>
                  <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:600,
                    background:"#1e293b", color: statusColors[o.status]||"#94a3b8" }}>
                    {o.status}
                  </span>
                </td>
                <td style={{ padding:"10px 12px", color:"#64748b", fontSize:11 }}>{o.created_at?.slice(0,16)}</td>
                <td style={{ padding:"10px 12px" }}>
                  <select value={o.status}
                    onClick={e=>e.stopPropagation()}
                    onChange={e=>updateStatus(o.id, e.target.value)}
                    style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #334155",
                      background:"#0f172a", color:"#f1f5f9", fontSize:11, outline:"none" }}>
                    {statuses.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {orders.length===0 && (
              <tr><td colSpan={6} style={{padding:24,color:"#475569",textAlign:"center"}}>No orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Order detail panel */}
      {selected && (
        <div style={{ background:"#0f172a", borderRadius:12, border:"1px solid #1e293b", padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700,
              color:"#f1f5f9", letterSpacing:1, textTransform:"uppercase" }}>Order Detail</div>
            <button onClick={()=>setSelected(null)} style={{ background:"none", border:"none",
              color:"#64748b", cursor:"pointer", fontSize:18 }}>×</button>
          </div>

          <div style={{ background:"#1e293b", borderRadius:8, padding:"10px 14px", marginBottom:16 }}>
            <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:1 }}>Reference</div>
            <div style={{ color:"#60a5fa", fontFamily:"monospace", fontWeight:700, marginTop:2 }}>{selected.reference}</div>
          </div>

          <div style={{ fontSize:13, color:"#94a3b8", lineHeight:2, marginBottom:16 }}>
            <div><span style={{color:"#64748b"}}>Name:</span> {selected.name}</div>
            <div><span style={{color:"#64748b"}}>Email:</span> {selected.email}</div>
            <div><span style={{color:"#64748b"}}>Phone:</span> {selected.phone}</div>
            <div><span style={{color:"#64748b"}}>Address:</span> {selected.address}, {selected.city} {selected.postcode}, {selected.country}</div>
            {selected.notes && <div><span style={{color:"#64748b"}}>Notes:</span> {selected.notes}</div>}
          </div>

          <div style={{ borderTop:"1px solid #1e293b", paddingTop:16, marginBottom:16 }}>
            {(selected.items||[]).map((item,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between",
                padding:"6px 0", borderBottom:"1px solid #1e293b", fontSize:12 }}>
                <div>
                  <div style={{color:"#f1f5f9",fontWeight:600}}>{item.name}</div>
                  <div style={{color:"#64748b"}}>{item.part_number} · Qty: {item.qty}</div>
                </div>
                <div style={{color:"#34d399",fontWeight:700}}>€{(item.price*item.qty).toFixed(2)}</div>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:12,
              fontSize:16, fontWeight:800, color:"#f1f5f9" }}>
              <span>Total</span>
              <span style={{color:"#34d399"}}>€{Number(selected.total).toFixed(2)}</span>
            </div>
          </div>

          <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase",
            letterSpacing:1, marginBottom:8 }}>Update Status</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {statuses.map(s=>(
              <button key={s} onClick={()=>updateStatus(selected.id,s)}
                style={{ padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer",
                  fontSize:11, fontWeight:600,
                  background: selected.status===s?"#1e3a5f":"#1e293b",
                  color: selected.status===s?(statusColors[s]||"#fff"):"#64748b",
                  outline: selected.status===s?`1px solid ${statusColors[s]||"#334155"}`:"none" }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
