import { useState, useEffect } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_BASE_URL;

// ── Auth token helpers ─────────────────────────────────────────────────────
function getToken() { return localStorage.getItem("aa_token"); }
function setToken(t: string) { localStorage.setItem("aa_token", t); }
function clearToken() { localStorage.removeItem("aa_token"); localStorage.removeItem("aa_user"); }
function getUser(): { id:string; name:string; email:string } | null {
  try { return JSON.parse(localStorage.getItem("aa_user") || "null"); } catch { return null; }
}
function saveUser(u: { id:string; name:string; email:string }) {
  localStorage.setItem("aa_user", JSON.stringify(u));
}

// Attach token to every request automatically
axios.interceptors.request.use(cfg => {
  const token = getToken();
  if (token && cfg.headers) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
// On 401, clear auth so user is redirected to login
axios.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) { clearToken(); window.location.reload(); }
    return Promise.reject(err);
  }
);

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const ACTIVITIES = [
  { title: "New product added", desc: 'Product "AK-47" has been added to inventory', time: "2 hours ago", icon: "📦" },
  { title: "Sale completed", desc: "Sale of PKR 12,500 completed successfully", time: "4 hours ago", icon: "💰" },
  { title: "Supplier updated", desc: 'Supplier "ABC Arms" information updated', time: "1 day ago", icon: "🤝" },
  { title: "Stock alert", desc: "Remington 870 running low — 3 units left", time: "2 days ago", icon: "⚠️" },
];

// ── types ──────────────────────────────────────────────────────────────────
interface LedgerEntry {
  _id: string;
  supplier: string;
  date: string;
  type: 'PURCHASE' | 'PAYMENT';
  amount: number;
  reference?: string;
  notes?: string;
  runningBalance: number;
}

interface Party {
  _id: string;
  name: string;
  phone?: string;
  address?: string;
  partyType: 'Supplier' | 'Customer' | 'Other';
  openingBalance: number;
  caseStartDate: string;
}

interface PartyLedgerEntry {
  _id: string;
  party: string;
  transactionDate: string;
  systemTimestamp: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  paymentMethod: 'Cash' | 'Online Transfer' | 'Cheque';
  notes?: string;
  runningBalance: number;
}

interface PartyLedgerData {
  party: Party;
  entries: PartyLedgerEntry[];
  currentBalance: number;
}

interface LedgerSummary {
  totalPurchases: number;
  totalPaid: number;
  balance: number;
  lastPaymentDate: string | null;
  lastTransactionDate: string | null;
}

interface Product {
  _id: string;
  productId: string;
  name: string;
  category: string;
  supplier?: { _id: string; name: string; contact: string };
  quantity: number;
  costPrice: number;
}

interface Supplier {
  _id: string;
  name: string;
  contact: string;
  address: string;
  paymentTerms: string;
}

interface SaleItem {
  product: Product;
  quantity: number;
  salePrice: number;
}

interface Sale {
  _id: string;
  voucherNumber: string;
  date: string;
  products: { product: { productId: string; name: string }; quantity: number; salePrice: number }[];
  totalAmount: number;
  profit: number;
}

// ── helpers ────────────────────────────────────────────────────────────────
function getStockStatus(qty: number) {
  if (qty === 0) return "Out of Stock";
  if (qty < 10) return "Low Stock";
  return "In Stock";
}

function useCounter(target: number, dur = 1500): number {
  const [c, setC] = useState(0);
  useEffect(() => {
    let s = 0;
    const step = Math.max(1, Math.ceil(target / (dur / 16)));
    const t = setInterval(() => {
      s += step;
      if (s >= target) { setC(target); clearInterval(t); } else setC(s);
    }, 16);
    return () => clearInterval(t);
  }, [target, dur]);
  return c;
}

function Particles() {
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
      {Array.from({length:25}).map((_,i) => (
        <div key={i} style={{
          position:"absolute",bottom:"-10px",left:`${Math.random()*100}%`,
          width:`${2+Math.random()*3}px`,height:`${2+Math.random()*3}px`,
          background:"#c9a84c",borderRadius:"50%",
          opacity:0.1+Math.random()*0.2,
          animation:`floatUp ${6+Math.random()*8}s ${Math.random()*8}s linear infinite`
        }}/>
      ))}
    </div>
  );
}

interface StatCard3DProps {
  icon: string; value: number | string; label: string; color: string; delay?: number;
}
function StatCard3D({ icon, value, label, color, delay = 0 }: StatCard3DProps) {
  const v = useCounter(typeof value === "number" ? value : 0);
  const dv = typeof value === "string" ? value
    : (label.includes("SALES") || label.includes("PROFIT") ? `PKR ${v.toLocaleString()}` : v.toLocaleString());
  return (
    <div className="sc3d" style={{animationDelay:`${delay}ms`,["--ac" as any]:color}}>
      <div className="sc3d-glow"/><div className="sc3d-icon">{icon}</div>
      <div className="sc3d-val">{dv}</div><div className="sc3d-lbl">{label}</div>
      <div className="sc3d-shine"/>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }: { isOpen:boolean; onClose:()=>void; title:string; children:React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="mo-over" onClick={onClose}>
      <div className="mo-box" onClick={e=>e.stopPropagation()}>
        <div className="mo-head"><h3>{title}</h3><button className="mo-x" onClick={onClose}>✕</button></div>
        <div className="mo-body">{children}</div>
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
function DashboardPage() {
  const [stats, setStats] = useState({ totalProducts:0, todaySales:0, monthlyOrders:0, activeSuppliers:0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/dashboard/stats`)
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pg pgE">
      <div className="pgH"><div className="pgHBg"/><div className="pgHC">
        <div className="pgBadge">⚡ COMMAND CENTER</div>
        <h1 className="pgT">Dashboard</h1><p className="pgS">Welcome to Adil Arms Management System</p>
      </div><div className="orb o1"/><div className="orb o2"/></div>

      {loading ? (
        <div className="ldg">Loading dashboard...</div>
      ) : (
        <div className="stG">
          <StatCard3D icon="📦" value={stats.totalProducts}   label="TOTAL PRODUCTS"   color="#c9a84c" delay={0}/>
          <StatCard3D icon="💰" value={stats.todaySales}      label="TODAY'S SALES"    color="#34d399" delay={100}/>
          <StatCard3D icon="📋" value={stats.monthlyOrders}   label="MONTHLY ORDERS"  color="#fb923c" delay={200}/>
          <StatCard3D icon="🤝" value={stats.activeSuppliers} label="ACTIVE SUPPLIERS" color="#a78bfa" delay={300}/>
        </div>
      )}

      <div className="dg2">
        <div className="gc gcE" style={{animationDelay:"400ms"}}>
          <div className="ch"><span className="chi">📊</span><h3>Recent Activities</h3></div>
          <div className="al">{ACTIVITIES.map((a,i) => (
            <div key={i} className="ai" style={{animationDelay:`${500+i*100}ms`}}>
              <div className="aiI">{a.icon}</div>
              <div><div className="aiT">{a.title}</div><div className="aiD">{a.desc}</div><div className="aiTm">{a.time}</div></div>
            </div>
          ))}</div>
        </div>
        <div className="gc gcE" style={{animationDelay:"500ms"}}>
          <div className="ch"><span className="chi">⚡</span><h3>Quick Actions</h3></div>
          <div className="qa">{[
            {icon:"➕",label:"Add New Product",color:"#c9a84c"},
            {icon:"📝",label:"Record Sale",color:"#34d399"},
            {icon:"🤝",label:"Manage Suppliers",color:"#a78bfa"},
            {icon:"📊",label:"View Reports",color:"#fb923c"},
          ].map((a,i) => (
            <button key={i} className="qb" style={{["--bc" as any]:a.color,animationDelay:`${600+i*80}ms`}}>
              <span className="qbI">{a.icon}</span><span className="qbL">{a.label}</span><span className="qbA">→</span>
            </button>
          ))}</div>
          <div style={{marginTop:20}}>
            <div className="ch"><span className="chi">📈</span><h3>Sales Trend</h3></div>
            <div className="bc">{[35,55,42,68,80,62,90].map((h,i) => (
              <div key={i} className="bcC">
                <div className="bcB" style={{height:`${h}%`,animationDelay:`${800+i*60}ms`}}/>
                <span className="bcL">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</span>
              </div>
            ))}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── STOCK ─────────────────────────────────────────────────────────────────
function StockPage() {
  const [search, setSearch] = useState("");
  const [prods, setProds] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editProd, setEditProd] = useState<Product | null>(null);
  const [err, setErr] = useState("");
  const blank = { productId:"", name:"", category:"", supplier:"", quantity:"", costPrice:"" };
  const [form, setForm] = useState(blank);

  const load = () => {
    setLoading(true);
    Promise.all([
      axios.get<Product[]>(`${API}/products`),
      axios.get<Supplier[]>(`${API}/suppliers`),
    ]).then(([p,s]) => { setProds(p.data); setSuppliers(s.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd = () => { setForm(blank); setEditProd(null); setErr(""); setShowAdd(true); };
  const openEdit = (p: Product) => {
    setForm({ productId:p.productId, name:p.name, category:p.category, supplier:p.supplier?._id||"", quantity:String(p.quantity), costPrice:String(p.costPrice) });
    setEditProd(p); setErr(""); setShowAdd(true);
  };
  const closeModal = () => { setShowAdd(false); setEditProd(null); };

  const save = async () => {
    if (!form.productId || !form.name || !form.category) { setErr("Product ID, name and category are required."); return; }
    const payload = { productId:form.productId, name:form.name, category:form.category, supplier:form.supplier||undefined, quantity:Number(form.quantity)||0, costPrice:Number(form.costPrice)||0 };
    try {
      if (editProd) await axios.put(`${API}/products/${editProd._id}`, payload);
      else await axios.post(`${API}/products`, payload);
      closeModal(); load();
    } catch(e:any) { setErr(e.response?.data?.message || "Failed to save product."); }
  };

  const del = async (id: string) => {
    if (!window.confirm("Delete this product?")) return;
    try { await axios.delete(`${API}/products/${id}`); load(); }
    catch(e) { console.error(e); }
  };

  const f = prods.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.productId.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pg pgE">
      <div className="pgH"><div className="pgHBg"/><div className="pgHC"><div className="pgBadge">📦 INVENTORY</div><h1 className="pgT">Stock Management</h1><p className="pgS">Manage your inventory and product catalog</p></div><div className="orb o1"/><div className="orb o2"/></div>
      <div className="tb">
        <div className="sw"><span className="si">🔍</span><input className="sin" placeholder="Search products by name, ID, or category..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <button className="pb" onClick={openAdd}><span>+</span> Add New Product</button>
      </div>
      <div className="gc gcE">
        <div className="ch"><h3>📦 Products ({f.length})</h3><span className="badge">Total: {prods.length}</span></div>
        {loading ? <div className="ldg">Loading...</div> : (
        <div className="tw"><table className="tbl"><thead><tr><th>PRODUCT ID</th><th>NAME</th><th>CATEGORY</th><th>SUPPLIER</th><th>QUANTITY</th><th>COST PRICE</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
          <tbody>{f.map((p,i) => {
            const status = getStockStatus(p.quantity);
            return (
              <tr key={p._id} className="tr" style={{animationDelay:`${i*60}ms`}}>
                <td><span className="mono">{p.productId}</span></td>
                <td><strong>{p.name}</strong></td>
                <td>{p.category}</td>
                <td>{p.supplier?.name || <span style={{color:"var(--tx3)"}}>—</span>}</td>
                <td>{p.quantity}</td>
                <td>PKR {p.costPrice.toLocaleString()}</td>
                <td><span className={`st st-${status.replace(/\s/g,"").toLowerCase()}`}>{status}</span></td>
                <td><div className="abs"><button className="ib ie" onClick={()=>openEdit(p)}>✏️</button><button className="ib id" onClick={()=>del(p._id)}>🗑️</button></div></td>
              </tr>
            );
          })}{f.length===0&&<tr><td colSpan={8} className="emp">No products found</td></tr>}</tbody>
        </table></div>
        )}
      </div>

      <Modal isOpen={showAdd} onClose={closeModal} title={editProd ? "✏️ Edit Product" : "➕ Add New Product"}>
        {err && <div className="errbx">{err}</div>}
        <div className="fg">
          <div className="fd"><label>Product ID *</label><input placeholder="e.g. A001" value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})}/></div>
          <div className="fd"><label>Category *</label>
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
              <option value="">Select</option>
              <option>Pistol</option><option>Rifle</option><option>Shotgun</option><option>Ammunition</option><option>Accessories</option><option>Magazine</option><option>Air Gun</option>
            </select>
          </div>
          <div className="fd" style={{gridColumn:"span 2"}}><label>Product Name *</label><input placeholder="Enter product name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
          <div className="fd"><label>Supplier</label>
            <select value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}>
              <option value="">No Supplier</option>
              {suppliers.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div className="fd"><label>Quantity</label><input type="number" min="0" placeholder="0" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} onFocus={e=>e.target.select()}/></div>
          <div className="fd" style={{gridColumn:"span 2"}}><label>Cost Price (PKR)</label><input type="number" min="0" placeholder="0" value={form.costPrice} onChange={e=>setForm({...form,costPrice:e.target.value})} onFocus={e=>e.target.select()}/></div>
        </div>
        <div className="ma"><button className="sb" onClick={closeModal}>Cancel</button><button className="pb" onClick={save}>{editProd ? "Update Product" : "Add Product"}</button></div>
      </Modal>
    </div>
  );
}

// ── SALES ─────────────────────────────────────────────────────────────────
function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selId, setSelId] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(1);
  const [voucher, setVoucher] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    axios.get<Product[]>(`${API}/products`).then(r=>setProducts(r.data)).catch(console.error);
  }, []);

  const selProd = products.find(p=>p._id===selId) || null;

  const addItem = () => {
    setErr("");
    if (!selProd) { setErr("Please select a product."); return; }
    if (qty < 1) { setErr("Quantity must be at least 1."); return; }
    if (price < 1) { setErr("Sale price must be at least 1."); return; }
    if (qty > selProd.quantity) { setErr(`Only ${selProd.quantity} units available.`); return; }
    setItems([...items, { product:selProd, quantity:qty, salePrice:price }]);
    setSelId(""); setQty(1); setPrice(1);
    setOk("Item added.");
  };

  const total = items.reduce((s,it)=>s+it.salePrice*it.quantity, 0);

  const submit = async () => {
    setErr(""); setOk("");
    if (!voucher.trim()) { setErr("Please enter a voucher number."); return; }
    if (items.length===0) { setErr("Add at least one item."); return; }
    try {
      await axios.post(`${API}/sales`, {
        voucherNumber: voucher.trim(),
        products: items.map(it=>({ product:it.product._id, quantity:it.quantity, salePrice:it.salePrice })),
      });
      setVoucher(""); setItems([]); setOk("Sale recorded successfully!");
      // refresh stock quantities
      axios.get<Product[]>(`${API}/products`).then(r=>setProducts(r.data));
    } catch(e:any) { setErr(e.response?.data?.message || "Failed to record sale."); }
  };

  return (
    <div className="pg pgE">
      <div className="pgH"><div className="pgHBg"/><div className="pgHC"><div className="pgBadge">📝 TRANSACTIONS</div><h1 className="pgT">Sales Input</h1><p className="pgS">Record new sales and manage transactions</p></div><div className="orb o1"/><div className="orb o2"/></div>
      {err && <div className="errbx">{err}</div>}
      {ok  && <div className="okbx">{ok}</div>}
      <div className="dg2">
        <div className="gc gcE">
          <div className="ch"><span className="chi">📋</span><h3>Sale Information</h3></div>
          <div className="fs">
            <div className="fd"><label>Voucher Number *</label><input placeholder="Enter voucher number" value={voucher} onChange={e=>setVoucher(e.target.value)}/></div>
            <div className="fr">
              <div className="fd" style={{flex:2}}>
                <label>Select Product *</label>
                <select value={selId} onChange={e=>setSelId(e.target.value)}>
                  <option value="">Choose a product...</option>
                  {products.map(p=><option key={p._id} value={p._id}>{p.productId} — {p.name} (Stock: {p.quantity})</option>)}
                </select>
              </div>
              <div className="fd" style={{flex:1}}><label>Quantity *</label><input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))} onFocus={e=>e.target.select()}/></div>
              <div className="fd" style={{flex:1}}><label>Sale Price (PKR) *</label><input type="number" min="1" value={price} onChange={e=>setPrice(Number(e.target.value))} onFocus={e=>e.target.select()}/></div>
            </div>
            <button className="aib" onClick={addItem}>+ Add Item to Sale</button>
          </div>
          {items.length>0 && <div style={{marginTop:20}}>
            <h4 style={{color:"var(--g)",marginBottom:12}}>Added Items</h4>
            {items.map((it,i)=>(
              <div key={i} className="sli">
                <span style={{flex:1,fontWeight:500}}>{it.product.name}</span>
                <span>×{it.quantity}</span>
                <span>PKR {(it.salePrice*it.quantity).toLocaleString()}</span>
                <button className="ib id" onClick={()=>setItems(items.filter((_,idx)=>idx!==i))}>✕</button>
              </div>
            ))}
          </div>}
        </div>
        <div className="gc gcE" style={{animationDelay:"200ms"}}>
          <div className="ch"><span className="chi">🧾</span><h3>Sale Summary</h3></div>
          <div className="sum">
            <div className="sumR"><span>ITEMS:</span><span className="badge">{items.length}</span></div>
            <div className="sumD"/>
            <div className="sumT"><span>TOTAL AMOUNT:</span><span className="tv">PKR {total.toLocaleString()}</span></div>
          </div>
          <button className="pb rb" onClick={submit} disabled={items.length===0||!voucher.trim()}>📝 Record Sale</button>
        </div>
      </div>
    </div>
  );
}

// ── MONTHLY ───────────────────────────────────────────────────────────────
function MonthlyPage() {
  const [yr, setYr] = useState(new Date().getFullYear());
  const [mo, setMo] = useState(new Date().getMonth()+1);
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState({ totalSales:0, totalProfit:0, numberOfSales:0 });
  const [loading, setLoading] = useState(false);
  const years = Array.from({length:10},(_,i)=>new Date().getFullYear()-i);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/sales/monthly/${yr}/${mo}`)
      .then(r=>{ setSales(r.data.sales); setSummary(r.data.summary); })
      .catch(console.error)
      .finally(()=>setLoading(false));
  }, [yr, mo]);

  const exportCSV = () => {
    const rows = [
      ["Voucher","Date","Products","Amount (PKR)","Profit (PKR)"],
      ...sales.map(s=>[
        s.voucherNumber,
        new Date(s.date).toLocaleDateString(),
        s.products.map(p=>`${p.product?.name||"?"} x${p.quantity}`).join("; "),
        s.totalAmount,
        s.profit,
      ])
    ];
    const csv = rows.map(r=>r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = `AdilArms-${MONTHS[mo-1]}-${yr}.csv`;
    a.click();
  };

  return (
    <div className="pg pgE">
      <div className="pgH"><div className="pgHBg"/><div className="pgHC"><div className="pgBadge">📊 ANALYTICS</div><h1 className="pgT">Monthly Records</h1><p className="pgS">View and analyze monthly sales performance</p></div><div className="orb o1"/><div className="orb o2"/></div>
      <div className="dg2">
        <div className="gc gcE">
          <div className="ch"><span className="chi">📅</span><h3>Select Period</h3></div>
          <div className="fr">
            <div className="fd" style={{flex:1}}><label>Year</label>
              <select value={yr} onChange={e=>setYr(Number(e.target.value))}>
                {years.map(y=><option key={y}>{y}</option>)}
              </select>
            </div>
            <div className="fd" style={{flex:1}}><label>Month</label>
              <select value={mo} onChange={e=>setMo(Number(e.target.value))}>
                {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="gc gcE" style={{animationDelay:"100ms"}}>
          <div className="ch"><span className="chi">📤</span><h3>Export Data</h3></div>
          <button className="pb" style={{width:"100%",marginTop:8}} onClick={exportCSV} disabled={sales.length===0}>📥 Export to CSV</button>
        </div>
      </div>

      <div className="stG stG3">
        <StatCard3D icon="💰" value={summary.totalSales}   label="TOTAL SALES"      color="#34d399" delay={200}/>
        <StatCard3D icon="📈" value={summary.totalProfit}  label="TOTAL PROFIT"     color="#c9a84c" delay={300}/>
        <StatCard3D icon="📋" value={summary.numberOfSales} label="NUMBER OF SALES" color="#a78bfa" delay={400}/>
      </div>

      <div className="gc gcE" style={{animationDelay:"500ms"}}>
        <div className="ch"><h3>🗓️ {MONTHS[mo-1]} {yr}</h3><span className="tmut">Showing {sales.length} sales transactions</span></div>
        {loading ? <div className="ldg">Loading...</div> : (
        <div className="tw"><table className="tbl"><thead><tr><th>VOUCHER</th><th>DATE</th><th>PRODUCTS</th><th>AMOUNT</th><th>PROFIT</th></tr></thead>
          <tbody>{sales.length===0
            ? <tr><td colSpan={5} className="emp">No sales found for {MONTHS[mo-1]} {yr}</td></tr>
            : sales.map((s,i)=>(
              <tr key={s._id} className="tr" style={{animationDelay:`${600+i*60}ms`}}>
                <td><span className="mono">{s.voucherNumber}</span></td>
                <td>{new Date(s.date).toLocaleDateString()}</td>
                <td>{s.products.map((p,j)=>(
                  <div key={j}><strong>{p.product?.name||"—"}</strong> <span style={{color:"var(--tx3)"}}>×{p.quantity} @ PKR {p.salePrice.toLocaleString()}</span></div>
                ))}</td>
                <td className="tg">PKR {s.totalAmount.toLocaleString()}</td>
                <td className="tgd">PKR {s.profit.toLocaleString()}</td>
              </tr>
            ))
          }</tbody>
        </table></div>
        )}
      </div>
    </div>
  );
}

// ── SUPPLIERS ─────────────────────────────────────────────────────────────
function SupplierPage() {
  const [search, setSearch] = useState("");
  const [sups, setSups] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [editSup, setEditSup] = useState<Supplier|null>(null);
  const [err, setErr] = useState("");
  const blank = { name:"", contact:"", address:"", paymentTerms:"Net 30" };
  const [form, setForm] = useState(blank);

  const load = () => {
    setLoading(true);
    axios.get<Supplier[]>(`${API}/suppliers`)
      .then(r=>setSups(r.data)).catch(console.error).finally(()=>setLoading(false));
  };
  useEffect(load, []);

  const openAdd = () => { setForm(blank); setEditSup(null); setErr(""); setShow(true); };
  const openEdit = (s: Supplier) => { setForm({ name:s.name, contact:s.contact, address:s.address||"", paymentTerms:s.paymentTerms||"Net 30" }); setEditSup(s); setErr(""); setShow(true); };
  const closeModal = () => { setShow(false); setEditSup(null); };

  const save = async () => {
    if (!form.name.trim() || !form.contact.trim()) { setErr("Name and contact are required."); return; }
    try {
      if (editSup) await axios.put(`${API}/suppliers/${editSup._id}`, form);
      else await axios.post(`${API}/suppliers`, form);
      closeModal(); load();
    } catch(e:any) { setErr(e.response?.data?.message || "Failed to save supplier."); }
  };

  const del = async (id: string) => {
    if (!window.confirm("Delete this supplier?")) return;
    try { await axios.delete(`${API}/suppliers/${id}`); load(); }
    catch(e) { console.error(e); }
  };

  const f = sups.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contact.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pg pgE">
      <div className="pgH"><div className="pgHBg"/><div className="pgHC"><div className="pgBadge">🤝 VENDORS</div><h1 className="pgT">Supplier Management</h1><p className="pgS">Manage your suppliers and vendor relationships</p></div><div className="orb o1"/><div className="orb o2"/></div>
      <div className="tb">
        <div className="sw"><span className="si">🔍</span><input className="sin" placeholder="Search suppliers by name or contact..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <button className="pb" onClick={openAdd}><span>+</span> Add New Supplier</button>
      </div>
      <div className="gc gcE">
        <div className="ch"><h3>🤝 Suppliers ({f.length})</h3><span className="badge">Total: {sups.length}</span></div>
        {loading ? <div className="ldg">Loading...</div> : (
        <div className="tw"><table className="tbl"><thead><tr><th>NAME</th><th>CONTACT</th><th>ADDRESS</th><th>PAYMENT TERMS</th><th>ACTIONS</th></tr></thead>
          <tbody>{f.map((s,i)=>(
            <tr key={s._id} className="tr" style={{animationDelay:`${i*60}ms`}}>
              <td><strong>{s.name}</strong></td>
              <td><span className="mono">{s.contact}</span></td>
              <td>{s.address||<span style={{color:"var(--tx3)"}}>—</span>}</td>
              <td><span className="badge bsm">{s.paymentTerms||"—"}</span></td>
              <td><div className="abs"><button className="ib ie" onClick={()=>openEdit(s)}>✏️</button><button className="ib id" onClick={()=>del(s._id)}>🗑️</button></div></td>
            </tr>
          ))}{f.length===0&&<tr><td colSpan={5} className="emp">No suppliers found</td></tr>}</tbody>
        </table></div>
        )}
      </div>

      <Modal isOpen={show} onClose={closeModal} title={editSup ? "✏️ Edit Supplier" : "➕ Add New Supplier"}>
        {err && <div className="errbx">{err}</div>}
        <div className="fg">
          <div className="fd"><label>Supplier Name *</label><input placeholder="Enter name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
          <div className="fd"><label>Contact *</label><input placeholder="+92 xxx xxxxxxx" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></div>
          <div className="fd"><label>Address</label><input placeholder="City, Country" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></div>
          <div className="fd"><label>Payment Terms</label>
            <select value={form.paymentTerms} onChange={e=>setForm({...form,paymentTerms:e.target.value})}>
              <option>COD</option><option>Net 15</option><option>Net 30</option><option>Net 45</option><option>Net 60</option>
            </select>
          </div>
        </div>
        <div className="ma"><button className="sb" onClick={closeModal}>Cancel</button><button className="pb" onClick={save}>{editSup ? "Update Supplier" : "Add Supplier"}</button></div>
      </Modal>
    </div>
  );
}

// ── LEDGER ────────────────────────────────────────────────────────────────
function LedgerPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selSup, setSelSup] = useState("");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", date: new Date().toISOString().split("T")[0], notes: "", reference: "" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    axios.get<Supplier[]>(`${API}/suppliers`).then(r => setSuppliers(r.data)).catch(console.error);
  }, []);

  const loadLedger = (supId: string) => {
    if (!supId) { setEntries([]); setSummary(null); return; }
    setLoading(true);
    Promise.all([
      axios.get<LedgerEntry[]>(`${API}/ledger/supplier/${supId}`),
      axios.get<LedgerSummary>(`${API}/ledger/supplier/${supId}/summary`),
    ]).then(([e, s]) => { setEntries(e.data); setSummary(s.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLedger(selSup); }, [selSup]);

  const addPayment = async () => {
    setErr(""); setOk("");
    if (!selSup) { setErr("Please select a supplier."); return; }
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) { setErr("Please enter a valid amount."); return; }
    try {
      await axios.post(`${API}/ledger/payment`, {
        supplier: selSup, amount, date: payForm.date, notes: payForm.notes, reference: payForm.reference,
      });
      setShowPayment(false);
      setPayForm({ amount: "", date: new Date().toISOString().split("T")[0], notes: "", reference: "" });
      setOk("Payment recorded successfully!");
      loadLedger(selSup);
    } catch (e: any) { setErr(e.response?.data?.message || "Failed to record payment."); }
  };

  const delEntry = async (id: string) => {
    if (!window.confirm("Delete this payment entry?")) return;
    try { await axios.delete(`${API}/ledger/${id}`); loadLedger(selSup); }
    catch (e: any) { alert(e.response?.data?.message || "Failed to delete entry."); }
  };

  const supName = suppliers.find(s => s._id === selSup)?.name || "";

  return (
    <div className="pg pgE">
      <div className="pgH"><div className="pgHBg"/><div className="pgHC"><div className="pgBadge">📒 ACCOUNTING</div><h1 className="pgT">Ledger / Khata</h1><p className="pgS">Track supplier purchases, payments and outstanding balances</p></div><div className="orb o1"/><div className="orb o2"/></div>

      {ok && <div className="okbx">{ok}</div>}

      {/* Supplier Selector */}
      <div className="gc gcE">
        <div className="ch"><span className="chi">🤝</span><h3>Select Supplier</h3></div>
        <div className="fr" style={{alignItems:"flex-end"}}>
          <div className="fd" style={{flex:2}}>
            <label>Supplier</label>
            <select value={selSup} onChange={e=>{setSelSup(e.target.value); setOk("");}}>
              <option value="">— Select a supplier to view their ledger —</option>
              {suppliers.map(s=><option key={s._id} value={s._id}>{s.name} ({s.contact})</option>)}
            </select>
          </div>
          {selSup && (
            <button className="pb" onClick={()=>{setShowPayment(true); setErr("");}}>
              💰 Add Payment
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="stG stG3">
          <div className="sc3d" style={{["--ac" as any]:"#f87171",animationDelay:"0ms"}}>
            <div className="sc3d-glow"/><div className="sc3d-icon">🛒</div>
            <div className="sc3d-val">PKR {summary.totalPurchases.toLocaleString()}</div>
            <div className="sc3d-lbl">TOTAL PURCHASES</div><div className="sc3d-shine"/>
          </div>
          <div className="sc3d" style={{["--ac" as any]:"#34d399",animationDelay:"100ms"}}>
            <div className="sc3d-glow"/><div className="sc3d-icon">✅</div>
            <div className="sc3d-val">PKR {summary.totalPaid.toLocaleString()}</div>
            <div className="sc3d-lbl">TOTAL PAID</div><div className="sc3d-shine"/>
          </div>
          <div className="sc3d" style={{["--ac" as any]:summary.balance>0?"#f87171":"#34d399",animationDelay:"200ms"}}>
            <div className="sc3d-glow"/><div className="sc3d-icon">{summary.balance>0?"⚠️":"✅"}</div>
            <div className="sc3d-val" style={{color:summary.balance>0?"var(--rd)":"var(--gn)"}}>PKR {summary.balance.toLocaleString()}</div>
            <div className="sc3d-lbl">BALANCE DUE</div><div className="sc3d-shine"/>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      {selSup && (
        <div className="gc gcE" style={{animationDelay:"300ms"}}>
          <div className="ch">
            <h3>📒 {supName} — Transaction History</h3>
            <span className="badge">{entries.length} entries</span>
          </div>
          {loading ? <div className="ldg">Loading...</div> : (
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>DATE</th><th>TYPE</th><th>DESCRIPTION</th>
                    <th>PURCHASE (DR)</th><th>PAYMENT (CR)</th><th>RUNNING BALANCE</th><th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0
                    ? <tr><td colSpan={7} className="emp">No transactions found for this supplier</td></tr>
                    : entries.map((e, i) => (
                      <tr key={e._id} className="tr" style={{animationDelay:`${i*50}ms`}}>
                        <td><span className="mono">{new Date(e.date).toLocaleDateString()}</span></td>
                        <td>
                          <span className={`st ${e.type==='PURCHASE'?'st-lowstock':'st-instock'}`}>
                            {e.type}
                          </span>
                        </td>
                        <td>
                          {e.reference && <strong style={{display:"block"}}>{e.reference}</strong>}
                          {e.notes && <span style={{fontSize:11,color:"var(--tx3)"}}>{e.notes}</span>}
                        </td>
                        <td style={{color:"var(--rd)",fontWeight:600}}>
                          {e.type==='PURCHASE' ? `PKR ${e.amount.toLocaleString()}` : '—'}
                        </td>
                        <td style={{color:"var(--gn)",fontWeight:600}}>
                          {e.type==='PAYMENT' ? `PKR ${e.amount.toLocaleString()}` : '—'}
                        </td>
                        <td style={{color:e.runningBalance>0?"var(--rd)":"var(--gn)",fontWeight:700}}>
                          PKR {e.runningBalance.toLocaleString()}
                        </td>
                        <td>
                          {e.type==='PAYMENT' && (
                            <button className="ib id" onClick={()=>delEntry(e._id)} title="Delete payment">🗑️</button>
                          )}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Payment Modal */}
      <Modal isOpen={showPayment} onClose={()=>setShowPayment(false)} title="💰 Record Payment">
        {err && <div className="errbx">{err}</div>}
        <div className="fg">
          <div className="fd">
            <label>Amount (PKR) *</label>
            <input type="number" min="1" placeholder="Enter amount" value={payForm.amount}
              onChange={e=>setPayForm({...payForm,amount:e.target.value})}
              onFocus={e=>e.target.select()}/>
          </div>
          <div className="fd">
            <label>Date</label>
            <input type="date" value={payForm.date}
              onChange={e=>setPayForm({...payForm,date:e.target.value})}/>
          </div>
          <div className="fd">
            <label>Reference / Method</label>
            <input placeholder="e.g. Cash, Bank Transfer, Cheque" value={payForm.reference}
              onChange={e=>setPayForm({...payForm,reference:e.target.value})}/>
          </div>
          <div className="fd">
            <label>Notes</label>
            <input placeholder="Optional notes" value={payForm.notes}
              onChange={e=>setPayForm({...payForm,notes:e.target.value})}/>
          </div>
        </div>
        <div className="ma">
          <button className="sb" onClick={()=>setShowPayment(false)}>Cancel</button>
          <button className="pb" onClick={addPayment}>💰 Record Payment</button>
        </div>
      </Modal>
    </div>
  );
}

// ── PARTY MANAGEMENT PAGE ─────────────────────────────────────────────────
function PartyPage({ onViewLedger }: { onViewLedger: (partyId: string) => void }) {
  const [parties, setParties] = useState<Party[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", partyType: "Customer" as Party["partyType"], openingBalance: "", caseStartDate: new Date().toISOString().split("T")[0] });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const load = () => axios.get<Party[]>(`${API}/parties`).then(r => setParties(r.data)).catch(console.error);
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", phone: "", address: "", partyType: "Customer", openingBalance: "", caseStartDate: new Date().toISOString().split("T")[0] });
    setErr(""); setShowModal(true);
  };
  const openEdit = (p: Party) => {
    setEditing(p);
    setForm({ name: p.name, phone: p.phone || "", address: p.address || "", partyType: p.partyType, openingBalance: p.openingBalance ? String(p.openingBalance) : "", caseStartDate: new Date(p.caseStartDate).toISOString().split("T")[0] });
    setErr(""); setShowModal(true);
  };

  const save = async () => {
    setErr("");
    if (!form.name.trim()) { setErr("Name is required."); return; }
    try {
      const payload = { ...form, openingBalance: Number(form.openingBalance) || 0 };
      if (editing) await axios.put(`${API}/parties/${editing._id}`, payload);
      else await axios.post(`${API}/parties`, payload);
      setShowModal(false); setOk(editing ? "Party updated!" : "Party added!"); load();
    } catch (e: any) { setErr(e.response?.data?.message || "Failed to save."); }
  };

  const del = async (p: Party) => {
    if (!window.confirm(`Delete "${p.name}"? All their ledger entries will also be deleted.`)) return;
    try { await axios.delete(`${API}/parties/${p._id}`); setOk("Party deleted."); load(); }
    catch (e: any) { alert(e.response?.data?.message || "Failed to delete."); }
  };

  const typeColor = (t: string) => t === "Customer" ? "var(--bl)" : t === "Supplier" ? "var(--or)" : "var(--pr)";
  const filtered = parties.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.phone || "").includes(search) || p.partyType.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="pg pgE">
      <div className="pgH"><div className="pgHBg"/><div className="pgHC"><div className="pgBadge">👥 PARTIES</div><h1 className="pgT">Party Management</h1><p className="pgS">Manage customers, suppliers and others with case tracking</p></div><div className="orb o1"/><div className="orb o2"/></div>
      {ok && <div className="okbx">{ok}</div>}
      <div className="tb">
        <div className="sw"><span className="si">🔍</span><input className="sin" placeholder="Search by name, phone or type..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <button className="pb" onClick={openAdd}>+ Add Party</button>
      </div>
      <div className="gc gcE">
        <div className="ch"><span className="chi">👥</span><h3>All Parties</h3><span className="badge">{filtered.length} parties</span></div>
        <div className="tw">
          <table className="tbl">
            <thead><tr><th>NAME</th><th>TYPE</th><th>PHONE</th><th>ADDRESS</th><th>CASE START</th><th>OPENING BAL.</th><th>ACTIONS</th></tr></thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7} className="emp">No parties found</td></tr>
                : filtered.map((p, i) => (
                  <tr key={p._id} className="tr" style={{animationDelay:`${i*40}ms`}}>
                    <td><strong style={{color:"var(--tx)"}}>{p.name}</strong></td>
                    <td><span className="st" style={{background:`color-mix(in srgb,${typeColor(p.partyType)} 12%,transparent)`,color:typeColor(p.partyType)}}>{p.partyType}</span></td>
                    <td><span className="mono">{p.phone || "—"}</span></td>
                    <td style={{color:"var(--tx2)",fontSize:12}}>{p.address || "—"}</td>
                    <td><span className="mono">{new Date(p.caseStartDate).toLocaleDateString()}</span></td>
                    <td style={{color: p.openingBalance > 0 ? "var(--rd)" : p.openingBalance < 0 ? "var(--gn)" : "var(--tx3)", fontWeight:600}}>
                      {p.openingBalance !== 0 ? `PKR ${Math.abs(p.openingBalance).toLocaleString()}` : "—"}
                    </td>
                    <td>
                      <div className="abs">
                        <button className="ib" style={{color:"var(--g)",borderColor:"rgba(201,168,76,.3)"}} onClick={()=>onViewLedger(p._id)} title="View Ledger">📒</button>
                        <button className="ib ie" onClick={()=>openEdit(p)} title="Edit">✏️</button>
                        <button className="ib id" onClick={()=>del(p)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
      <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title={editing ? "✏️ Edit Party" : "➕ Add New Party"}>
        {err && <div className="errbx">{err}</div>}
        <div className="fg">
          <div className="fd">
            <label>Name *</label>
            <input placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          </div>
          <div className="fd">
            <label>Type *</label>
            <select value={form.partyType} onChange={e=>setForm({...form,partyType:e.target.value as Party["partyType"]})}>
              <option value="Customer">Customer</option>
              <option value="Supplier">Supplier</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="fd">
            <label>Phone</label>
            <input placeholder="Phone number (optional)" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
          </div>
          <div className="fd">
            <label>Case Start Date *</label>
            <input type="date" value={form.caseStartDate} onChange={e=>setForm({...form,caseStartDate:e.target.value})}/>
          </div>
          <div className="fd" style={{gridColumn:"1/-1"}}>
            <label>Address</label>
            <input placeholder="City / Address (optional)" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/>
          </div>
          <div className="fd" style={{gridColumn:"1/-1"}}>
            <label>Opening Balance (PKR)</label>
            <input type="number" placeholder="0 (leave blank if none)" value={form.openingBalance} onChange={e=>setForm({...form,openingBalance:e.target.value})} onFocus={e=>e.target.select()}/>
          </div>
        </div>
        <div className="ma">
          <button className="sb" onClick={()=>setShowModal(false)}>Cancel</button>
          <button className="pb" onClick={save}>{editing ? "💾 Update" : "➕ Add Party"}</button>
        </div>
      </Modal>
    </div>
  );
}

// ── PARTY LEDGER TIMELINE PAGE ─────────────────────────────────────────────
function PartyLedgerPage({ initialPartyId, onBack }: { initialPartyId?: string; onBack: () => void }) {
  const [parties, setParties] = useState<Party[]>([]);
  const [selParty, setSelParty] = useState(initialPartyId || "");
  const [ledgerData, setLedgerData] = useState<PartyLedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTxn, setShowTxn] = useState(false);
  const [txnForm, setTxnForm] = useState({ transactionDate: new Date().toISOString().split("T")[0], type: "DEBIT" as "DEBIT"|"CREDIT", amount: "", paymentMethod: "Cash" as PartyLedgerEntry["paymentMethod"], notes: "" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => { axios.get<Party[]>(`${API}/parties`).then(r => setParties(r.data)).catch(console.error); }, []);
  useEffect(() => { if (initialPartyId) setSelParty(initialPartyId); }, [initialPartyId]);

  const loadLedger = (pid: string) => {
    if (!pid) { setLedgerData(null); return; }
    setLoading(true);
    axios.get<PartyLedgerData>(`${API}/party-ledger/party/${pid}`)
      .then(r => setLedgerData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLedger(selParty); }, [selParty]);

  const addTransaction = async () => {
    setErr(""); setOk("");
    if (!selParty) { setErr("Select a party first."); return; }
    const amount = Number(txnForm.amount);
    if (!amount || amount <= 0) { setErr("Enter a valid amount."); return; }
    try {
      await axios.post(`${API}/party-ledger/transaction`, { party: selParty, ...txnForm, amount });
      setShowTxn(false);
      setTxnForm({ transactionDate: new Date().toISOString().split("T")[0], type: "DEBIT", amount: "", paymentMethod: "Cash", notes: "" });
      setOk("Transaction recorded!");
      loadLedger(selParty);
    } catch (e: any) { setErr(e.response?.data?.message || "Failed to record transaction."); }
  };

  const delEntry = async (id: string) => {
    if (!window.confirm("Delete this transaction?")) return;
    try { await axios.delete(`${API}/party-ledger/${id}`); loadLedger(selParty); }
    catch (e: any) { alert(e.response?.data?.message || "Failed to delete."); }
  };

  const bal = ledgerData?.currentBalance ?? 0;
  const party = ledgerData?.party;
  const entries = ledgerData?.entries ?? [];
  const typeColor = (t: string) => t === "Customer" ? "var(--bl)" : t === "Supplier" ? "var(--or)" : "var(--pr)";

  return (
    <div className="pg pgE">
      <div className="pgH">
        <div className="pgHBg"/>
        <div className="pgHC">
          <div className="pgBadge">📒 KHATA BOOK</div>
          <h1 className="pgT">Party Ledger Timeline</h1>
          <p className="pgS">Complete payment history with transaction dates and running balance</p>
        </div>
        <div className="orb o1"/><div className="orb o2"/>
      </div>

      {ok && <div className="okbx">{ok}</div>}

      {/* Party Selector */}
      <div className="gc gcE">
        <div className="ch"><span className="chi">👤</span><h3>Select Party</h3>
          <button className="sb" style={{padding:"6px 14px",fontSize:12}} onClick={onBack}>← Back to Parties</button>
        </div>
        <div className="fr" style={{alignItems:"flex-end"}}>
          <div className="fd" style={{flex:2}}>
            <label>Party</label>
            <select value={selParty} onChange={e=>{setSelParty(e.target.value); setOk("");}}>
              <option value="">— Select a party to view their ledger timeline —</option>
              {parties.map(p=><option key={p._id} value={p._id}>{p.name} ({p.partyType}){p.phone ? ` — ${p.phone}` : ""}</option>)}
            </select>
          </div>
          {selParty && (
            <button className="pb" onClick={()=>{setShowTxn(true); setErr("");}}>+ Add Transaction</button>
          )}
        </div>
      </div>

      {/* Party Info + Summary Cards */}
      {party && (
        <>
          <div className="gc gcE" style={{animationDelay:"50ms",padding:"16px 24px"}}>
            <div style={{display:"flex",gap:24,flexWrap:"wrap",alignItems:"center"}}>
              <div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--tx3)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Party</div>
                <div style={{fontWeight:700,fontSize:18,color:"var(--tx)"}}>{party.name}</div>
              </div>
              <div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--tx3)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Type</div>
                <span className="st" style={{background:`color-mix(in srgb,${typeColor(party.partyType)} 12%,transparent)`,color:typeColor(party.partyType)}}>{party.partyType}</span>
              </div>
              {party.phone && <div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--tx3)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Phone</div><div style={{fontSize:13,color:"var(--tx2)"}}>{party.phone}</div></div>}
              {party.address && <div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--tx3)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Address</div><div style={{fontSize:13,color:"var(--tx2)"}}>{party.address}</div></div>}
              <div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--tx3)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Case Started</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:"var(--g)"}}>{new Date(party.caseStartDate).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</div>
              </div>
            </div>
          </div>

          <div className="stG stG3" style={{animationDelay:"100ms"}}>
            <div className="sc3d" style={{["--ac" as any]:"#f87171",animationDelay:"0ms"}}>
              <div className="sc3d-glow"/><div className="sc3d-icon">📈</div>
              <div className="sc3d-val">PKR {(entries.filter(e=>e.type==="DEBIT").reduce((s,e)=>s+e.amount,0) + (party.openingBalance||0)).toLocaleString()}</div>
              <div className="sc3d-lbl">TOTAL DEBITS (incl. opening)</div><div className="sc3d-shine"/>
            </div>
            <div className="sc3d" style={{["--ac" as any]:"#34d399",animationDelay:"100ms"}}>
              <div className="sc3d-glow"/><div className="sc3d-icon">💳</div>
              <div className="sc3d-val">PKR {entries.filter(e=>e.type==="CREDIT").reduce((s,e)=>s+e.amount,0).toLocaleString()}</div>
              <div className="sc3d-lbl">TOTAL CREDITS (PAYMENTS)</div><div className="sc3d-shine"/>
            </div>
            <div className="sc3d" style={{["--ac" as any]:bal>0?"#f87171":"#34d399",animationDelay:"200ms"}}>
              <div className="sc3d-glow"/><div className="sc3d-icon">{bal>0?"⚠️":"✅"}</div>
              <div className="sc3d-val" style={{color:bal>0?"var(--rd)":bal<0?"var(--gn)":"var(--tx)"}}>{bal>=0?"PKR ":"−PKR "}{Math.abs(bal).toLocaleString()}</div>
              <div className="sc3d-lbl">OUTSTANDING BALANCE</div><div className="sc3d-shine"/>
            </div>
          </div>
        </>
      )}

      {/* Timeline */}
      {selParty && (
        <div className="gc gcE" style={{animationDelay:"300ms"}}>
          <div className="ch">
            <h3>📒 {party?.name || ""} — Ledger Timeline</h3>
            <span className="badge">{entries.length} transactions</span>
          </div>
          {loading ? <div className="ldg">Loading...</div> : (
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>TRANSACTION DATE</th>
                    <th>TYPE</th>
                    <th>AMOUNT</th>
                    <th>METHOD</th>
                    <th>NOTES</th>
                    <th>RUNNING BALANCE</th>
                    <th>ENTRY TIME</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Case Start Row */}
                  {party && (
                    <tr style={{background:"rgba(201,168,76,.04)"}}>
                      <td colSpan={8} style={{padding:"12px 16px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:12}}>
                          <span style={{width:10,height:10,borderRadius:"50%",background:"var(--g)",display:"inline-block",boxShadow:"0 0 8px rgba(201,168,76,.5)"}}/>
                          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"var(--g)",fontWeight:600}}>
                            CASE STARTED: {new Date(party.caseStartDate).toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}
                          </span>
                          {party.openingBalance !== 0 && (
                            <span style={{fontSize:12,color:"var(--tx2)"}}>
                              — Opening Balance: <strong style={{color:"var(--rd)"}}>PKR {Math.abs(party.openingBalance).toLocaleString()}</strong>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  {entries.length === 0
                    ? <tr><td colSpan={8} className="emp">No transactions yet. Add the first one.</td></tr>
                    : entries.map((e, i) => (
                      <tr key={e._id} className="tr" style={{animationDelay:`${i*40}ms`}}>
                        <td>
                          <span className="mono">{new Date(e.transactionDate).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</span>
                        </td>
                        <td>
                          <span className="st" style={{
                            background: e.type==="DEBIT" ? "rgba(248,113,113,.12)" : "rgba(52,211,153,.12)",
                            color: e.type==="DEBIT" ? "var(--rd)" : "var(--gn)"
                          }}>
                            {e.type}
                          </span>
                        </td>
                        <td style={{fontWeight:700, color: e.type==="DEBIT" ? "var(--rd)" : "var(--gn)"}}>
                          {e.type==="DEBIT" ? "+" : "−"}PKR {e.amount.toLocaleString()}
                        </td>
                        <td>
                          <span className="st" style={{background:"rgba(167,139,250,.08)",color:"var(--pr)",fontSize:10}}>
                            {e.paymentMethod}
                          </span>
                        </td>
                        <td style={{color:"var(--tx2)",fontSize:12}}>{e.notes || "—"}</td>
                        <td style={{fontWeight:700, color: e.runningBalance>0?"var(--rd)":e.runningBalance<0?"var(--gn)":"var(--tx)"}}>
                          PKR {e.runningBalance.toLocaleString()}
                        </td>
                        <td>
                          <span className="mono" style={{fontSize:10,color:"var(--tx3)"}}>{new Date(e.systemTimestamp).toLocaleString()}</span>
                        </td>
                        <td>
                          <button className="ib id" onClick={()=>delEntry(e._id)} title="Delete transaction">🗑️</button>
                        </td>
                      </tr>
                    ))
                  }
                  {/* Final Balance Row */}
                  {party && entries.length > 0 && (
                    <tr style={{background:"rgba(201,168,76,.06)"}}>
                      <td colSpan={5} style={{padding:"14px 16px",fontWeight:600,color:"var(--tx2)"}}>CURRENT OUTSTANDING BALANCE</td>
                      <td colSpan={3} style={{padding:"14px 16px",fontWeight:800,fontSize:16, color: bal>0?"var(--rd)":bal<0?"var(--gn)":"var(--gn)"}}>
                        {bal>=0?"PKR ":"−PKR "}{Math.abs(bal).toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Transaction Modal */}
      <Modal isOpen={showTxn} onClose={()=>setShowTxn(false)} title="➕ Add Transaction">
        {err && <div className="errbx">{err}</div>}
        <div className="fg">
          <div className="fd">
            <label>Transaction Date *</label>
            <input type="date" value={txnForm.transactionDate} onChange={e=>setTxnForm({...txnForm,transactionDate:e.target.value})}/>
          </div>
          <div className="fd">
            <label>Type *</label>
            <select value={txnForm.type} onChange={e=>setTxnForm({...txnForm,type:e.target.value as "DEBIT"|"CREDIT"})}>
              <option value="DEBIT">DEBIT (Amount Owed / Goods Given)</option>
              <option value="CREDIT">CREDIT (Payment Received)</option>
            </select>
          </div>
          <div className="fd">
            <label>Amount (PKR) *</label>
            <input type="number" min="1" placeholder="Enter amount" value={txnForm.amount} onChange={e=>setTxnForm({...txnForm,amount:e.target.value})} onFocus={e=>e.target.select()}/>
          </div>
          <div className="fd">
            <label>Payment Method *</label>
            <select value={txnForm.paymentMethod} onChange={e=>setTxnForm({...txnForm,paymentMethod:e.target.value as PartyLedgerEntry["paymentMethod"]})}>
              <option value="Cash">Cash</option>
              <option value="Online Transfer">Online Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
          <div className="fd" style={{gridColumn:"1/-1"}}>
            <label>Notes (Optional)</label>
            <input placeholder="e.g. Partial payment for January order" value={txnForm.notes} onChange={e=>setTxnForm({...txnForm,notes:e.target.value})}/>
          </div>
        </div>
        <div style={{background:"rgba(201,168,76,.05)",border:"1px solid rgba(201,168,76,.15)",borderRadius:10,padding:"12px 16px",marginTop:8,fontSize:12,color:"var(--tx2)"}}>
          <strong style={{color:"var(--g)"}}>Note:</strong> Transaction Date is user-entered business date. System will record the actual entry time automatically.
        </div>
        <div className="ma">
          <button className="sb" onClick={()=>setShowTxn(false)}>Cancel</button>
          <button className="pb" onClick={addTransaction}>➕ Record Transaction</button>
        </div>
      </Modal>
    </div>
  );
}

// ── AUTH PAGES ────────────────────────────────────────────────────────────
type AuthView = "login" | "signup" | "forgot";

function AuthShell({ children, title, subtitle, badge }: { children: React.ReactNode; title: string; subtitle: string; badge: string }) {
  return (
    <div className="au-bg">
      <Particles/>
      <div className="au-card">
        <div className="au-logo"><div className="lg-i" style={{margin:"0 auto 16px"}}>AA</div>
          <div className="lg-n" style={{textAlign:"center",fontSize:20}}>Adil Arms</div>
          <div className="lg-s" style={{textAlign:"center",marginTop:4}}>Management System</div>
        </div>
        <div className="pgBadge" style={{display:"block",textAlign:"center",marginBottom:16}}>{badge}</div>
        <h2 className="au-title">{title}</h2>
        <p className="au-sub">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function LoginPage({ onAuth, goSignup, goForgot }: { onAuth:(t:string,u:any)=>void; goSignup:()=>void; goForgot:()=>void }) {
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow]   = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!email || !pass) { setErr("Email and password are required."); return; }
    setLoading(true);
    try {
      const r = await axios.post(`${API}/auth/signin`, { email, password: pass });
      onAuth(r.data.token, r.data.user);
    } catch(ex: any) { setErr(ex.response?.data?.message || "Sign in failed."); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell title="Welcome Back" subtitle="Sign in to your account to continue" badge="🔐 SECURE LOGIN">
      <form onSubmit={submit}>
        {err && <div className="errbx">{err}</div>}
        <div className="fd" style={{marginBottom:14}}>
          <label>Email Address</label>
          <input type="email" placeholder="admin@adilarms.com" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/>
        </div>
        <div className="fd" style={{marginBottom:20}}>
          <label>Password</label>
          <div style={{position:"relative"}}>
            <input type={show?"text":"password"} placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} style={{paddingRight:44}} autoComplete="current-password"/>
            <button type="button" onClick={()=>setShow(!show)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--tx3)",fontSize:16}}>{show?"🙈":"👁️"}</button>
          </div>
        </div>
        <button className="pb" type="submit" disabled={loading} style={{width:"100%",justifyContent:"center",marginBottom:12}}>
          {loading ? "Signing in..." : "🔓 Sign In"}
        </button>
        <button type="button" className="au-link" onClick={goForgot}>Forgot your password?</button>
        <div className="au-div"><span>Don't have an account?</span></div>
        <button type="button" className="sb" style={{width:"100%",textAlign:"center"}} onClick={goSignup}>Create Account</button>
      </form>
    </AuthShell>
  );
}

function SignupPage({ onAuth, goLogin }: { onAuth:(t:string,u:any)=>void; goLogin:()=>void }) {
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [conf,  setConf]  = useState("");
  const [err,   setErr]   = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow]   = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!name || !email || !pass) { setErr("All fields are required."); return; }
    if (pass.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (pass !== conf) { setErr("Passwords do not match."); return; }
    setLoading(true);
    try {
      const r = await axios.post(`${API}/auth/signup`, { name, email, password: pass });
      onAuth(r.data.token, r.data.user);
    } catch(ex: any) { setErr(ex.response?.data?.message || "Sign up failed."); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell title="Create Account" subtitle="Join Adil Arms Management System" badge="✨ NEW ACCOUNT">
      <form onSubmit={submit}>
        {err && <div className="errbx">{err}</div>}
        <div className="fd" style={{marginBottom:14}}>
          <label>Full Name</label>
          <input placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/>
        </div>
        <div className="fd" style={{marginBottom:14}}>
          <label>Email Address</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/>
        </div>
        <div className="fd" style={{marginBottom:14}}>
          <label>Password</label>
          <div style={{position:"relative"}}>
            <input type={show?"text":"password"} placeholder="Min. 6 characters" value={pass} onChange={e=>setPass(e.target.value)} style={{paddingRight:44}} autoComplete="new-password"/>
            <button type="button" onClick={()=>setShow(!show)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--tx3)",fontSize:16}}>{show?"🙈":"👁️"}</button>
          </div>
        </div>
        <div className="fd" style={{marginBottom:20}}>
          <label>Confirm Password</label>
          <input type={show?"text":"password"} placeholder="Repeat password" value={conf} onChange={e=>setConf(e.target.value)} autoComplete="new-password"/>
        </div>
        <button className="pb" type="submit" disabled={loading} style={{width:"100%",justifyContent:"center",marginBottom:12}}>
          {loading ? "Creating account..." : "🚀 Create Account"}
        </button>
        <div className="au-div"><span>Already have an account?</span></div>
        <button type="button" className="sb" style={{width:"100%",textAlign:"center"}} onClick={goLogin}>Sign In</button>
      </form>
    </AuthShell>
  );
}

function ForgotPage({ goLogin }: { goLogin:()=>void }) {
  const [step,  setStep]  = useState<"email"|"reset"|"done">("email");
  const [email, setEmail] = useState("");
  const [code,  setCode]  = useState("");
  const [pass,  setPass]  = useState("");
  const [conf,  setConf]  = useState("");
  const [err,   setErr]   = useState("");
  const [info,  setInfo]  = useState("");
  const [loading, setLoading] = useState(false);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!email) { setErr("Email is required."); return; }
    setLoading(true);
    try {
      const r = await axios.post(`${API}/auth/forgot-password`, { email });
      // In dev mode the API returns the reset token directly
      if (r.data.resetToken) {
        setCode(r.data.resetToken);
        setInfo(`Your reset code is: ${r.data.resetToken} (shown here for demo)`);
      } else {
        setInfo(r.data.message);
      }
      setStep("reset");
    } catch(ex:any) { setErr(ex.response?.data?.message || "Request failed."); }
    finally { setLoading(false); }
  };

  const resetPass = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!code || !pass) { setErr("All fields are required."); return; }
    if (pass.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (pass !== conf) { setErr("Passwords do not match."); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { email, resetToken: code, newPassword: pass });
      setStep("done");
    } catch(ex:any) { setErr(ex.response?.data?.message || "Reset failed."); }
    finally { setLoading(false); }
  };

  if (step === "done") return (
    <AuthShell title="Password Reset!" subtitle="Your password has been updated successfully" badge="✅ SUCCESS">
      <div className="okbx" style={{textAlign:"center",marginBottom:20}}>You can now sign in with your new password.</div>
      <button className="pb" style={{width:"100%",justifyContent:"center"}} onClick={goLogin}>🔓 Go to Sign In</button>
    </AuthShell>
  );

  if (step === "reset") return (
    <AuthShell title="Reset Password" subtitle="Enter the code and your new password" badge="🔑 RESET CODE">
      <form onSubmit={resetPass}>
        {err  && <div className="errbx">{err}</div>}
        {info && <div className="okbx" style={{fontSize:12,wordBreak:"break-all"}}>{info}</div>}
        <div className="fd" style={{marginBottom:14}}>
          <label>Reset Code</label>
          <input placeholder="6-character code" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} style={{letterSpacing:4,textAlign:"center",fontFamily:"'JetBrains Mono',monospace"}}/>
        </div>
        <div className="fd" style={{marginBottom:14}}>
          <label>New Password</label>
          <input type="password" placeholder="Min. 6 characters" value={pass} onChange={e=>setPass(e.target.value)}/>
        </div>
        <div className="fd" style={{marginBottom:20}}>
          <label>Confirm New Password</label>
          <input type="password" placeholder="Repeat new password" value={conf} onChange={e=>setConf(e.target.value)}/>
        </div>
        <button className="pb" type="submit" disabled={loading} style={{width:"100%",justifyContent:"center",marginBottom:12}}>
          {loading ? "Resetting..." : "🔐 Reset Password"}
        </button>
        <button type="button" className="au-link" onClick={()=>setStep("email")}>← Back</button>
      </form>
    </AuthShell>
  );

  return (
    <AuthShell title="Forgot Password?" subtitle="Enter your email to receive a reset code" badge="📧 RECOVERY">
      <form onSubmit={sendCode}>
        {err && <div className="errbx">{err}</div>}
        <div className="fd" style={{marginBottom:20}}>
          <label>Email Address</label>
          <input type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/>
        </div>
        <button className="pb" type="submit" disabled={loading} style={{width:"100%",justifyContent:"center",marginBottom:12}}>
          {loading ? "Sending..." : "📨 Send Reset Code"}
        </button>
        <button type="button" className="au-link" onClick={goLogin}>← Back to Sign In</button>
      </form>
    </AuthShell>
  );
}

// ── NAV ───────────────────────────────────────────────────────────────────
const NAV = [
  {key:"dashboard",    icon:"🏠",label:"Dashboard"},
  {key:"stock",        icon:"📦",label:"Stock Management"},
  {key:"sales",        icon:"📝",label:"Sales Input"},
  {key:"monthly",      icon:"📊",label:"Monthly Records"},
  {key:"suppliers",    icon:"🤝",label:"Supplier Management"},
  {key:"ledger",       icon:"📒",label:"Ledger / Khata"},
  {key:"parties",      icon:"👥",label:"Party Management"},
  {key:"party-ledger", icon:"📖",label:"Khata Book"},
];

// ── APP ───────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]         = useState("dashboard");
  const [col,  setCol]          = useState(false);
  const [time, setTime]         = useState(new Date());
  const [authView, setAuthView] = useState<AuthView>("login");
  const [user, setUser]         = useState<{id:string;name:string;email:string}|null>(getUser);
  const [authed, setAuthed]     = useState<boolean>(!!getToken());
  const [partyLedgerId, setPartyLedgerId] = useState<string | undefined>(undefined);

  useEffect(() => { const t = setInterval(()=>setTime(new Date()),1000); return ()=>clearInterval(t); }, []);

  const onAuth = (token: string, u: {id:string;name:string;email:string}) => {
    setToken(token); saveUser(u); setUser(u); setAuthed(true);
  };
  const logout = () => { clearToken(); setUser(null); setAuthed(false); setAuthView("login"); };

  const renderPage = () => {
    switch(page){
      case "stock":         return <StockPage/>;
      case "sales":         return <SalesPage/>;
      case "monthly":       return <MonthlyPage/>;
      case "suppliers":     return <SupplierPage/>;
      case "ledger":        return <LedgerPage/>;
      case "parties":       return <PartyPage onViewLedger={(id)=>{ setPartyLedgerId(id); setPage("party-ledger"); }}/>;
      case "party-ledger":  return <PartyLedgerPage initialPartyId={partyLedgerId} onBack={()=>setPage("parties")}/>;
      default:              return <DashboardPage/>;
    }
  };

  // Show auth pages when not logged in
  if (!authed) {
    const authContent = authView === "signup"
      ? <SignupPage onAuth={onAuth} goLogin={()=>setAuthView("login")}/>
      : authView === "forgot"
      ? <ForgotPage goLogin={()=>setAuthView("login")}/>
      : <LoginPage  onAuth={onAuth} goSignup={()=>setAuthView("signup")} goForgot={()=>setAuthView("forgot")}/>;
    return (
      <>
        <style>{`
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&family=Playfair+Display:ital,wght@0,700;1,400&display=swap');
:root{--bg:#0b0d11;--bg3:#161a24;--gl:rgba(22,26,36,.55);--gb:rgba(201,168,76,.12);--g:#c9a84c;--gl2:#e8d48b;--gd:#8b7332;--gn:#34d399;--rd:#f87171;--bl:#60a5fa;--pr:#a78bfa;--tx:#e8e4dc;--tx2:#9a9488;--tx3:#5a5549;--bd:rgba(255,255,255,.06)}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{font-size:14px}
body{background:var(--bg);font-family:'Outfit',sans-serif;color:var(--tx)}
@keyframes floatUp{0%{transform:translateY(0) scale(1);opacity:0}10%{opacity:.3}90%{opacity:.1}100%{transform:translateY(-100vh) scale(.5);opacity:0}}
@keyframes lPulse{0%,100%{box-shadow:0 4px 20px rgba(201,168,76,.3)}50%{box-shadow:0 4px 30px rgba(201,168,76,.5)}}
@keyframes lShine{0%{transform:translateX(-100%) rotate(25deg)}50%,100%{transform:translateX(100%) rotate(25deg)}}
@keyframes cardE{from{opacity:0;transform:translateY(32px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
.au-bg{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(ellipse at 30% 20%,rgba(201,168,76,.06),transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(96,165,250,.04),transparent 50%),var(--bg);position:relative;overflow:hidden}
.au-card{background:rgba(22,26,36,.8);border:1px solid var(--gb);border-radius:24px;padding:40px 36px;width:100%;max-width:440px;backdrop-filter:blur(20px);box-shadow:0 32px 80px rgba(0,0,0,.5);animation:cardE .5s cubic-bezier(.22,1,.36,1);position:relative;z-index:1}
.au-logo{margin-bottom:24px}
.lg-i{width:42px;height:42px;min-width:42px;background:linear-gradient(135deg,var(--g),var(--gd));border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:var(--bg);box-shadow:0 4px 20px rgba(201,168,76,.3);animation:lPulse 3s ease-in-out infinite;position:relative;overflow:hidden}
.lg-i::after{content:'';position:absolute;inset:-50%;background:linear-gradient(45deg,transparent 40%,rgba(255,255,255,.3) 50%,transparent 60%);animation:lShine 3s ease-in-out infinite}
.lg-n{font-weight:700;font-size:17px;background:linear-gradient(135deg,var(--gl2),var(--g));-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:1px}
.lg-s{font-size:10px;color:var(--tx3);letter-spacing:2px;text-transform:uppercase}
.pgBadge{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:3px;color:var(--g);background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.2);padding:5px 14px;border-radius:20px;margin-bottom:14px}
.au-title{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;background:linear-gradient(135deg,var(--tx),var(--gl2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px;text-align:center}
.au-sub{color:var(--tx3);font-size:13px;text-align:center;margin-bottom:24px}
.au-link{background:none;border:none;color:var(--g);font-family:'Outfit',sans-serif;font-size:13px;cursor:pointer;display:block;width:100%;text-align:center;padding:8px;transition:opacity .2s}
.au-link:hover{opacity:.7}
.au-div{display:flex;align-items:center;gap:12px;margin:16px 0}
.au-div::before,.au-div::after{content:'';flex:1;height:1px;background:var(--bd)}
.au-div span{font-size:11px;color:var(--tx3);white-space:nowrap}
.fd{display:flex;flex-direction:column;gap:6px}
.fd label{font-size:11.5px;font-weight:500;color:var(--tx2);letter-spacing:.5px;text-transform:uppercase}
.fd input{padding:12px 14px;background:rgba(0,0,0,.3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-family:'Outfit',sans-serif;font-size:13.5px;transition:all .3s;outline:none;width:100%}
.fd input:focus{border-color:var(--g);box-shadow:0 0 0 3px rgba(201,168,76,.1)}
.pb{padding:13px 28px;background:linear-gradient(135deg,var(--g),var(--gd));border:none;border-radius:12px;color:var(--bg);font-family:'Outfit',sans-serif;font-weight:600;font-size:13.5px;cursor:pointer;transition:all .3s;display:flex;align-items:center;gap:8px;box-shadow:0 4px 16px rgba(201,168,76,.25)}
.pb:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(201,168,76,.35)}
.pb:disabled{opacity:.4;cursor:default;transform:none}
.sb{padding:13px 28px;background:transparent;border:1px solid var(--gb);border-radius:12px;color:var(--tx2);font-family:'Outfit',sans-serif;font-weight:500;font-size:13.5px;cursor:pointer;transition:all .3s}
.sb:hover{border-color:var(--g);color:var(--g)}
.errbx{background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.3);color:var(--rd);padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px}
.okbx{background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.3);color:var(--gn);padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px}
        `}</style>
        {authContent}
      </>
    );
  }

  return (
    <>
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&family=Playfair+Display:ital,wght@0,700;1,400&display=swap');
:root{--bg:#0b0d11;--bg2:#10131a;--bg3:#161a24;--gl:rgba(22,26,36,.55);--gb:rgba(201,168,76,.12);--g:#c9a84c;--gl2:#e8d48b;--gd:#8b7332;--gn:#34d399;--rd:#f87171;--bl:#60a5fa;--pr:#a78bfa;--or:#fb923c;--tx:#e8e4dc;--tx2:#9a9488;--tx3:#5a5549;--bd:rgba(255,255,255,.06);--sw:260px;--sc:78px}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{font-size:14px}
@keyframes floatUp{0%{transform:translateY(0) scale(1);opacity:0}10%{opacity:.3}90%{opacity:.1}100%{transform:translateY(-100vh) scale(.5);opacity:0}}
@keyframes cardE{from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes pgE{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeS{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
@keyframes rowE{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@keyframes barG{from{transform:scaleY(0);opacity:0}to{transform:scaleY(1);opacity:1}}
@keyframes fadeI{from{opacity:0}to{opacity:1}}
@keyframes modE{from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}
@keyframes lPulse{0%,100%{box-shadow:0 4px 20px rgba(201,168,76,.3)}50%{box-shadow:0 4px 30px rgba(201,168,76,.5)}}
@keyframes lShine{0%{transform:translateX(-100%) rotate(25deg)}50%,100%{transform:translateX(100%) rotate(25deg)}}
@keyframes orbF{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,-15px) scale(1.1)}}
.app{display:flex;min-height:100vh;background:var(--bg);font-family:'Outfit',sans-serif;color:var(--tx);overflow:hidden}
.sb-w{width:var(--sw);min-height:100vh;background:linear-gradient(180deg,rgba(16,19,26,.98),rgba(11,13,17,.99));border-right:1px solid var(--gb);display:flex;flex-direction:column;position:fixed;left:0;top:0;bottom:0;z-index:100;transition:width .4s cubic-bezier(.22,1,.36,1);backdrop-filter:blur(20px)}
.sb-w.cl{width:var(--sc)}
.sb-w::before{content:'';position:absolute;top:0;right:0;width:1px;height:100%;background:linear-gradient(180deg,transparent,var(--g),transparent);opacity:.2}
.sb-tg{position:absolute;top:28px;right:-14px;width:28px;height:28px;background:var(--bg3);border:1px solid var(--gb);border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--g);font-size:12px;transition:all .3s;z-index:110;box-shadow:0 2px 10px rgba(0,0,0,.3)}
.sb-tg:hover{background:var(--g);color:var(--bg)}
.sb-hd{padding:24px 20px;display:flex;align-items:center;gap:14px;border-bottom:1px solid var(--bd);position:relative}
.sb-hd::after{content:'';position:absolute;bottom:0;left:20px;right:20px;height:1px;background:linear-gradient(90deg,transparent,var(--gd),transparent)}
.lg-i{width:42px;height:42px;min-width:42px;background:linear-gradient(135deg,var(--g),var(--gd));border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:var(--bg);box-shadow:0 4px 20px rgba(201,168,76,.3);animation:lPulse 3s ease-in-out infinite;position:relative;overflow:hidden}
.lg-i::after{content:'';position:absolute;inset:-50%;background:linear-gradient(45deg,transparent 40%,rgba(255,255,255,.3) 50%,transparent 60%);animation:lShine 3s ease-in-out infinite}
.lg-t{overflow:hidden;white-space:nowrap}
.lg-n{font-weight:700;font-size:17px;background:linear-gradient(135deg,var(--gl2),var(--g));-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:1px}
.lg-s{font-size:10px;color:var(--tx3);letter-spacing:2px;text-transform:uppercase;margin-top:2px}
.cl .lg-t,.cl .ui{display:none}
.nv{flex:1;padding:16px 12px;display:flex;flex-direction:column;gap:4px}
.ni{display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:10px;cursor:pointer;color:var(--tx2);font-weight:400;font-size:13.5px;transition:all .3s;position:relative;overflow:hidden;border:1px solid transparent}
.ni::before{content:'';position:absolute;left:0;top:50%;width:3px;height:0;border-radius:0 2px 2px 0;background:var(--g);transform:translateY(-50%);transition:height .3s}
.ni:hover{background:rgba(201,168,76,.06);color:var(--tx);border-color:var(--gb)}
.ni.ac{background:linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.04));color:var(--g);border-color:rgba(201,168,76,.2);font-weight:500;box-shadow:0 2px 20px rgba(201,168,76,.08)}
.ni.ac::before{height:60%}
.nIc{font-size:18px;min-width:24px;text-align:center}
.nLb{white-space:nowrap;overflow:hidden}
.cl .nLb{display:none}
.sb-ft{padding:16px 20px;border-top:1px solid var(--bd);display:flex;align-items:center;gap:12px}
.av{width:38px;height:38px;min-width:38px;border-radius:50%;background:linear-gradient(135deg,var(--pr),var(--bl));display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;color:#fff;box-shadow:0 2px 12px rgba(167,139,250,.3)}
.un{font-weight:600;font-size:13px;color:var(--tx)}
.ur{font-size:10.5px;color:var(--tx3);letter-spacing:1px;text-transform:uppercase}
.mn{flex:1;margin-left:var(--sw);transition:margin-left .4s cubic-bezier(.22,1,.36,1);position:relative;z-index:1;min-height:100vh;overflow-y:auto;background:radial-gradient(ellipse at 70% 10%,rgba(201,168,76,.03),transparent 50%),radial-gradient(ellipse at 20% 80%,rgba(96,165,250,.02),transparent 50%),var(--bg)}
.mn.sh{margin-left:var(--sc)}
.mn::-webkit-scrollbar{width:6px}.mn::-webkit-scrollbar-track{background:transparent}.mn::-webkit-scrollbar-thumb{background:var(--gd);border-radius:3px}.mn::-webkit-scrollbar-thumb:hover{background:var(--g)}
.tp{position:sticky;top:0;z-index:50;padding:14px 32px;background:rgba(11,13,17,.8);backdrop-filter:blur(16px);border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between}
.tpL{display:flex;align-items:center;gap:12px}
.bcp{font-size:12px;color:var(--tx3);letter-spacing:1px;text-transform:uppercase}
.bcp span{color:var(--g)}
.tpR{display:flex;align-items:center;gap:20px}
.ck{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--tx2);letter-spacing:1px}
.nb{width:36px;height:36px;background:var(--gl);border:1px solid var(--bd);border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;position:relative;transition:all .3s}
.nb:hover{border-color:var(--g);background:rgba(201,168,76,.08)}
.nd{position:absolute;top:6px;right:6px;width:7px;height:7px;background:var(--rd);border-radius:50%;animation:pulse 2s infinite}
.pg{padding:0 32px 40px}.pgE{animation:pgE .5s ease forwards}
.pgH{position:relative;margin:0 -32px 28px;padding:48px 40px 40px;overflow:hidden;border-bottom:1px solid var(--gb)}
.pgHBg{position:absolute;inset:0;background:linear-gradient(135deg,rgba(201,168,76,.06),rgba(11,13,17,.8) 40%,rgba(96,165,250,.03))}
.pgHC{position:relative;z-index:2}
.pgBadge{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:3px;color:var(--g);background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.2);padding:5px 14px;border-radius:20px;margin-bottom:14px}
.pgT{font-family:'Playfair Display',serif;font-size:36px;font-weight:700;background:linear-gradient(135deg,var(--tx),var(--gl2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.pgS{color:var(--tx2);font-size:14.5px;font-weight:300}
.orb{position:absolute;border-radius:50%;filter:blur(60px);animation:orbF 6s ease-in-out infinite}
.o1{width:200px;height:200px;top:-60px;right:10%;background:rgba(201,168,76,.08)}
.o2{width:150px;height:150px;bottom:-40px;right:30%;background:rgba(96,165,250,.05);animation-delay:3s}
.stG{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:28px}
.stG3{grid-template-columns:repeat(3,1fr)}
.sc3d{background:var(--gl);border:1px solid var(--gb);border-radius:16px;padding:24px;position:relative;overflow:hidden;cursor:pointer;transition:all .4s cubic-bezier(.22,1,.36,1);animation:cardE .6s ease forwards;opacity:0;backdrop-filter:blur(10px)}
.sc3d:hover{transform:translateY(-6px) rotateX(4deg);border-color:var(--ac);box-shadow:0 20px 40px rgba(0,0,0,.3),0 0 30px color-mix(in srgb,var(--ac) 15%,transparent)}
.sc3d-glow{position:absolute;top:-20px;right:-20px;width:100px;height:100px;background:radial-gradient(circle,var(--ac),transparent 70%);opacity:.08;transition:opacity .4s}
.sc3d:hover .sc3d-glow{opacity:.15}
.sc3d-shine{position:absolute;inset:-100%;background:linear-gradient(45deg,transparent 40%,rgba(255,255,255,.05) 50%,transparent 60%);transition:transform .6s}
.sc3d:hover .sc3d-shine{transform:translateX(80%)}
.sc3d-icon{font-size:28px;margin-bottom:14px}
.sc3d-val{font-weight:700;font-size:28px;color:var(--tx);margin-bottom:6px}
.sc3d-lbl{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2.5px;color:var(--tx3);text-transform:uppercase}
.gc{background:var(--gl);border:1px solid var(--gb);border-radius:16px;padding:24px;backdrop-filter:blur(10px);margin-bottom:20px;transition:border-color .3s}
.gc:hover{border-color:rgba(201,168,76,.2)}
.gcE{animation:cardE .6s ease forwards;opacity:0}
.ch{display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--bd)}
.ch h3{font-weight:600;font-size:15px;color:var(--tx);flex:1}
.chi{font-size:18px}
.dg2{display:grid;grid-template-columns:1.4fr 1fr;gap:20px;margin-bottom:20px}
.al{display:flex;flex-direction:column;gap:4px}
.ai{display:flex;align-items:flex-start;gap:14px;padding:14px;border-radius:10px;transition:all .3s;animation:fadeS .5s ease forwards;opacity:0;border:1px solid transparent}
.ai:hover{background:rgba(201,168,76,.04);border-color:var(--gb)}
.aiI{width:40px;height:40px;min-width:40px;border-radius:10px;background:rgba(201,168,76,.08);display:flex;align-items:center;justify-content:center;font-size:18px}
.aiT{font-weight:600;font-size:13.5px;color:var(--tx);margin-bottom:3px}
.aiD{font-size:12.5px;color:var(--tx2);margin-bottom:3px}
.aiTm{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--tx3)}
.qa{display:flex;flex-direction:column;gap:8px}
.qb{display:flex;align-items:center;gap:12px;padding:14px 18px;background:rgba(255,255,255,.02);border:1px solid var(--bd);border-radius:10px;cursor:pointer;color:var(--tx);font-family:'Outfit',sans-serif;font-size:13.5px;font-weight:500;transition:all .3s;animation:fadeS .5s ease forwards;opacity:0;position:relative;overflow:hidden}
.qb::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--bc);opacity:0;transition:opacity .3s}
.qb:hover{background:rgba(201,168,76,.06);border-color:var(--bc);transform:translateX(4px)}
.qb:hover::before{opacity:1}
.qbI{font-size:18px}.qbL{flex:1}.qbA{color:var(--tx3);transition:all .3s}
.qb:hover .qbA{color:var(--bc);transform:translateX(4px)}
.bc{display:flex;align-items:flex-end;gap:10px;height:120px;padding-top:12px}
.bcC{flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end}
.bcB{width:100%;min-width:20px;background:linear-gradient(180deg,var(--g),var(--gd));border-radius:6px 6px 2px 2px;animation:barG .8s ease forwards;transform-origin:bottom;opacity:0;transition:filter .3s}
.bcB:hover{filter:brightness(1.3)}
.bcL{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--tx3);margin-top:8px;letter-spacing:1px}
.tb{display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap;align-items:center}
.sw{flex:1;min-width:260px;position:relative}
.si{position:absolute;left:16px;top:50%;transform:translateY(-50%);font-size:14px}
.sin{width:100%;padding:13px 16px 13px 44px;background:var(--gl);border:1px solid var(--gb);border-radius:12px;color:var(--tx);font-family:'Outfit',sans-serif;font-size:13.5px;transition:all .3s;outline:none}
.sin::placeholder{color:var(--tx3)}
.sin:focus{border-color:var(--g);box-shadow:0 0 0 3px rgba(201,168,76,.1)}
.pb{padding:13px 28px;background:linear-gradient(135deg,var(--g),var(--gd));border:none;border-radius:12px;color:var(--bg);font-family:'Outfit',sans-serif;font-weight:600;font-size:13.5px;cursor:pointer;transition:all .3s;display:flex;align-items:center;gap:8px;white-space:nowrap;box-shadow:0 4px 16px rgba(201,168,76,.25);position:relative;overflow:hidden}
.pb::after{content:'';position:absolute;inset:-100%;background:linear-gradient(45deg,transparent 40%,rgba(255,255,255,.2) 50%,transparent 60%);transition:transform .5s}
.pb:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(201,168,76,.35)}
.pb:hover::after{transform:translateX(80%)}
.pb:disabled{opacity:.4;cursor:default;transform:none}
.sb{padding:13px 28px;background:transparent;border:1px solid var(--gb);border-radius:12px;color:var(--tx2);font-family:'Outfit',sans-serif;font-weight:500;font-size:13.5px;cursor:pointer;transition:all .3s}
.sb:hover{border-color:var(--g);color:var(--g)}
.aib{width:100%;padding:14px;background:linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.04));border:1px dashed rgba(201,168,76,.3);border-radius:12px;color:var(--g);font-family:'Outfit',sans-serif;font-weight:600;font-size:13.5px;cursor:pointer;margin-top:16px;transition:all .3s}
.aib:hover{background:rgba(201,168,76,.15);border-style:solid}
.rb{width:100%;justify-content:center;margin-top:16px;font-size:15px;padding:16px}
.tw{overflow-x:auto}
.tbl{width:100%;border-collapse:separate;border-spacing:0}
.tbl thead th{padding:14px 16px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:var(--tx3);border-bottom:1px solid var(--bd);background:rgba(0,0,0,.2)}
.tbl thead th:first-child{border-radius:8px 0 0 0}.tbl thead th:last-child{border-radius:0 8px 0 0}
.tr{animation:rowE .4s ease forwards;opacity:0}
.tbl tbody td{padding:14px 16px;font-size:13px;border-bottom:1px solid var(--bd);transition:background .2s}
.tbl tbody tr:hover td{background:rgba(201,168,76,.03)}
.tbl tbody tr:last-child td{border-bottom:none}
.mono{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--tx2)}
.emp{text-align:center;padding:48px 16px!important;color:var(--tx3);font-style:italic}
.st{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:.5px}
.st-instock{background:rgba(52,211,153,.12);color:var(--gn)}
.st-lowstock{background:rgba(251,146,60,.12);color:var(--or)}
.st-outofstock{background:rgba(248,113,113,.12);color:var(--rd)}
.badge{display:inline-block;padding:4px 12px;background:rgba(201,168,76,.12);color:var(--g);border-radius:20px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:500}
.bsm{padding:3px 10px;font-size:10px}
.abs{display:flex;gap:6px}
.ib{width:32px;height:32px;background:rgba(255,255,255,.03);border:1px solid var(--bd);border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all .3s}
.ie:hover{border-color:var(--bl);background:rgba(96,165,250,.1)}
.id:hover{border-color:var(--rd);background:rgba(248,113,113,.1)}
.tg{color:var(--gn);font-weight:600}.tgd{color:var(--g);font-weight:600}.tmut{color:var(--tx3);font-size:12px}
.fg{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.fs{display:flex;flex-direction:column;gap:16px}
.fr{display:flex;gap:16px;flex-wrap:wrap}
.fd{display:flex;flex-direction:column;gap:6px}
.fd label{font-size:11.5px;font-weight:500;color:var(--tx2);letter-spacing:.5px;text-transform:uppercase}
.fd input,.fd select{padding:12px 14px;background:rgba(0,0,0,.3);border:1px solid var(--bd);border-radius:10px;color:var(--tx);font-family:'Outfit',sans-serif;font-size:13.5px;transition:all .3s;outline:none}
.fd input:focus,.fd select:focus{border-color:var(--g);box-shadow:0 0 0 3px rgba(201,168,76,.1)}
.fd select{cursor:pointer}.fd select option{background:var(--bg3);color:var(--tx)}
.sli{display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(201,168,76,.04);border:1px solid var(--gb);border-radius:10px;margin-bottom:8px;font-size:13px}
.sum{margin:20px 0}.sumR{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px;color:var(--tx2)}
.sumD{height:1px;background:var(--bd);margin:16px 0}
.sumT{display:flex;justify-content:space-between;align-items:center}
.tv{font-weight:700;font-size:24px;background:linear-gradient(135deg,var(--gl2),var(--g));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.mo-over{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:1000;animation:fadeI .3s ease}
.mo-box{background:var(--bg3);border:1px solid var(--gb);border-radius:20px;width:90%;max-width:560px;box-shadow:0 24px 80px rgba(0,0,0,.6);animation:modE .4s cubic-bezier(.22,1,.36,1)}
.mo-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--bd)}
.mo-head h3{font-weight:600;font-size:17px}
.mo-x{width:32px;height:32px;background:rgba(255,255,255,.04);border:1px solid var(--bd);border-radius:8px;cursor:pointer;color:var(--tx2);font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .3s}
.mo-x:hover{border-color:var(--rd);color:var(--rd);background:rgba(248,113,113,.1)}
.mo-body{padding:24px}
.ma{display:flex;gap:12px;justify-content:flex-end;margin-top:24px;padding-top:20px;border-top:1px solid var(--bd)}
.ldg{padding:32px;text-align:center;color:var(--tx3);font-style:italic}
.errbx{background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.3);color:var(--rd);padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px}
.okbx{background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.3);color:var(--gn);padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:16px}
@media(max-width:1100px){.stG{grid-template-columns:repeat(2,1fr)}}
@media(max-width:900px){.dg2{grid-template-columns:1fr}}
@media(max-width:768px){.sb-w{width:var(--sc)}.mn{margin-left:var(--sc)}.nLb,.lg-t,.ui{display:none}.pg{padding:0 16px 24px}.pgH{margin:0 -16px 20px;padding:32px 20px}.pgT{font-size:26px}.tp{padding:12px 16px}.fr{flex-direction:column}.fg{grid-template-columns:1fr}}
@media(max-width:600px){.stG,.stG3{grid-template-columns:1fr}}
      `}</style>
      <div className="app">
        <Particles/>
        <aside className={`sb-w ${col?"cl":""}`}>
          <button className="sb-tg" onClick={()=>setCol(!col)}>{col?"▸":"◂"}</button>
          <div className="sb-hd">
            <div className="lg-i">AA</div>
            <div className="lg-t"><div className="lg-n">Adil Arms</div><div className="lg-s">Management System</div></div>
          </div>
          <nav className="nv">{NAV.map(n=>(
            <div key={n.key} className={`ni ${page===n.key?"ac":""}`} onClick={()=>setPage(n.key)}>
              <span className="nIc">{n.icon}</span><span className="nLb">{n.label}</span>
            </div>
          ))}</nav>
          <div className="sb-ft">
            <div className="av">{user?.name?.[0]?.toUpperCase() || "A"}</div>
            <div className="ui">
              <div className="un">{user?.name || "Admin"}</div>
              <div className="ur">{user?.email || "System Administrator"}</div>
            </div>
          </div>
          <div style={{padding:"0 12px 12px"}}>
            <button onClick={logout} style={{width:"100%",padding:"10px",background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:10,color:"var(--rd)",fontFamily:"'Outfit',sans-serif",fontSize:12,cursor:"pointer",transition:"all .3s",display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onMouseOver={e=>(e.currentTarget.style.background="rgba(248,113,113,.15)")} onMouseOut={e=>(e.currentTarget.style.background="rgba(248,113,113,.08)")}>
              🚪 Sign Out
            </button>
          </div>
        </aside>
        <main className={`mn ${col?"sh":""}`}>
          <div className="tp">
            <div className="tpL"><div className="bcp">Adil Arms / <span>{NAV.find(n=>n.key===page)?.label}</span></div></div>
            <div className="tpR">
              <div className="ck">{time.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div>
              <button className="nb">🔔<span className="nd"/></button>
            </div>
          </div>
          <div key={page}>{renderPage()}</div>
        </main>
      </div>
    </>
  );
}
