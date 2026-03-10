import { useState } from "react";

const Input = ({ label, value, onChange, required, placeholder, type="text" }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
    <label style={{ fontSize:11, color:"#64748b", textTransform:"uppercase",
      letterSpacing:1, fontWeight:600 }}>
      {label}{required && <span style={{color:"#ef4444"}}> *</span>}
    </label>
    <input type={type} value={value} onChange={e=>onChange(e.target.value)}
      placeholder={placeholder}
      style={{ padding:"10px 14px", borderRadius:8, border:"1px solid #334155",
        background:"#1e293b", color:"#f1f5f9", fontSize:13, outline:"none" }} />
  </div>
);

export default function Checkout({ onSuccess, onBack }) {
  const [cart] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('checkout_cart') || '[]'); }
    catch { return []; }
  });
  const [step, setStep] = useState(1); // 1=details, 2=review, 3=pay, 4=done
  const [customer, setCustomer] = useState({
    name:"", email:"", phone:"", address:"", city:"", postcode:"", country:"", notes:""
  });
  const [error, setError] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePlaceOrder = async () => {
    setLoading(true); setError("");
    const res = await fetch("/api/orders", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        customer,
        items: cart.map(i => ({
          part_number: i.part_number, name: i.name,
          brand: i.brand, price: i.price, qty: i.qty
        })),
        paypal_id: "MANUAL",
      })
    });
    const data = await res.json();
    if (data.ok) {
      setOrderRef(data.reference);
      setStep(4);
      sessionStorage.removeItem('checkout_cart');
    } else {
      setError("Order could not be saved. Please try again.");
    }
    setLoading(false);
  };

  const total = cart.reduce((s,i) => s + i.price * i.qty, 0);
  const set = (k) => (v) => setCustomer(c => ({...c, [k]:v}));

  const validateStep1 = () => {
    const { name, email, phone, address, city, postcode, country } = customer;
    if (!name||!email||!phone||!address||!city||!postcode||!country) {
      setError("Please fill in all required fields."); return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address."); return false;
    }
    setError(""); return true;
  };



  return (
    <div style={{ minHeight:"100vh", background:"#020617", fontFamily:"'Inter',sans-serif",
      padding:"0 0 60px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)",
        borderBottom:"1px solid #1e293b", padding:"16px 32px",
        display:"flex", alignItems:"center", gap:16 }}>
        <button onClick={onBack} style={{ background:"none", border:"none",
          color:"#64748b", cursor:"pointer", fontSize:13 }}>← Back to shop</button>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20,
          fontWeight:800, color:"#f8fafc", letterSpacing:2, textTransform:"uppercase" }}>
          ⬡ Checkout
        </div>
      </div>

      <div style={{ maxWidth:760, margin:"0 auto", padding:"32px 24px" }}>

        {/* Step indicators */}
        {step < 4 && (
          <div style={{ display:"flex", gap:8, marginBottom:32, alignItems:"center" }}>
            {[["1","Details"],["2","Review"],["3","Payment"]].map(([n,label],i) => (
              <div key={n} style={{ display:"flex", alignItems:"center", gap:8 }}>
                {i > 0 && <div style={{ width:32, height:1, background:"#334155" }} />}
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", display:"flex",
                    alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700,
                    background: step===i+1?"#2563eb":step>i+1?"#10b981":"#1e293b",
                    color: step>=i+1?"#fff":"#64748b" }}>{step>i+1?"✓":n}</div>
                  <span style={{ fontSize:13, color: step===i+1?"#f1f5f9":"#64748b",
                    fontWeight: step===i+1?600:400 }}>{label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 1 — Customer details */}
        {step === 1 && (
          <div style={{ background:"#0f172a", borderRadius:14, border:"1px solid #1e293b", padding:28 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:700,
              color:"#f1f5f9", letterSpacing:1, textTransform:"uppercase", marginBottom:24 }}>
              Your Details
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
              <Input label="Full Name"  value={customer.name}     onChange={set("name")}     required />
              <Input label="Email"      value={customer.email}    onChange={set("email")}    required type="email" />
              <Input label="Phone"      value={customer.phone}    onChange={set("phone")}    required type="tel" />
            </div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700,
              color:"#64748b", letterSpacing:1, textTransform:"uppercase", margin:"20px 0 16px" }}>
              Shipping Address
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:16, marginBottom:16 }}>
              <Input label="Street Address" value={customer.address}  onChange={set("address")}  required />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:16 }}>
              <Input label="City"       value={customer.city}     onChange={set("city")}     required />
              <Input label="Postcode"   value={customer.postcode} onChange={set("postcode")} required />
              <Input label="Country"    value={customer.country}  onChange={set("country")}  required />
            </div>
            <Input label="Order Notes (optional)" value={customer.notes} onChange={set("notes")}
              placeholder="Special instructions, delivery notes..." />

            {error && <div style={{ color:"#f87171", fontSize:13, marginTop:16 }}>{error}</div>}

            <button onClick={() => validateStep1() && setStep(2)}
              style={{ marginTop:24, padding:"12px 32px", borderRadius:8, border:"none",
                background:"#2563eb", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}>
              Continue to Review →
            </button>
          </div>
        )}

        {/* Step 2 — Review order */}
        {step === 2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* Cart items */}
            <div style={{ background:"#0f172a", borderRadius:14, border:"1px solid #1e293b", padding:24 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:700,
                color:"#f1f5f9", letterSpacing:1, textTransform:"uppercase", marginBottom:20 }}>
                Order Summary
              </div>
              {cart.map((item,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", padding:"10px 0", borderBottom:"1px solid #1e293b" }}>
                  <div>
                    <div style={{ color:"#f1f5f9", fontSize:13, fontWeight:600 }}>{item.name}</div>
                    <div style={{ color:"#64748b", fontSize:11 }}>{item.part_number} · {item.brand} · Qty: {item.qty}</div>
                  </div>
                  <div style={{ color:"#34d399", fontWeight:700 }}>€{(item.price*item.qty).toFixed(2)}</div>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:16,
                fontSize:20, fontWeight:800, color:"#f1f5f9" }}>
                <span>Total</span>
                <span style={{ color:"#34d399" }}>€{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Shipping details */}
            <div style={{ background:"#0f172a", borderRadius:14, border:"1px solid #1e293b", padding:24 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700,
                color:"#f1f5f9", letterSpacing:1, textTransform:"uppercase", marginBottom:16 }}>
                Shipping To
              </div>
              <div style={{ color:"#94a3b8", fontSize:13, lineHeight:1.8 }}>
                <div>{customer.name}</div>
                <div>{customer.email} · {customer.phone}</div>
                <div>{customer.address}</div>
                <div>{customer.city}, {customer.postcode}</div>
                <div>{customer.country}</div>
                {customer.notes && <div style={{marginTop:8,color:"#64748b"}}>Note: {customer.notes}</div>}
              </div>
              <button onClick={()=>setStep(1)} style={{ marginTop:12, background:"none",
                border:"none", color:"#60a5fa", cursor:"pointer", fontSize:12 }}>
                ← Edit details
              </button>
            </div>

            <button onClick={()=>setStep(3)}
              style={{ padding:"14px", borderRadius:8, border:"none",
                background:"#2563eb", color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer" }}>
              Proceed to Payment →
            </button>
          </div>
        )}

        {/* Step 3 — Place order */}
        {step === 3 && (
          <div style={{ background:"#0f172a", borderRadius:14, border:"1px solid #1e293b", padding:28 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:700,
              color:"#f1f5f9", letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>
              Confirm Order
            </div>
            <div style={{ color:"#64748b", fontSize:13, marginBottom:24 }}>
              Total to pay: <span style={{ color:"#34d399", fontWeight:700, fontSize:18 }}>€{total.toFixed(2)}</span>
            </div>

            {error && <div style={{ color:"#f87171", fontSize:13, marginBottom:16 }}>{error}</div>}

            <button onClick={handlePlaceOrder} disabled={loading}
              style={{ width:"100%", padding:"14px", borderRadius:8, border:"none",
                background: loading?"#1e293b":"#2563eb", color: loading?"#475569":"#fff",
                fontWeight:700, fontSize:15, cursor: loading?"not-allowed":"pointer" }}>
              {loading ? "Placing Order..." : "✓ Place Order"}
            </button>

            <button onClick={()=>setStep(2)} style={{ marginTop:16, background:"none",
              border:"none", color:"#64748b", cursor:"pointer", fontSize:12 }}>
              ← Back to review
            </button>
          </div>
        )}

        {/* Step 4 — Confirmation */}
        {step === 4 && (
          <div style={{ background:"#0f172a", borderRadius:14, border:"1px solid #10b981",
            padding:40, textAlign:"center" }}>
            <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:800,
              color:"#f1f5f9", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>
              Order Confirmed!
            </div>
            <div style={{ color:"#64748b", fontSize:14, marginBottom:24 }}>
              Thank you, {customer.name}! A confirmation email has been sent to <strong style={{color:"#94a3b8"}}>{customer.email}</strong>.
            </div>
            <div style={{ background:"#1e293b", borderRadius:10, padding:"16px 24px",
              display:"inline-block", marginBottom:24 }}>
              <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:1 }}>Order Reference</div>
              <div style={{ fontSize:22, fontWeight:800, color:"#34d399", marginTop:4 }}>{orderRef}</div>
            </div>
            <div style={{ color:"#64748b", fontSize:13, marginBottom:32 }}>
              We'll be in touch with shipping details shortly.
            </div>
            <button onClick={onBack}
              style={{ padding:"12px 32px", borderRadius:8, border:"none",
                background:"#2563eb", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}>
              ← Back to Shop
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
