import { useEffect, useMemo, useState } from "react";

import {

  LayoutDashboard, Package, Boxes, ShoppingCart, BarChart3,

  Users, Settings, Search, Bell, Plus, ArrowUpRight,

  ArrowDownRight, Gem, Menu, CircleAlert, IndianRupee,

  Database, X, RefreshCw, Save, Eye, Pencil, Trash2

} from "lucide-react";

import { supabase } from "./supabase";

import "./App.css";

const menu = [

  { label: "Dashboard", icon: LayoutDashboard },

  { label: "Products", icon: Package },

  { label: "Inventory", icon: Boxes },

  { label: "Sales", icon: ShoppingCart },

  { label: "Reports", icon: BarChart3 },

  { label: "Staff", icon: Users },

  { label: "Settings", icon: Settings },

];

const initialForm = {

  // Enter the barcode printed/provided by the supplier; it is never auto-generated.

  barcode_id: "",

  sku: "",

  item_name: "",

  category: "Ring",

  metal_type: "Gold",

  purity: "22K",

  gross_weight_g: "",

  net_weight_g: "",

  stone_weight_g: "0",

  diamond_carat: "0",

  diamond_clarity: "",

  diamond_color: "",

  making_charge_type: "fixed",

  making_charge: "0",

  purchase_price: "0",

  selling_price: "0",

  stock_quantity: "1",

  supplier_name: "",

  design_code: "",

  description: "",

  status: "available",

};

export default function App() {

  const [page, setPage] = useState("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [stock, setStock] = useState([]);

  const [dbStatus, setDbStatus] = useState("Connecting...");

  const [dbError, setDbError] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [modal, setModal] = useState("");

  const [form, setForm] = useState(initialForm);

  const [editingItem, setEditingItem] = useState(null);

  const [search, setSearch] = useState("");

  const [selectedItem, setSelectedItem] = useState(null);

  const [quantity, setQuantity] = useState("1");

  const [message, setMessage] = useState("");

  const [sales, setSales] = useState([]);

  const [profiles, setProfiles] = useState([]);

  const [currentRole, setCurrentRole] = useState("staff");

  const [businessSettings, setBusinessSettings] = useState({id:1,business_name:"Nakoda Jewellers",phone:"",email:"",address:"",gst_number:"",low_stock_threshold:1});

  const [saleForm, setSaleForm] = useState({stock_item_id:"",quantity:"1",customer_name:"",customer_phone:"",unit_price:""});

  const [reportRange, setReportRange] = useState("month");

  const [pageLoading, setPageLoading] = useState(false);

  const [stockMovements, setStockMovements] = useState([]);

  const [movementLoading, setMovementLoading] = useState(false);

  async function loadStock() {

    setLoading(true);

    setDbError("");

    try {

      const { data, error } = await supabase

        .from("stock_items")

        .select("*")

        .order("created_at", { ascending: false });

      if (error) throw error;

      setStock(data || []);

      setDbStatus("Connected");

    } catch (error) {

      console.error("Stock loading error:", error);

      setDbStatus("Connection failed");

      setDbError(error.message);

    } finally {

      setLoading(false);

    }

  }

  useEffect(() => { loadStock(); }, []);

  useEffect(() => {

    if (page === "Sales" || page === "Reports") loadSales();

    if (page === "Inventory") loadStockMovements();

    if (page === "Staff") loadStaff();

    if (page === "Settings") loadSettings();

  }, [page]);

  async function getRole() {

    const {data:{user}} = await supabase.auth.getUser();

    if (!user) return "staff";

    const {data,error} = await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();

    if (error) throw error;

    const role=data?.role || "staff"; setCurrentRole(role); return role;

  }

  async function loadSales() {

    setPageLoading(true);

    try { const {data,error}=await supabase.from("sales").select("*").order("created_at",{ascending:false}); if(error) throw error; setSales(data||[]); }

    catch(e){ alert("Could not load sales: "+e.message); } finally { setPageLoading(false); }

  }

  async function loadStockMovements() {

    setMovementLoading(true);

    try {

      const { data, error } = await supabase

        .from("stock_movements")

        .select("id, stock_item_id, barcode_id, item_name, movement_type, quantity, previous_quantity, new_quantity, note, performed_by, created_at")

        .order("created_at", { ascending: false })

        .limit(100);

      if (error) throw error;

      setStockMovements(data || []);

    } catch (error) {

      console.error("Stock movement history error:", error);

      // Keep the inventory screen usable if the history migration has not been run yet.

      setStockMovements([]);

    } finally {

      setMovementLoading(false);

    }

  }

  async function loadStaff() {

    setPageLoading(true);

    try { const role=await getRole(); if(role!=="admin"){setProfiles([]);return;}

      const {data,error}=await supabase.from("profiles").select("id,full_name,role,created_at").order("created_at",{ascending:false});

      if(error) throw error; setProfiles(data||[]);

    } catch(e){alert("Could not load staff: "+e.message);} finally{setPageLoading(false);}

  }

  async function loadSettings() {

    setPageLoading(true);

    try { await getRole(); const {data,error}=await supabase.from("business_settings").select("*").eq("id",1).maybeSingle(); if(error) throw error; if(data)setBusinessSettings(data); }

    catch(e){alert("Could not load settings: "+e.message);} finally{setPageLoading(false);}

  }

  async function submitSale(e) {

    e.preventDefault();

    if (saving) return;

    const qty = Number(saleForm.quantity);

    const price = Number(saleForm.unit_price);

    const selectedItem = stock.find(item => item.id === saleForm.stock_item_id);

    const availableQty = Number(selectedItem?.stock_quantity || 0);

    if (!selectedItem) {

      alert("Please select an available product.");

      return;

    }

    if (!Number.isFinite(qty) || qty <= 0) {

      alert("Sale quantity must be greater than zero.");

      return;

    }

    if (!Number.isFinite(price) || price < 0) {

      alert("Selling price cannot be negative.");

      return;

    }

    // Frontend validation gives immediate feedback. The database RPC repeats

    // this check under a row lock to prevent concurrent overselling.

    if (qty > availableQty) {

      alert(`Insufficient stock. Available quantity: ${availableQty}`);

      return;

    }

    setSaving(true);

    try {

      const { data: saleId, error } = await supabase.rpc(

        "create_jewellery_sale",

        {

          p_stock_item_id: saleForm.stock_item_id,

          p_quantity: qty,

          p_unit_price: price,

          p_customer_name: saleForm.customer_name.trim() || null,

          p_customer_phone: saleForm.customer_phone.trim() || null,

        }

      );

      if (error) throw error;

      if (!saleId) throw new Error("Sale was not confirmed by the database.");

      setSaleForm({

        stock_item_id: "",

        quantity: "1",

        customer_name: "",

        customer_phone: "",

        unit_price: "",

      });

      await Promise.all([loadStock(), loadSales()]);

      alert(`Sale saved successfully.\nReceipt ID: ${saleId}\nQuantity sold: ${qty}\nRemaining stock: ${availableQty - qty}`);

    } catch (e) {

      console.error("Sale transaction failed:", e);

      alert("Sale failed: " + (e.message || "Unknown database error"));

    } finally {

      setSaving(false);

    }

  }

  async function changeStaffRole(id,role) {

    if(currentRole!=="admin") return alert("Admin access required.");

    if(!window.confirm("Change this user's role to "+role+"?")) return;

    const {error}=await supabase.from("profiles").update({role}).eq("id",id);

    if(error) alert(error.message); else loadStaff();

  }

  async function saveBusinessSettings(e) {

    e.preventDefault(); if(currentRole!=="admin") return alert("Admin access required."); setSaving(true);

    try { const payload={...businessSettings,id:1,low_stock_threshold:Number(businessSettings.low_stock_threshold||1),updated_at:new Date().toISOString()};

      const {error}=await supabase.from("business_settings").upsert(payload,{onConflict:"id"}); if(error)throw error; alert("Settings saved.");

    } catch(e){alert("Settings save failed: "+e.message);} finally{setSaving(false);}

  }

  // Calendar-based reporting in the browser's local timezone.

  const filteredSales = useMemo(() => {

    const now = new Date();

    const start = new Date(now);

    start.setHours(0, 0, 0, 0);

    if (reportRange === "week") {

      const daysSinceMonday = (start.getDay() + 6) % 7;

      start.setDate(start.getDate() - daysSinceMonday);

    } else if (reportRange === "month") {

      start.setDate(1);

    }

    return sales.filter((sale) => {

      const saleDate = new Date(sale.created_at);

      return reportRange === "all" || (saleDate >= start && saleDate <= now);

    });

  }, [sales, reportRange]);

  const reportRevenue=filteredSales.reduce((n,x)=>n+Number(x.total_amount||0),0);

  const reportUnits=filteredSales.reduce((n,x)=>n+Number(x.quantity||0),0);

  function exportSalesCsv() {

    const rows = [["Date", "Barcode", "Product", "Quantity", "Unit Price", "Total", "Customer", "Phone"],

      ...filteredSales.map(x => [x.created_at, x.barcode_id, x.item_name, x.quantity, x.unit_price, x.total_amount, x.customer_name || "", x.customer_phone || ""])];

    // Quote CSV cells and neutralize spreadsheet formula injection from user-entered text.

    const csv = rows.map(row => row.map(value => {

      let cell = String(value ?? "");

      if (/^[\s]*[=+@-]/.test(cell) && !/^\s*-?\d+(\.\d+)?$/.test(cell)) cell = "'" + cell;

      return '"' + cell.replaceAll('"', '""') + '"';

    }).join(",")).join("\r\n");

    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a"); a.href = url; a.download = `nakoda-sales-${reportRange}-report.csv`;

    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);

  }

  const filteredStock = useMemo(() => {

    const term = search.toLowerCase();

    return stock.filter((item) =>

      [

        item.item_name,

        item.barcode_id,

        item.sku,

        item.category,

        item.metal_type,

      ].some((value) => String(value || "").toLowerCase().includes(term))

    );

  }, [stock, search]);

  const totalProducts = stock.length;

  const goldWeight = stock

    .filter((item) => item.metal_type?.toLowerCase() === "gold")

    .reduce((sum, item) => sum + Number(item.net_weight_g || 0) * Number(item.stock_quantity || 0), 0);

  const silverWeight = stock

    .filter((item) => item.metal_type?.toLowerCase() === "silver")

    .reduce((sum, item) => sum + Number(item.net_weight_g || 0) * Number(item.stock_quantity || 0), 0);

  const totalValue = stock.reduce(

    (sum, item) =>

      sum + Number(item.selling_price || 0) * Number(item.stock_quantity || 0),

    0

  );

  function openAddProduct() {

    setEditingItem(null);

    setForm(initialForm);

    setMessage("");

    setModal("add");

  }

  function openEditProduct(item) {

    setEditingItem(item);

    setMessage("");

    setForm({

      ...initialForm,

      ...item,

      barcode_id: item.barcode_id || "",

      sku: item.sku || "",

      item_name: item.item_name || "",

      gross_weight_g: String(item.gross_weight_g ?? ""),

      net_weight_g: String(item.net_weight_g ?? ""),

      stone_weight_g: String(item.stone_weight_g ?? "0"),

      diamond_carat: String(item.diamond_carat ?? "0"),

      making_charge: String(item.making_charge ?? "0"),

      purchase_price: String(item.purchase_price ?? "0"),

      selling_price: String(item.selling_price ?? "0"),

      stock_quantity: String(item.stock_quantity ?? "0"),

      supplier_name: item.supplier_name || "",

      design_code: item.design_code || "",

      description: item.description || "",

    });

    setModal("edit");

  }

  function updateForm(e) {

    const { name, value } = e.target;

    setForm((previous) => ({ ...previous, [name]: value }));

  }

  async function saveProduct(e) {

    e.preventDefault();

    setSaving(true);

    setMessage("");

    try {

      const {

        data: { user },

        error: authError,

      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) throw new Error("Please login again.");

      if (!form.barcode_id.trim()) {

        throw new Error("Barcode ID is required. Enter the barcode provided by your supplier.");

      }

      if (!form.item_name.trim()) {

        throw new Error("Product name is required.");

      }

      const payload = {

        ...form,

        // Preserve the exact supplier barcode; never generate a new barcode.

        barcode_id: form.barcode_id.trim(),

        item_name: form.item_name.trim(),

        gross_weight_g: Number(form.gross_weight_g || 0),

        net_weight_g: Number(form.net_weight_g || 0),

        stone_weight_g: Number(form.stone_weight_g || 0),

        diamond_carat: Number(form.diamond_carat || 0),

        making_charge: Number(form.making_charge || 0),

        purchase_price: Number(form.purchase_price || 0),

        selling_price: Number(form.selling_price || 0),

        stock_quantity: Number(form.stock_quantity || 0),

        sku: form.sku.trim() || null,

      };

      let query;

      if (editingItem) {

        // Do not overwrite the original created_by value when editing.

        delete payload.created_by;

        delete payload.id;

        delete payload.created_at;

        const { error } = await supabase

          .from("stock_items")

          .update(payload)

          .eq("id", editingItem.id);

        if (error) throw error;

      } else {

        payload.created_by = user.id;

        const { error } = await supabase

          .from("stock_items")

          .insert([payload]);

        if (error) throw error;

      }

      const wasEditing = Boolean(editingItem);

      setModal("");

      setEditingItem(null);

      setForm(initialForm);

      await loadStock();

      alert(wasEditing ? "Product updated successfully!" : "Product added successfully!");

    } catch (error) {

      console.error("Product save error:", error);

      const message = error.code === "23505"

        ? "This barcode or SKU already exists. Please check the value."

        : error.message || "Unable to save product.";

      alert(message);

    } finally {

      setSaving(false);

    }

  }

  async function deleteProduct(item) {

    const confirmed = window.confirm(

      `Delete "${item.item_name}" (Barcode: ${item.barcode_id})?\\\n\\\nThis action cannot be undone.`

    );

    if (!confirmed) return;

    setSaving(true);

    try {

      const { error } = await supabase

        .from("stock_items")

        .delete()

        .eq("id", item.id);

      if (error) throw error;

      await loadStock();

      alert("Product deleted successfully.");

    } catch (error) {

      console.error("Product delete error:", error);

      if (error.code === "23503") {

        alert(

          "This product has sales or stock movement history, so it cannot be permanently deleted. " +

          "This protects your business records. Keep the product record and set its status to Sold or Damaged instead."

        );

      } else if (error.code === "42501") {

        alert("You do not have permission to delete products. Please login as Admin.");

      } else {

        alert("Unable to delete product: " + error.message);

      }

    } finally {

      setSaving(false);

    }

  }

  async function adjustStock(e) {

    e.preventDefault();

    if (!selectedItem) return;

    const amount = Number(quantity);

    if (!Number.isFinite(amount) || amount <= 0) {

      alert("Enter a valid quantity greater than zero.");

      return;

    }

    setSaving(true);

    try {

      const { data, error } = await supabase.rpc("adjust_jewellery_stock", {

        p_stock_item_id: selectedItem.id,

        p_movement_type: modal,

        p_quantity: amount,

        p_note: null,

      });

      if (error) throw error;

      // Refresh the live row and movement ledger after the database transaction.

      await Promise.all([loadStock(), loadStockMovements()]);

      const result = Array.isArray(data) ? data[0] : data;

      setModal("");

      setSelectedItem(null);

      setQuantity("1");

      alert(

        `${modal === "in" ? "Stock added" : "Stock removed"} successfully. ` +

        `New available quantity: ${result?.new_quantity ?? "updated"}.`

      );

    } catch (error) {

      console.error("Stock adjustment error:", error);

      alert("Stock update failed: " + error.message);

    } finally {

      setSaving(false);

    }

  }

  function openStockModal(type) {

    setSelectedItem(null);

    setQuantity("1");

    setModal(type);

  }

  function startAdjustment(item) {

    setSelectedItem(item);

    setQuantity("1");

  }

  const currency = (value) =>

    new Intl.NumberFormat("en-IN", {

      style: "currency",

      currency: "INR",

      maximumFractionDigits: 2,

    }).format(value || 0);

  function renderProducts() {

    return (

      <section className="panel" style={{ padding: 22 }}>

        <div className="panel-heading">

          <div>

            <h3>Products</h3>

            <p>Manage your jewellery stock</p>

          </div>

          <button className="primary-btn" onClick={openAddProduct}>

            <Plus size={18} /> Add Product

          </button>

        </div>

        <div style={{ margin: "20px 0", display: "flex", gap: 10 }}>

          <Search size={20} />

          <input

            placeholder="Search by name, SKU or barcode..."

            value={search}

            onChange={(e) => setSearch(e.target.value)}

            style={inputStyle}

          />

          <button className="icon-btn" onClick={loadStock}>

            <RefreshCw size={18} />

          </button>

        </div>

        {loading ? (

          <p>Loading products...</p>

        ) : (

          <div className="table-wrap">

            <table>

              <thead>

                <tr>

                  <th>BARCODE</th>

                  <th>PRODUCT</th>

                  <th>CATEGORY</th>

                  <th>METAL</th>

                  <th>PURITY</th>

                  <th>NET WEIGHT</th>

                  <th>QUANTITY</th>

                  <th>PRICE</th>

                  <th>STATUS</th>

                  <th>ACTIONS</th>

                </tr>

              </thead>

              <tbody>

                {filteredStock.map((item) => (

                  <tr key={item.id}>

                    <td className="transaction-id">{item.barcode_id}</td>

                    <td>{item.item_name || "-"}</td>

                    <td>{item.category || "-"}</td>

                    <td>{item.metal_type || "-"}</td>

                    <td>{item.purity || "-"}</td>

                    <td>{Number(item.net_weight_g || 0).toFixed(3)} g</td>

                    <td>{item.stock_quantity}</td>

                    <td>{currency(item.selling_price)}</td>

                    <td>{Number(item.stock_quantity || 0) <= 0 ? "Out of Stock" : item.status === "reserved" ? "Reserved" : item.status === "damaged" ? "Damaged" : "Available"}</td>

                    <td>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

                        <button

                          type="button"

                          className="icon-btn"

                          title="Edit product"

                          aria-label={`Edit ${item.item_name}`}

                          onClick={() => openEditProduct(item)}

                          disabled={saving}

                        >

                          <Pencil size={16} />

                        </button>

                        <button

                          type="button"

                          className="icon-btn"

                          title="Delete product"

                          aria-label={`Delete ${item.item_name}`}

                          onClick={() => deleteProduct(item)}

                          disabled={saving}

                          style={{ color: "#ef8f86", borderColor: "rgba(239,143,134,.35)" }}

                        >

                          <Trash2 size={16} />

                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

                {filteredStock.length === 0 && (

                  <tr>

                    <td colSpan="10" style={{ textAlign: "center" }}>

                      No products found.

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

    );

  }

  function renderInventory() {

    return (

      <>

        <section className="panel" style={{ padding: 22 }}>

          <div className="panel-heading">

            <div>

              <h3>Inventory Management</h3>

              <p>Manage stock quantities separately for each supplier barcode</p>

            </div>

            <div style={{ display: "flex", gap: 10 }}>

              <button className="icon-btn" type="button" onClick={() => { loadStock(); loadStockMovements(); }} title="Refresh inventory">

                <RefreshCw size={18} />

              </button>

              <button className="primary-btn" onClick={openAddProduct}>

                <Plus size={18} /> Add Product

              </button>

            </div>

          </div>

          <div className="table-wrap" style={{ marginTop: 20 }}>

            <table>

              <thead>

                <tr>

                  <th>PRODUCT</th>

                  <th>BARCODE</th>

                  <th>WEIGHT / UNIT</th>

                  <th>QUANTITY</th>

                  <th>AVAILABILITY</th>

                  <th>STOCK IN</th>

                  <th>STOCK OUT</th>

                </tr>

              </thead>

              <tbody>

                {filteredStock.map((item) => {

                  const qty = Number(item.stock_quantity || 0);

                  const label = qty <= 0 ? "Unavailable" : item.status === "reserved" ? "Reserved" : item.status === "damaged" ? "Damaged" : "Available";

                  return (

                    <tr key={item.id}>

                      <td>{item.item_name}</td>

                      <td className="transaction-id">{item.barcode_id}</td>

                      <td>{Number(item.net_weight_g || 0).toFixed(3)} g</td>

                      <td><strong>{qty}</strong></td>

                      <td>

                        <span style={{

                          display: "inline-block", padding: "4px 9px", borderRadius: 20, fontSize: 12,

                          color: qty <= 0 ? "#f0a09a" : label === "Available" ? "#8bd5a5" : "#e3c47c",

                          background: qty <= 0 ? "rgba(220,80,70,.12)" : label === "Available" ? "rgba(70,170,100,.12)" : "rgba(210,165,70,.12)"

                        }}>{label}</span>

                      </td>

                      <td>

                        <button className="text-btn" type="button" onClick={() => { startAdjustment(item); setModal("in"); }}>+ Stock In</button>

                      </td>

                      <td>

                        <button className="text-btn" type="button" disabled={qty <= 0} onClick={() => { startAdjustment(item); setModal("out"); }}>- Stock Out</button>

                      </td>

                    </tr>

                  );

                })}

                {filteredStock.length === 0 && <tr><td colSpan="7" style={{ textAlign: "center" }}>No inventory available.</td></tr>}

              </tbody>

            </table>

          </div>

        </section>

        <section className="panel" style={{ padding: 22, marginTop: 20 }}>

          <div className="panel-heading">

            <div><h3>Stock Movement History</h3><p>Every Stock In and Stock Out entry, newest first</p></div>

            <button className="icon-btn" type="button" onClick={loadStockMovements} title="Refresh history"><RefreshCw size={18}/></button>

          </div>

          {movementLoading ? <p>Loading stock history...</p> : (

            <div className="table-wrap">

              <table>

                <thead><tr><th>DATE & TIME</th><th>PRODUCT</th><th>BARCODE</th><th>TYPE</th><th>CHANGE</th><th>PREVIOUS</th><th>NEW QTY</th><th>NOTE</th></tr></thead>

                <tbody>

                  {stockMovements.map((move) => (

                    <tr key={move.id}>

                      <td>{new Date(move.created_at).toLocaleString("en-IN")}</td>

                      <td>{move.item_name}</td>

                      <td className="transaction-id">{move.barcode_id}</td>

                      <td>{move.movement_type === "in" ? "Stock In" : "Stock Out"}</td>

                      <td>{move.movement_type === "in" ? "+" : "-"}{move.quantity}</td>

                      <td>{move.previous_quantity}</td>

                      <td><strong>{move.new_quantity}</strong></td>

                      <td>{move.note || "—"}</td>

                    </tr>

                  ))}

                  {!stockMovements.length && <tr><td colSpan="8" style={{ textAlign: "center" }}>No stock movements recorded yet. Run the stock movement SQL migration to start tracking changes.</td></tr>}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </>

    );

  }

  function renderDashboard() {

    return (

      <>

        <div className="welcome-row">

          <div>

            <span className="eyebrow">BUSINESS OVERVIEW</span>

            <h2>Your jewellery business at a glance</h2>

            <p>Monitor your stock and business performance.</p>

          </div>

          <button className="primary-btn" onClick={openAddProduct}>

            <Plus size={18} /> Add Product

          </button>

        </div>

        <section className="panel database-panel">

          <div className="alert-heading">

            <div className="alert-icon">

              <Database size={21} />

            </div>

            <div>

              <h3>Supabase Database Connection</h3>

              <p>

                Status: <strong>{dbStatus}</strong>

              </p>

              {dbError && (

                <p style={{ color: "#e58b80" }}>{dbError}</p>

              )}

              {dbStatus === "Connected" && (

                <p style={{ color: "#81c49a" }}>

                  Stock items table is accessible.

                </p>

              )}

            </div>

            <button className="icon-btn" onClick={loadStock}>

              <RefreshCw size={18} />

            </button>

          </div>

        </section>

        <div className="stats-grid">

          {[

            { title: "Total Products", value: totalProducts, icon: Package },

            { title: "Gold Stock", value: `${goldWeight.toFixed(3)} g`, icon: Gem },

            { title: "Silver Stock", value: `${silverWeight.toFixed(3)} g`, icon: Boxes },

            { title: "Inventory Value", value: currency(totalValue), icon: IndianRupee },

          ].map(({ title, value, icon: Icon }) => (

            <div className="stat-card" key={title}>

              <div className="stat-top">

                <span>{title}</span>

                <div className="stat-icon"><Icon size={21} /></div>

              </div>

              <h3>{value}</h3>

              <div className="change positive">

                Live database data

              </div>

            </div>

          ))}

        </div>

        <div className="dashboard-grid">

          <section className="panel transactions-panel">

            <div className="panel-heading">

              <div>

                <h3>Recently Added Products</h3>

                <p>Latest inventory items</p>

              </div>

              <button className="text-btn" onClick={() => setPage("Products")}>

                View All →

              </button>

            </div>

            <div className="table-wrap">

              <table>

                <thead>

                  <tr>

                    <th>BARCODE</th>

                    <th>PRODUCT</th>

                    <th>TYPE</th>

                    <th>WEIGHT</th>

                  </tr>

                </thead>

                <tbody>

                  {stock.slice(0, 5).map((item) => (

                    <tr key={item.id}>

                      <td className="transaction-id">{item.barcode_id}</td>

                      <td>{item.item_name}</td>

                      <td>{item.metal_type}</td>

                      <td>{item.net_weight_g} g</td>

                    </tr>

                  ))}

                  {stock.length === 0 && (

                    <tr>

                      <td colSpan="4">No products added yet.</td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </section>

          <section className="panel quick-panel">

            <div className="panel-heading">

              <div>

                <h3>Quick Actions</h3>

                <p>Manage your business quickly</p>

              </div>

            </div>

            {[

              { title: "Add New Product", desc: "Add gold, silver or diamond", icon: Plus, action: openAddProduct },

              { title: "Stock In", desc: "Add items to inventory", icon: ArrowDownRight, action: () => openStockModal("in") },

              { title: "Stock Out", desc: "Remove items from inventory", icon: ArrowUpRight, action: () => openStockModal("out") },

              { title: "View Products", desc: "Manage all products", icon: Package, action: () => setPage("Products") },

            ].map(({ title, desc, icon: Icon, action }) => (

              <button className="quick-action" key={title} onClick={action}>

                <span className="quick-icon"><Icon /></span>

                <span>

                  <strong>{title}</strong>

                  <small>{desc}</small>

                </span>

                <ArrowUpRight size={17} />

              </button>

            ))}

          </section>

        </div>

        <section className="panel alerts-panel">

          <div className="alert-heading">

            <div className="alert-icon"><CircleAlert size={20} /></div>

            <div>

              <h3>Inventory Monitoring</h3>

              <p>

                {stock.filter((item) => Number(item.stock_quantity || 0) <= 0).length}

                {" "}products are out of stock.

              </p>

            </div>

          </div>

        </section>

      </>

    );

  }

  function renderSales() {

    const options=stock.filter(x=>Number(x.stock_quantity||0)>0);

    const chosen=stock.find(x=>x.id===saleForm.stock_item_id);

    return <>

      <section className="panel" style={{padding:22}}>

        <div className="panel-heading"><div><h3>New Sale</h3><p>Complete sale and reduce inventory automatically</p></div></div>

        <form onSubmit={submitSale}><div style={formGrid}>

          <FormField label="Product / Supplier Barcode *"><select required value={saleForm.stock_item_id} style={inputStyle} onChange={e=>{const x=stock.find(i=>i.id===e.target.value);setSaleForm(v=>({...v,stock_item_id:e.target.value,unit_price:String(x?.selling_price||0)}));}}><option value="">Select product</option>{options.map(x=><option key={x.id} value={x.id}>{x.barcode_id} — {x.item_name} (Qty {x.stock_quantity})</option>)}</select></FormField>

          <FormField label="Quantity *"><input required type="number" min="0.001" step="0.001" value={saleForm.quantity} onChange={e=>setSaleForm(v=>({...v,quantity:e.target.value}))} style={inputStyle}/></FormField>

          <FormField label="Selling Price (₹) *"><input required type="number" min="0" step="0.01" value={saleForm.unit_price} onChange={e=>setSaleForm(v=>({...v,unit_price:e.target.value}))} style={inputStyle}/></FormField>

          <FormField label="Customer Name"><input value={saleForm.customer_name} onChange={e=>setSaleForm(v=>({...v,customer_name:e.target.value}))} style={inputStyle}/></FormField>

          <FormField label="Customer Mobile"><input value={saleForm.customer_phone} onChange={e=>setSaleForm(v=>({...v,customer_phone:e.target.value}))} style={inputStyle}/></FormField>

        </div><div style={{...modalFooter,justifyContent:"space-between"}}><strong>Total: {currency(Number(saleForm.quantity||0)*Number(saleForm.unit_price||0))}</strong><button className="primary-btn" disabled={saving||!chosen||Number(saleForm.quantity)<=0||Number(saleForm.quantity)>Number(chosen?.stock_quantity||0)}>{saving?"Processing...":"Complete Sale"}</button></div>{chosen&&<p>Available quantity: {chosen.stock_quantity}</p>}</form>

      </section>

      <section className="panel" style={{padding:22,marginTop:20}}><div className="panel-heading"><div><h3>Sales History</h3><p>Recorded transactions</p></div><button className="icon-btn" onClick={loadSales}><RefreshCw/></button></div>

      {pageLoading?<p>Loading...</p>:<div className="table-wrap"><table><thead><tr><th>DATE</th><th>BARCODE</th><th>PRODUCT</th><th>CUSTOMER</th><th>QTY</th><th>PRICE</th><th>TOTAL</th></tr></thead><tbody>{sales.map(x=><tr key={x.id}><td>{new Date(x.created_at).toLocaleString("en-IN")}</td><td>{x.barcode_id}</td><td>{x.item_name}</td><td>{x.customer_name||"Walk-in"}</td><td>{x.quantity}</td><td>{currency(x.unit_price)}</td><td>{currency(x.total_amount)}</td></tr>)}{!sales.length&&<tr><td colSpan="7">No sales recorded yet.</td></tr>}</tbody></table></div>}</section>

    </>;

  }

  function renderReports() {

    const gold=stock.filter(x=>x.metal_type==="Gold").reduce((n,x)=>n+Number(x.net_weight_g||0)*Number(x.stock_quantity||0),0);

    const silver=stock.filter(x=>x.metal_type==="Silver").reduce((n,x)=>n+Number(x.net_weight_g||0)*Number(x.stock_quantity||0),0);

    return <><section className="panel" style={{padding:22}}><div className="panel-heading"><div><h3>Business Reports</h3><p>Actual sales and inventory figures</p></div><div style={{display:"flex",gap:8}}><select value={reportRange} onChange={e=>setReportRange(e.target.value)} style={inputStyle}><option value="today">Today</option><option value="week">This week (Mon–Sun)</option><option value="month">This month</option><option value="all">All time</option></select><button className="primary-btn" onClick={exportSalesCsv}>Export CSV</button></div></div>

    <div className="stats-grid">{[{title:"Sales Revenue",value:currency(reportRevenue)},{title:"Transactions",value:filteredSales.length},{title:"Units Sold",value:reportUnits},{title:"Products",value:totalProducts},{title:"Gold Weight",value:gold.toFixed(3)+" g"},{title:"Silver Weight",value:silver.toFixed(3)+" g"},{title:"Inventory Value",value:currency(totalValue)}].map(x=><div className="stat-card" key={x.title}><span>{x.title}</span><h3>{x.value}</h3></div>)}</div></section>

    <section className="panel" style={{padding:22,marginTop:20}}><h3>Sales Details</h3><div className="table-wrap"><table><thead><tr><th>DATE</th><th>PRODUCT</th><th>QTY</th><th>TOTAL</th></tr></thead><tbody>{filteredSales.map(x=><tr key={x.id}><td>{new Date(x.created_at).toLocaleDateString("en-IN")}</td><td>{x.item_name}</td><td>{x.quantity}</td><td>{currency(x.total_amount)}</td></tr>)}{!filteredSales.length&&<tr><td colSpan="4">No sales for this period.</td></tr>}</tbody></table></div></section></>;

  }

  function renderStaff() {

    if(currentRole!=="admin")return <section className="panel" style={{padding:24}}><h3>Staff Management</h3><p>Only an administrator can manage staff. Contact your business admin.</p></section>;

    return <section className="panel" style={{padding:22}}><div className="panel-heading"><div><h3>Staff Management</h3><p>Manage existing authenticated users and their roles</p></div><button className="icon-btn" onClick={loadStaff}><RefreshCw/></button></div><p>To add a new staff login, create the user in Supabase Authentication. The profile is created automatically as Staff.</p>

    {pageLoading?<p>Loading staff...</p>:<div className="table-wrap"><table><thead><tr><th>NAME</th><th>USER ID</th><th>ROLE</th><th>JOINED</th></tr></thead><tbody>{profiles.map(x=><tr key={x.id}><td>{x.full_name||"Unnamed user"}</td><td>{x.id.slice(0,8)}…</td><td><select value={x.role} onChange={e=>changeStaffRole(x.id,e.target.value)} style={inputStyle}><option value="staff">Staff</option><option value="admin">Admin</option></select></td><td>{new Date(x.created_at).toLocaleDateString("en-IN")}</td></tr>)}{!profiles.length&&<tr><td colSpan="4">No staff profiles found.</td></tr>}</tbody></table></div>}</section>;

  }

  function renderSettings() {

    const fields=[["business_name","Business Name"],["phone","Contact Number"],["email","Business Email"],["gst_number","GST Number"],["address","Business Address"]];

    return <section className="panel" style={{padding:22}}><div className="panel-heading"><div><h3>Business Settings</h3><p>Business profile and inventory alerts</p></div><button type="button" className="icon-btn" onClick={loadSettings} title="Reload saved settings"><RefreshCw/></button></div>{currentRole!=="admin"&&<p>Read-only: only admin can update these settings.</p>}

    <form onSubmit={saveBusinessSettings}><div style={formGrid}>{fields.map(([k,l])=><FormField key={k} label={l}><input value={businessSettings[k]||""} disabled={currentRole!=="admin"} onChange={e=>setBusinessSettings(v=>({...v,[k]:e.target.value}))} style={inputStyle}/></FormField>)}<FormField label="Low Stock Alert Threshold"><input type="number" min="0" value={businessSettings.low_stock_threshold??1} disabled={currentRole!=="admin"} onChange={e=>setBusinessSettings(v=>({...v,low_stock_threshold:e.target.value}))} style={inputStyle}/></FormField></div>{currentRole==="admin"&&<div style={modalFooter}><button className="primary-btn" disabled={saving}><Save/>{saving?"Saving...":"Save Settings"}</button></div>}</form></section>;

  }

  return (

    <div className="app">

      <style>{`
        @media (max-width: 768px) {
          .app { min-height: 100vh; overflow-x: hidden; }
          .sidebar {
            display: flex !important;
            position: fixed !important;
            top: 0 !important; left: 0 !important; bottom: 0 !important;
            width: min(280px, 85vw) !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            overflow-y: auto !important;
            z-index: 10002 !important;
            background: #101b35 !important;
            transform: translateX(-110%);
            transition: transform .25s ease !important;
            visibility: hidden;
          }
          .sidebar.mobile-sidebar-open {
            transform: translateX(0) !important;
            visibility: visible !important;
          }
          .mobile-menu {
            display: inline-flex !important;
            align-items: center; justify-content: center;
            min-width: 42px; min-height: 42px;
            position: relative; z-index: 10003;
            border: 0; background: transparent; cursor: pointer;
          }
          .mobile-backdrop {
            position: fixed !important; inset: 0 !important;
            z-index: 10001 !important;
            background: rgba(0,0,0,.55) !important;
            border: 0; padding: 0;
          }
          .main { width: 100% !important; min-width: 0 !important; margin-left: 0 !important; }
          .topbar { width: 100%; min-width: 0; }
          .content { min-width: 0; }
        }
        @media (min-width: 769px) { .mobile-backdrop { display: none !important; } }
      `}</style>

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
          className="mobile-backdrop"
          style={mobileBackdropStyle}
        />
      )}
      <aside className={`sidebar ${mobileMenuOpen ? "mobile-sidebar-open" : ""}`} style={mobileMenuOpen ? { ...mobileSidebarStyle, transform: "translateX(0)", visibility: "visible", background: "#101b35" } : undefined}>

        <div className="brand">

          <div className="brand-icon"><Gem size={25} /></div>

          <div>

            <h2>NAKODA</h2>

            <span>JEWELLERS</span>

          </div>

        </div>

        <div className="menu-label">MAIN MENU</div>

        <nav>

          {menu.map(({ label, icon: Icon }) => (

            <button

              key={label}

              type="button"

              onClick={() => {

                setPage(label);

                setSearch("");

                setMobileMenuOpen(false);

              }}

              className={`nav-item ${page === label ? "active" : ""}`}

            >

              <Icon size={19} />

              <span>{label}</span>

            </button>

          ))}

        </nav>

        <div className="sidebar-bottom">

          <div className="support-card">

            <Gem size={22} />

            <strong>Manage your jewellery business</strong>

            <span>Everything in one place.</span>

          </div>

        </div>

      </aside>

      <main className="main">

        <header className="topbar">

          <div className="top-left">

            <button
                className="mobile-menu"
                type="button"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((open) => !open)}
              >

              <Menu size={22} />

            </button>

            <div>

              <h1>{page}</h1>

              <p>Welcome back! Here's your business overview.</p>

            </div>

          </div>

          <div className="top-actions">

            <button className="icon-btn" onClick={() => {

              setPage("Products");

              setSearch("");

            }}>

              <Search size={19} />

            </button>

            <button className="icon-btn" onClick={loadStock}>

              <Bell size={19} />

            </button>

            <div className="top-date">Nakoda Jewellers</div>

          </div>

        </header>

        <section className="content">

          {loading && dbStatus === "Connecting..." ? (

            <p>Loading your jewellery data...</p>

          ) : page === "Dashboard" ? (

            renderDashboard()

          ) : page === "Products" ? (

            renderProducts()

          ) : page === "Inventory" ? (

            renderInventory()

          ) : page === "Sales" ? (

            renderSales()

          ) : page === "Reports" ? (

            renderReports()

          ) : page === "Staff" ? (

            renderStaff()

          ) : (

            renderSettings()

          )}

          <footer>© 2026 Nakoda Jewellers. All rights reserved.</footer>

        </section>

      </main>

      {/* ADD PRODUCT MODAL */}

      {(modal === "add" || modal === "edit") && (

        <div style={overlayStyle}>

          <div style={modalStyle}>

            <div style={modalHeader}>

              <div>

                <h2>{editingItem ? "Edit Product" : "Add New Product"}</h2>

                <p>Enter jewellery product information</p>

              </div>

              <button className="icon-btn" onClick={() => setModal("")}>

                <X />

              </button>

            </div>

            <form onSubmit={saveProduct}>

              <div style={formGrid}>

                <FormField label="Supplier Barcode ID *">

                  <input

                    name="barcode_id"

                    value={form.barcode_id}

                    onChange={updateForm}

                    placeholder="Scan or enter supplier barcode"

                    required

                    style={inputStyle}

                  />

                </FormField>

                <FormField label="Product Name *">

                  <input name="item_name" value={form.item_name} onChange={updateForm} placeholder="Gold Necklace" required style={inputStyle} />

                </FormField>

                <FormField label="SKU">

                  <input name="sku" value={form.sku} onChange={updateForm} placeholder="NKD-001" style={inputStyle} />

                </FormField>

                <FormField label="Category">

                  <select name="category" value={form.category} onChange={updateForm} style={inputStyle}>

                    {["Ring", "Necklace", "Bracelet", "Earrings", "Chain", "Pendant", "Bangle", "Coin", "Other"].map((v) => <option key={v}>{v}</option>)}

                  </select>

                </FormField>

                <FormField label="Metal Type">

                  <select name="metal_type" value={form.metal_type} onChange={updateForm} style={inputStyle}>

                    {["Gold", "Silver", "Diamond", "Platinum", "Other"].map((v) => <option key={v}>{v}</option>)}

                  </select>

                </FormField>

                <FormField label="Purity">

                  <select name="purity" value={form.purity} onChange={updateForm} style={inputStyle}>

                    {["24K", "22K", "20K", "18K", "14K", "925", "999", "Other"].map((v) => <option key={v}>{v}</option>)}

                  </select>

                </FormField>

                <FormField label="Gross Weight (g)">

                  <input type="number" step="0.001" min="0" name="gross_weight_g" value={form.gross_weight_g} onChange={updateForm} style={inputStyle} />

                </FormField>

                <FormField label="Net Weight (g)">

                  <input type="number" step="0.001" min="0" name="net_weight_g" value={form.net_weight_g} onChange={updateForm} style={inputStyle} />

                </FormField>

                <FormField label="Stone Weight (g)">

                  <input type="number" step="0.001" min="0" name="stone_weight_g" value={form.stone_weight_g} onChange={updateForm} style={inputStyle} />

                </FormField>

                <FormField label="Diamond Carat">

                  <input type="number" step="0.001" min="0" name="diamond_carat" value={form.diamond_carat} onChange={updateForm} style={inputStyle} />

                </FormField>

                <FormField label="Diamond Clarity">

                  <input name="diamond_clarity" value={form.diamond_clarity} onChange={updateForm} placeholder="VS1, VVS1..." style={inputStyle} />

                </FormField>

                <FormField label="Diamond Color">

                  <input name="diamond_color" value={form.diamond_color} onChange={updateForm} placeholder="D, E, F..." style={inputStyle} />

                </FormField>

                <FormField label="Making Charge Type">

                  <select name="making_charge_type" value={form.making_charge_type} onChange={updateForm} style={inputStyle}>

                    <option value="fixed">Fixed</option>

                    <option value="percentage">Percentage</option>

                    <option value="per_gram">Per Gram</option>

                  </select>

                </FormField>

                <FormField label="Making Charge">

                  <input type="number" min="0" step="0.01" name="making_charge" value={form.making_charge} onChange={updateForm} style={inputStyle} />

                </FormField>

                <FormField label="Purchase Price (₹)">

                  <input type="number" min="0" step="0.01" name="purchase_price" value={form.purchase_price} onChange={updateForm} style={inputStyle} />

                </FormField>

                <FormField label="Selling Price (₹)">

                  <input type="number" min="0" step="0.01" name="selling_price" value={form.selling_price} onChange={updateForm} style={inputStyle} />

                </FormField>

                <FormField label="Stock Quantity">

                  <input type="number" min="0" step="0.001" name="stock_quantity" value={form.stock_quantity} onChange={updateForm} style={inputStyle} required />

                </FormField>

                <FormField label="Supplier Name">

                  <input name="supplier_name" value={form.supplier_name} onChange={updateForm} style={inputStyle} />

                </FormField>

                <FormField label="Design Code">

                  <input name="design_code" value={form.design_code} onChange={updateForm} style={inputStyle} />

                </FormField>

                <FormField label="Status">

                  <select name="status" value={form.status} onChange={updateForm} style={inputStyle}>

                    <option value="available">Available</option>

                    <option value="reserved">Reserved</option>

                    <option value="sold">Sold</option>

                    <option value="damaged">Damaged</option>

                  </select>

                </FormField>

                <FormField label="Description">

                  <textarea name="description" value={form.description} onChange={updateForm} style={{ ...inputStyle, minHeight: 65 }} />

                </FormField>

              </div>

              <div style={modalFooter}>

                <button type="button" className="text-btn" onClick={() => setModal("")}>

                  Cancel

                </button>

                <button className="primary-btn" type="submit" disabled={saving}>

                  <Save size={17} />

                  {saving ? "Saving..." : editingItem ? "Update Product" : "Save Product"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* STOCK IN / STOCK OUT MODAL */}

      {(modal === "in" || modal === "out") && (

        <div style={overlayStyle}>

          <div style={{ ...modalStyle, maxWidth: 460 }}>

            <div style={modalHeader}>

              <h2>{modal === "in" ? "Stock In" : "Stock Out"}</h2>

              <button className="icon-btn" onClick={() => setModal("")}>

                <X />

              </button>

            </div>

            {selectedItem ? (

              <form onSubmit={adjustStock}>

                <p><strong>Product:</strong> {selectedItem.item_name}</p>

                <p><strong>Supplier Barcode:</strong> {selectedItem.barcode_id}</p>

                <p><strong>Current quantity:</strong> {Number(selectedItem.stock_quantity || 0)}</p>

                <p><strong>After this movement:</strong> {modal === "in" ? Number(selectedItem.stock_quantity || 0) + Number(quantity || 0) : Math.max(0, Number(selectedItem.stock_quantity || 0) - Number(quantity || 0))}</p>

                <FormField label="Quantity">

                  <input

                    type="number"

                    min="0.001"

                    step="0.001"

                    value={quantity}

                    onChange={(e) => setQuantity(e.target.value)}

                    required

                    style={inputStyle}

                  />

                </FormField>

                <div style={modalFooter}>

                  <button type="button" className="text-btn" onClick={() => setModal("")}>Cancel</button>

                  <button className="primary-btn" disabled={saving}>

                    {saving ? "Updating..." : "Confirm"}

                  </button>

                </div>

              </form>

            ) : (

              <>

                <p>Select the exact product barcode:</p>

                <div style={{ maxHeight: 300, overflowY: "auto" }}>

                  {stock.map((item) => (

                    <button

                      type="button"

                      key={item.id}

                      className="quick-action"

                      style={{ width: "100%" }}

                      onClick={() => startAdjustment(item)}

                    >

                      <span>

                        <strong>{item.item_name}</strong>

                        <small>Barcode: {item.barcode_id} · Quantity: {Number(item.stock_quantity || 0)} · {Number(item.stock_quantity || 0) > 0 ? "Available" : "Unavailable"}</small>

                      </span>

                      <ArrowUpRight size={17} />

                    </button>

                  ))}

                </div>

              </>

            )}

          </div>

        </div>

      )}

    </div>

  );

}

function FormField({ label, children }) {

  return (

    <label style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>

      <span style={{ color: "#d9c18d", fontSize: 13 }}>{label}</span>

      {children}

    </label>

  );

}

const mobileSidebarStyle = {
  display: "flex",
  position: "fixed",
  top: 0,
  left: 0,
  bottom: 0,
  width: "min(280px, 85vw)",
  zIndex: 10002,
  overflowY: "auto",
  boxShadow: "8px 0 30px rgba(0,0,0,0.35)",
};

const mobileBackdropStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 10001,
  border: "none",
  background: "rgba(0,0,0,0.55)",
  cursor: "pointer",
};

const overlayStyle = {

  position: "fixed",

  inset: 0,

  zIndex: 10000,

  background: "rgba(0,0,0,0.82)",

  display: "flex",

  alignItems: "center",

  justifyContent: "center",

  padding: 16,

};

const modalStyle = {

  background: "#171613",

  color: "#f5f1e8",

  border: "1px solid #57472a",

  borderRadius: 12,

  width: "100%",

  maxWidth: 850,

  maxHeight: "90vh",

  overflowY: "auto",

  padding: 24,

};

const modalHeader = {

  display: "flex",

  alignItems: "center",

  justifyContent: "space-between",

  marginBottom: 22,

};

const formGrid = {

  display: "grid",

  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",

  gap: 16,

};

const modalFooter = {

  display: "flex",

  justifyContent: "flex-end",

  alignItems: "center",

  gap: 16,

  marginTop: 24,

};

const inputStyle = {

  width: "100%",

  boxSizing: "border-box",

  padding: "11px 12px",

  background: "#24221d",

  color: "#f5f1e8",

  border: "1px solid #57472a",

  borderRadius: 6,

  outline: "none",

};
