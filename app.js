import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentRole = "admin";
let cart = [];
let allProducts = [];

// LOGIN
window.selectRole = (role) => {
  currentRole = role;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  event.target.classList.add("active");
};

window.handleLogin = async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";
  if (!email || !password) { errorEl.textContent = "ادخل الإيميل وكلمة المرور"; return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    errorEl.textContent = "بيانات غلط، حاول تاني";
  }
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    showScreen(currentRole === "admin" ? "adminScreen" : "cashierScreen");
    if (currentRole === "admin") loadAdminData();
    else loadCashierProducts();
  } else {
    showScreen("loginScreen");
  }
});

window.logout = async () => { await signOut(auth); cart = []; };

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ADMIN TABS
window.showAdminTab = (tab) => {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active-tab"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active-tab");
  event.target.classList.add("active");
  if (tab === "orders") loadOrders();
  if (tab === "reports") loadReports();
};

// PRODUCTS
window.openAddProduct = () => document.getElementById("addProductForm").classList.remove("hidden");
window.closeAddProduct = () => {
  document.getElementById("addProductForm").classList.add("hidden");
  ["pName","pPrice","pStock","pCategory"].forEach(id => document.getElementById(id).value = "");
};

window.saveProduct = async () => {
  const name = document.getElementById("pName").value.trim();
  const price = parseFloat(document.getElementById("pPrice").value);
  const stock = parseInt(document.getElementById("pStock").value);
  const category = document.getElementById("pCategory").value;
  if (!name || !price || !stock || !category) { alert("اكمل كل البيانات"); return; }
  await addDoc(collection(db, "products"), { name, price, stock, category, createdAt: serverTimestamp() });
  window.closeAddProduct();
};

function loadAdminData() {
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderProductsAdmin(allProducts);
  });
}

function renderProductsAdmin(products) {
  const el = document.getElementById("productsList");
  if (!products.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div><p>لا توجد منتجات بعد</p></div>`;
    return;
  }
  el.innerHTML = products.map(p => `
    <div class="product-card">
      <div class="product-category">${p.category}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-price">${p.price} جنيه</div>
      <div class="product-stock ${p.stock < 5 ? 'low' : ''}">المخزون: ${p.stock} قطعة ${p.stock < 5 ? '⚠️' : ''}</div>
      <button class="delete-btn" onclick="deleteProduct('${p.id}')">حذف</button>
    </div>
  `).join("");
}

window.deleteProduct = async (id) => {
  if (confirm("هتحذف المنتج ده؟")) await deleteDoc(doc(db, "products", id));
};

// CASHIER
function loadCashierProducts() {
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCashierProducts(allProducts);
  });
}

function renderCashierProducts(products) {
  const el = document.getElementById("cashierProductsList");
  const available = products.filter(p => p.stock > 0);
  if (!available.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div><p>لا توجد منتجات</p></div>`;
    return;
  }
  el.innerHTML = available.map(p => `
    <div class="cashier-product-card" onclick="addToCart('${p.id}')">
      <div class="cp-category">${p.category}</div>
      <div class="cp-name">${p.name}</div>
      <div class="cp-price">${p.price} جنيه</div>
      <div class="cp-stock">متاح: ${p.stock}</div>
    </div>
  `).join("");
}

window.filterProducts = () => {
  const val = document.getElementById("searchProduct").value.toLowerCase();
  renderCashierProducts(allProducts.filter(p =>
    p.name.toLowerCase().includes(val) || p.category.toLowerCase().includes(val)
  ));
};

// CART
window.addToCart = (id) => {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;
  const existing = cart.find(c => c.id === id);
  if (existing) {
    if (existing.qty >= product.stock) { alert("وصلت للحد الأقصى"); return; }
    existing.qty++;
  } else {
    cart.push({ id, name: product.name, price: product.price, qty: 1 });
  }
  renderCart();
};

window.changeQty = (id, delta) => {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(c => c.id !== id);
  renderCart();
};

window.clearCart = () => { cart = []; renderCart(); };

function renderCart() {
  const el = document.getElementById("cartItems");
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  document.getElementById("cartTotal").textContent = total.toFixed(2) + " جنيه";
  if (!cart.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🛒</div><p>السلة فارغة</p></div>`;
    return;
  }
  el.innerHTML = cart.map(c => `
    <div class="cart-item">
      <span class="cart-item-name">${c.name}</span>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="changeQty('${c.id}', -1)">−</button>
        <span class="cart-item-qty">${c.qty}</span>
        <button class="qty-btn" onclick="changeQty('${c.id}', 1)">+</button>
      </div>
      <span class="cart-item-price">${(c.price * c.qty).toFixed(2)} ج</span>
    </div>
  `).join("");
}

// CHECKOUT
window.checkout = async () => {
  if (!cart.length) { alert("السلة فارغة!"); return; }
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const order = { items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })), total, createdAt: serverTimestamp() };
  await addDoc(collection(db, "orders"), order);
  showReceipt(order);
  cart = [];
  renderCart();
};

function showReceipt(order) {
  document.getElementById("receiptDate").textContent = new Date().toLocaleString("ar-EG");
  document.getElementById("receiptItems").innerHTML = order.items.map(i =>
    `<div class="receipt-item"><span>${i.name} × ${i.qty}</span><span>${(i.price * i.qty).toFixed(2)} ج</span></div>`
  ).join("");
  document.getElementById("receiptTotal").textContent = order.total.toFixed(2) + " جنيه";
  document.getElementById("receiptModal").classList.remove("hidden");
}

window.closeReceipt = () => document.getElementById("receiptModal").classList.add("hidden");
window.printReceipt = () => window.print();

// ORDERS
async function loadOrders() {
  const snap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
  const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const el = document.getElementById("ordersList");
  if (!orders.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>لا توجد طلبات بعد</p></div>`;
    return;
  }
  el.innerHTML = orders.map(o => `
    <div class="order-card">
      <div class="order-info">
        <span class="order-id">#${o.id.slice(-6).toUpperCase()}</span>
        <span class="order-items">${o.items.map(i => i.name + " ×" + i.qty).join(", ")}</span>
        <span class="order-date">${o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString("ar-EG") : "الآن"}</span>
      </div>
      <span class="order-amount">${o.total.toFixed(2)} ج</span>
    </div>
  `).join("");
}

// REPORTS
async function loadReports() {
  const [pSnap, oSnap] = await Promise.all([getDocs(collection(db, "products")), getDocs(collection(db, "orders"))]);
  const products = pSnap.docs.map(d => d.data());
  const orders = oSnap.docs.map(d => d.data());
  const totalSales = orders.reduce((s, o) => s + (o.total || 0), 0);
  document.getElementById("reportsData").innerHTML = `
    <div class="report-card"><div class="report-label">إجمالي المبيعات</div><div class="report-value">${totalSales.toFixed(0)}</div><div class="report-unit">جنيه</div></div>
    <div class="report-card"><div class="report-label">عدد الطلبات</div><div class="report-value">${orders.length}</div><div class="report-unit">طلب</div></div>
    <div class="report-card"><div class="report-label">عدد المنتجات</div><div class="report-value">${products.length}</div><div class="report-unit">منتج</div></div>
    <div class="report-card"><div class="report-label">مخزون منخفض</div><div class="report-value">${products.filter(p => p.stock < 5).length}</div><div class="report-unit">منتج ⚠️</div></div>
  `;
}
