// ═════════════════════════════════════════════════════════════════════════
// NALAYAK ADMIN STUDIO — COMPLETE SHOPIFY-STYLE E-COMMERCE MANAGEMENT
// Products, Variants, Inventory, Collections, Discounts, Orders, CMS & Security
// ═════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Reveal } from '@/components/Reveal';
import { refreshCatalog } from '@/services/catalog';
import { useSeo } from '@/hooks/useSeo';
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  Layers,
  Tag,
  PackageCheck,
  Paintbrush,
  History,
  AlertTriangle,
  Plus,
  Search,
  Copy,
  Trash2,
  Edit3,
  ExternalLink,
  RefreshCw,
  LogOut,
  Upload,
  X,
  CheckCircle2,
  Users,
  Truck,
  CreditCard,
  Camera,
  Check,
  Eye,
  ShieldCheck,
  ArrowUpRight,
  Lock,
} from 'lucide-react';

const API = () => process.env.REACT_APP_BACKEND_URL || '';

async function adminFetch(path, key, options = {}) {
  const token = localStorage.getItem('nalayak_admin_session') || '';
  const res = await fetch(`${API()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': key || '',
      'X-Admin-Session': token,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error('failed');
  return res.json();
}

function StatusButton({ label, onClick, testId }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="border border-ink/40 dark:border-white/20 px-3 py-1.5 text-[10px] tracking-[0.2em] font-medium hover:bg-ink hover:text-paper dark:hover:bg-white dark:hover:text-black transition-colors"
    >
      {label}
    </button>
  );
}

const REQ_NEXT = { received: 'in-progress', 'in-progress': 'completed' };

export default function Admin() {
  useSeo('Admin Studio', 'NALAYAK Operations & Catalogue Command.');
  const [key, setKey] = useState(() => localStorage.getItem('nalayak_admin') || '');
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('nalayak_admin_session') || '');
  const [input, setInput] = useState('');
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Studio Data State
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [storefront, setStorefront] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  // Preserved Sub-module Data State
  const [requests, setRequests] = useState([]);
  const [irl, setIrl] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSubView, setCustomerSubView] = useState('customers'); // 'customers' | 'accounts'
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('ALL');
  const [irlFilter, setIrlFilter] = useState('ALL');
  const [addingIrl, setAddingIrl] = useState(false);
  const [newIrlData, setNewIrlData] = useState({ name: '', handle: '', city: 'Kolkata', image_url: '', caption: '' });

  // Modals & Drawers State
  const [editingProduct, setEditingProduct] = useState(null); // null or product object
  const [editingCollection, setEditingCollection] = useState(null);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [inventoryBatch, setInventoryBatch] = useState({});

  // Filter States
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState('ALL');
  const [productStatusFilter, setProductStatusFilter] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  // Load all studio data
  const loadStudio = async (activeKey) => {
    setLoading(true);
    try {
      // 1. Orders (Supabase/DB)
      try {
        const o = await adminFetch('/api/admin/orders', activeKey);
        setOrders(o.orders || []);
      } catch {
        setOrders([]);
      }

      // 2. Catalogue Products
      try {
        const p = await adminFetch('/api/admin/catalog/products', activeKey);
        setProducts(p.products || []);
      } catch {
        setProducts([]);
      }

      // 3. Analytics
      try {
        const a = await adminFetch('/api/admin/analytics', activeKey);
        setAnalytics(a.analytics || null);
      } catch {
        setAnalytics(null);
      }

      // 4. Collections
      try {
        const c = await adminFetch('/api/admin/catalog/collections', activeKey);
        setCollections(c.collections || []);
      } catch {
        setCollections([]);
      }

      // 5. Discounts
      try {
        const d = await adminFetch('/api/admin/catalog/discounts', activeKey);
        setDiscounts(d.discounts || []);
      } catch {
        setDiscounts([]);
      }

      // 6. Storefront CMS
      try {
        const s = await adminFetch('/api/admin/catalog/storefront', activeKey);
        setStorefront(s.content || null);
      } catch {
        setStorefront(null);
      }

      // 7. Audit Logs
      try {
        const l = await adminFetch('/api/admin/audit-logs', activeKey);
        setAuditLogs(l.audit_logs || []);
      } catch {
        setAuditLogs([]);
      }

      // 8. Custom Requests & IRL & Support
      try {
        const r = await adminFetch('/api/admin/custom-requests', activeKey);
        setRequests(r.requests || []);
      } catch { setRequests([]); }

      try {
        const i = await adminFetch('/api/admin/irl', activeKey);
        setIrl(i.items || i.irl || []);
      } catch { setIrl([]); }

      try {
        const custData = await adminFetch('/api/admin/customers', activeKey);
        setCustomers(custData.customers || []);
      } catch { setCustomers([]); }

      try {
        const accData = await adminFetch('/api/admin/accounts', activeKey);
        setAccounts(accData.accounts || []);
      } catch { setAccounts([]); }

      try {
        const t = await adminFetch('/api/admin/support/tickets', activeKey);
        setTickets(t.tickets || []);
      } catch { setTickets([]); }

      setError(false);
    } catch (err) {
      console.error('Admin load failed:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (passOrKey) => {
    const trimmed = passOrKey.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`${API()}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: trimmed }),
      });

      if (!res.ok) {
        throw new Error('Invalid key');
      }

      const data = await res.json();
      localStorage.setItem('nalayak_admin', trimmed);
      if (data.token) {
        localStorage.setItem('nalayak_admin_session', data.token);
        setSessionToken(data.token);
      }
      setKey(trimmed);
      setError(false);
      toast.success('Access granted. Welcome to NALAYAK Studio.');
      await loadStudio(trimmed);
    } catch {
      setError(true);
      toast.error('Access denied. Invalid administrator key.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nalayak_admin');
    localStorage.removeItem('nalayak_admin_session');
    setKey('');
    setSessionToken('');
    toast.info('Logged out from Studio.');
  };

  useEffect(() => {
    if (key) {
      loadStudio(key);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper action runner
  const act = async (fn, successMsg) => {
    try {
      await fn();
      toast.success(successMsg);
      await loadStudio(key);
      refreshCatalog();
    } catch (err) {
      toast.error('Action failed. Check logs.');
    }
  };

  // ── FILTERED DATA ──────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (productCatFilter !== 'ALL') {
      list = list.filter((p) => (p.category || '').toLowerCase() === productCatFilter.toLowerCase());
    }
    if (productStatusFilter !== 'ALL') {
      list = list.filter((p) => (p.status || 'active').toLowerCase() === productStatusFilter.toLowerCase());
    }
    if (lowStockOnly) {
      list = list.filter((p) => (p.stock || 0) <= 10);
    }
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.slug || '').toLowerCase().includes(q) ||
          (p.kicker || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, productCatFilter, productStatusFilter, lowStockOnly, productSearch]);

  const filteredOrders = useMemo(() => {
    let list = [...orders];
    if (orderStatusFilter !== 'ALL') {
      list = list.filter((o) => (o.status || 'placed').toLowerCase() === orderStatusFilter.toLowerCase());
    }
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      list = list.filter(
        (o) =>
          (o.order_id || '').toLowerCase().includes(q) ||
          (o.email || '').toLowerCase().includes(q) ||
          (o.name || '').toLowerCase().includes(q) ||
          (o.phone || '').includes(q)
      );
    }
    return list;
  }, [orders, orderStatusFilter, orderSearch]);

  // ── GATE / LOGIN SCREEN ─────────────────────────────────────────
  if (!key) {
    return (
      <main className="px-4 md:px-8 max-w-[460px] mx-auto py-24 md:py-36 min-h-screen flex flex-col justify-center" data-testid="admin-gate">
        <Reveal y={16}>
          <div className="border border-ink/20 dark:border-white/10 p-8 bg-zinc-950/80 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] tracking-[0.35em] text-zinc-400 font-mono">STAFF ONLY // PROTOCOL</p>
            </div>
            <h1 className="font-display font-black uppercase tracking-tighter leading-none text-4xl md:text-5xl text-white">
              NALAYAK<br /><span className="text-zinc-500 text-3xl">ADMIN STUDIO</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-3 font-mono">Authorised access for catalogue, inventory, pricing & fulfillment.</p>

            <form
              className="mt-8 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin(input);
              }}
              data-testid="admin-gate-form"
            >
              <input
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ENTER ACCESS KEY"
                aria-label="Admin access key"
                data-testid="admin-key-input"
                className="w-full border border-zinc-700 bg-zinc-900/90 text-white px-4 py-3.5 text-xs font-mono tracking-widest placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
              />
              {error && <p role="alert" className="text-[11px] font-mono tracking-widest text-red-400">ACCESS DENIED. INVALID CREDENTIALS.</p>}
              <button
                type="submit"
                data-testid="admin-enter-btn"
                className="w-full bg-white text-black py-3.5 text-[11px] tracking-[0.3em] font-bold hover:bg-zinc-200 transition-colors uppercase"
              >
                ENTER STUDIO
              </button>
            </form>
          </div>
        </Reveal>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 pb-24" data-testid="admin-page">
      {/* ── TOP STATUS & NAVIGATION BAR ───────────────────────── */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 sticky top-0 z-40 backdrop-blur-md px-4 md:px-8 py-4">
        <div className="max-w-[1500px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="font-display font-black tracking-tighter text-xl text-white flex items-center gap-2">
              NALAYAK <span className="text-zinc-500 text-xs font-mono tracking-widest px-2 py-0.5 border border-zinc-800 bg-zinc-900">STUDIO 2.0</span>
            </h1>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE STORE
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-[10px] tracking-widest font-mono text-zinc-400 hover:text-white px-3 py-1.5 border border-zinc-800 hover:border-zinc-600 transition-colors"
            >
              <span>VIEW STORE</span>
              <ExternalLink size={12} />
            </a>

            <button
              onClick={() => {
                loadStudio(key);
                toast.success('Storefront & catalogue refreshed');
              }}
              className="flex items-center gap-1.5 text-[10px] tracking-widest font-mono text-zinc-400 hover:text-white px-3 py-1.5 border border-zinc-800 hover:border-zinc-600 transition-colors"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>SYNC</span>
            </button>

            <button
              onClick={handleLogout}
              data-testid="admin-logout-btn"
              className="flex items-center gap-1.5 text-[10px] tracking-widest font-mono text-red-400 hover:text-red-300 px-3 py-1.5 border border-red-900/40 hover:border-red-800 transition-colors"
            >
              <LogOut size={12} />
              <span>EXIT</span>
            </button>
          </div>
        </div>

        {/* ── TABS BAR ────────────────────────────────────────── */}
        <div className="max-w-[1500px] mx-auto mt-4 flex gap-1 overflow-x-auto no-scrollbar border-t border-zinc-800/60 pt-2" role="tablist">
          {[
            { id: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard, count: null },
            { id: 'products', label: 'PRODUCTS', icon: ShoppingBag, count: products.length },
            { id: 'inventory', label: 'INVENTORY', icon: Boxes, count: products.reduce((acc, p) => acc + (p.stock || 0), 0) },
            { id: 'collections', label: 'COLLECTIONS', icon: Layers, count: collections.length },
            { id: 'discounts', label: 'DISCOUNTS', icon: Tag, count: discounts.length },
            { id: 'orders', label: 'ORDERS', icon: PackageCheck, count: orders.length },
            { id: 'customers', label: 'CUSTOMERS', icon: Users, count: customers.length },
            { id: 'storefront', label: 'STOREFRONT CMS', icon: Paintbrush, count: null },
            { id: 'audit', label: 'AUDIT TRAIL', icon: History, count: auditLogs.length },
            { id: 'custom', label: 'CUSTOM', icon: null, count: requests.length },
            { id: 'support', label: 'SUPPORT', icon: null, count: tickets.length },
            { id: 'irl', label: 'IRL', icon: null, count: irl.length },
            { id: 'drops', label: 'DROPS', icon: null, count: null },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                data-testid={`admin-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-[10px] font-mono tracking-widest whitespace-nowrap transition-colors border-b-2 ${
                  active
                    ? 'border-white text-white bg-zinc-900 font-bold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                }`}
              >
                {Icon && <Icon size={13} />}
                <span>{t.label}</span>
                {t.count !== null && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded ${active ? 'bg-white text-black font-bold' : 'bg-zinc-800 text-zinc-400'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ──────────────────────────── */}
      <div className="max-w-[1500px] mx-auto px-4 md:px-8 mt-6">
        {/* ══════════════════════════════════════════════════════
            TAB 1: DASHBOARD
        ══════════════════════════════════════════════════════ */}
        {tab === 'dashboard' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border border-zinc-800 bg-zinc-900/60 p-5">
                <p className="text-[10px] tracking-widest font-mono text-zinc-400 uppercase">Total Revenue</p>
                <p className="font-display font-black text-2xl md:text-3xl text-white mt-1">
                  ₹{orders.reduce((acc, o) => acc + (o.total || 0), 0).toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] font-mono text-zinc-500 mt-2">Server verified gross merchandise</p>
              </div>

              <div className="border border-zinc-800 bg-zinc-900/60 p-5">
                <p className="text-[10px] tracking-widest font-mono text-zinc-400 uppercase">Orders Placed</p>
                <p className="font-display font-black text-2xl md:text-3xl text-white mt-1">{orders.length}</p>
                <p className="text-[10px] font-mono text-zinc-500 mt-2">Active store order count</p>
              </div>

              <div className="border border-zinc-800 bg-zinc-900/60 p-5">
                <p className="text-[10px] tracking-widest font-mono text-zinc-400 uppercase">Active Products</p>
                <p className="font-display font-black text-2xl md:text-3xl text-white mt-1">
                  {products.filter((p) => p.status === 'active').length}
                </p>
                <p className="text-[10px] font-mono text-zinc-500 mt-2">{products.length} total in catalogue</p>
              </div>

              <div className="border border-zinc-800 bg-zinc-900/60 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] tracking-widest font-mono text-zinc-400 uppercase">Low Stock Alerts</p>
                  <AlertTriangle size={14} className="text-amber-400" />
                </div>
                <p className="font-display font-black text-2xl md:text-3xl text-amber-400 mt-1">
                  {products.filter((p) => (p.stock || 0) <= 10).length}
                </p>
                <button
                  onClick={() => {
                    setTab('inventory');
                    setLowStockOnly(true);
                  }}
                  className="text-[10px] font-mono text-zinc-400 hover:text-white underline mt-2 inline-block"
                >
                  View stock matrix &rarr;
                </button>
              </div>
            </div>

            {/* Quick Actions & Recent Orders */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
                <h3 className="text-xs font-mono tracking-widest text-zinc-300 font-bold uppercase">Storefront Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setEditingProduct({
                        name: '',
                        slug: '',
                        kicker: 'NALAYAK HEAVYWEIGHT',
                        price: 999,
                        compareAt: null,
                        category: 'tees',
                        gender: 'unisex',
                        badge: 'NEW',
                        desc: '',
                        fit: 'Oversized boxy drop-shoulder cut.',
                        composition: '100% Combed Heavyweight Cotton.',
                        care: 'Cold machine wash inside out. Dry in shade.',
                        story: '',
                        images: [],
                        colors: [{ name: 'BLACK', hex: '#0a0a0a' }],
                        sizes: ['XS', 'S', 'M', 'L', 'XL'],
                        collections: [],
                        stock: 25,
                        status: 'active',
                        newArrival: true,
                        bestSeller: false,
                        featured: false,
                        tags: ['tees', 'streetwear'],
                      });
                    }}
                    className="w-full flex items-center justify-between p-3 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono transition-colors text-left"
                  >
                    <span>+ ADD NEW PRODUCT</span>
                    <Plus size={14} />
                  </button>

                  <button
                    onClick={() => setTab('inventory')}
                    className="w-full flex items-center justify-between p-3 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono transition-colors text-left"
                  >
                    <span>BULK INVENTORY MATRIX</span>
                    <Boxes size={14} />
                  </button>

                  <button
                    onClick={() => setTab('discounts')}
                    className="w-full flex items-center justify-between p-3 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono transition-colors text-left"
                  >
                    <span>CREATE COUPON / PROMO</span>
                    <Tag size={14} />
                  </button>

                  <button
                    onClick={() => setTab('storefront')}
                    className="w-full flex items-center justify-between p-3 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono transition-colors text-left"
                  >
                    <span>EDIT HOMEPAGE BANNERS</span>
                    <Paintbrush size={14} />
                  </button>
                </div>
              </div>

              {/* Recent Orders Overview */}
              <div className="md:col-span-2 border border-zinc-800 bg-zinc-900/40 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-mono tracking-widest text-zinc-300 font-bold uppercase">Latest Orders</h3>
                  <button onClick={() => setTab('orders')} className="text-[10px] font-mono text-zinc-400 hover:text-white underline">
                    ALL ORDERS ({orders.length}) &rarr;
                  </button>
                </div>

                <div className="divide-y divide-zinc-800/80">
                  {orders.slice(0, 5).map((o) => (
                    <div key={o.order_id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-mono font-bold text-white">{o.order_id}</p>
                        <p className="text-[11px] text-zinc-400 font-mono">{o.name || o.email} · ₹{(o.total || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-mono px-2 py-0.5 border ${
                          o.status === 'delivered'
                            ? 'border-emerald-700 bg-emerald-950/60 text-emerald-400'
                            : o.status === 'shipped'
                            ? 'border-cyan-700 bg-cyan-950/60 text-cyan-400'
                            : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                        }`}>
                          {(o.status || 'placed').toUpperCase()}
                        </span>
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="text-[10px] font-mono text-zinc-400 hover:text-white underline"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && <p className="text-xs text-zinc-500 py-6 text-center font-mono">No orders yet.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 2: PRODUCTS
        ══════════════════════════════════════════════════════ */}
        {tab === 'products' && (
          <div className="space-y-6">
            {/* Filter & Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[240px]">
                  <Search size={14} className="absolute left-3 top-3 text-zinc-500" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by title, SKU, or kicker..."
                    className="w-full bg-zinc-900 border border-zinc-800 pl-9 pr-4 py-2 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <select
                  value={productCatFilter}
                  onChange={(e) => setProductCatFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs font-mono text-white outline-none"
                >
                  <option value="ALL">ALL CATEGORIES</option>
                  <option value="tees">TEES</option>
                  <option value="hoodies">HOODIES</option>
                  <option value="shirts">SHIRTS</option>
                  <option value="bottoms">BOTTOMS</option>
                  <option value="accessories">ACCESSORIES</option>
                </select>

                <select
                  value={productStatusFilter}
                  onChange={(e) => setProductStatusFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs font-mono text-white outline-none"
                >
                  <option value="ALL">ALL STATUSES</option>
                  <option value="active">ACTIVE</option>
                  <option value="draft">DRAFT</option>
                  <option value="archived">ARCHIVED</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setEditingProduct({
                    name: '',
                    slug: '',
                    kicker: 'NALAYAK HEAVYWEIGHT',
                    price: 999,
                    compareAt: null,
                    category: 'tees',
                    gender: 'unisex',
                    badge: 'NEW',
                    desc: '',
                    fit: 'Oversized boxy drop-shoulder cut.',
                    composition: '100% Combed Heavyweight Cotton. 240+ GSM.',
                    care: 'Cold machine wash inside out. Dry in shade.',
                    story: '',
                    images: [],
                    colors: [{ name: 'BLACK', hex: '#0a0a0a' }],
                    sizes: ['XS', 'S', 'M', 'L', 'XL'],
                        collections: [],
                    stock: 25,
                    status: 'active',
                    newArrival: true,
                    bestSeller: false,
                    featured: false,
                    tags: ['tees', 'streetwear'],
                  });
                }}
                className="flex items-center gap-2 bg-white text-black px-4 py-2 text-xs font-mono font-bold hover:bg-zinc-200 transition-colors uppercase"
              >
                <Plus size={14} />
                <span>ADD PRODUCT</span>
              </button>
            </div>

            {/* Products Table */}
            <div className="border border-zinc-800 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                  <tr>
                    <th className="p-3 w-16">IMAGE</th>
                    <th className="p-3">PRODUCT</th>
                    <th className="p-3">CATEGORY</th>
                    <th className="p-3">PRICE</th>
                    <th className="p-3">STOCK</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredProducts.map((p) => {
                    const thumb = p.images?.[0] || '/editorial/custom-atelier-studio.jpg';
                    const isOOS = (p.stock || 0) <= 0;
                    const isLow = (p.stock || 0) <= 10;
                    return (
                      <tr key={p.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="p-3">
                          <img
                            src={thumb.startsWith('http') || thumb.startsWith('/') ? thumb : `https://images.unsplash.com/${thumb}?w=100`}
                            alt={p.name}
                            className="w-12 h-14 object-cover border border-zinc-800 bg-zinc-900"
                          />
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-white">{p.name}</p>
                          <p className="text-[10px] text-zinc-500">{p.slug} · {p.kicker}</p>
                          {p.badge && (
                            <span className="inline-block mt-1 text-[8px] px-1.5 py-0.2 bg-zinc-800 text-amber-300 border border-zinc-700">
                              {p.badge}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-zinc-400 uppercase">{p.category} · {p.gender}</td>
                        <td className="p-3">
                          <span className="text-white font-bold">₹{p.price}</span>
                          {p.compareAt && <span className="line-through text-zinc-500 ml-2">₹{p.compareAt}</span>}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 border text-[10px] ${
                            isOOS
                              ? 'border-red-800 text-red-400 bg-red-950/40'
                              : isLow
                              ? 'border-amber-800 text-amber-400 bg-amber-950/40'
                              : 'border-zinc-800 text-zinc-300'
                          }`}>
                            {p.stock} in stock
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[9px] uppercase border ${
                            p.status === 'active'
                              ? 'border-emerald-800 text-emerald-400 bg-emerald-950/40'
                              : p.status === 'draft'
                              ? 'border-amber-800 text-amber-400 bg-amber-950/40'
                              : 'border-zinc-700 text-zinc-500'
                          }`}>
                            {p.status || 'active'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingProduct(p)}
                              title="Edit"
                              className="p-1.5 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-colors"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => {
                                act(
                                  () => adminFetch(`/api/admin/catalog/products/${p.id}/duplicate`, key, { method: 'POST' }),
                                  `Duplicated ${p.name}`
                                );
                              }}
                              title="Duplicate"
                              className="p-1.5 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-colors"
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Archive ${p.name}?`)) {
                                  act(
                                    () => adminFetch(`/api/admin/catalog/products/${p.id}`, key, { method: 'DELETE' }),
                                    `Archived ${p.name}`
                                  );
                                }
                              }}
                              title="Archive"
                              className="p-1.5 border border-zinc-800 hover:border-red-800 text-zinc-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 3: INVENTORY MATRIX
        ══════════════════════════════════════════════════════ */}
        {tab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLowStockOnly(!lowStockOnly)}
                  className={`px-3 py-1.5 text-xs font-mono border transition-colors ${
                    lowStockOnly ? 'bg-amber-400 text-black font-bold border-amber-400' : 'border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {lowStockOnly ? 'SHOWING LOW STOCK (<=10)' : 'FILTER LOW STOCK ONLY'}
                </button>
                <span className="text-xs font-mono text-zinc-500">
                  Total store stock: {products.reduce((acc, p) => acc + (p.stock || 0), 0)} units
                </span>
              </div>

              {Object.keys(inventoryBatch).length > 0 && (
                <button
                  onClick={async () => {
                    const updates = Object.entries(inventoryBatch).map(([sku, stock]) => ({
                      sku,
                      stock: Number(stock),
                    }));
                    await act(
                      () =>
                        adminFetch('/api/admin/catalog/inventory', key, {
                          method: 'PATCH',
                          body: JSON.stringify({ updates }),
                        }),
                      `Saved inventory stock for ${updates.length} items.`
                    );
                    setInventoryBatch({});
                  }}
                  className="bg-emerald-400 text-black px-4 py-2 text-xs font-mono font-bold hover:bg-emerald-300 transition-colors uppercase"
                >
                  SAVE {Object.keys(inventoryBatch).length} CHANGES
                </button>
              )}
            </div>

            <div className="border border-zinc-800 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                  <tr>
                    <th className="p-3">PRODUCT</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">SIZE</th>
                    <th className="p-3">COLOR</th>
                    <th className="p-3">CURRENT STOCK</th>
                    <th className="p-3">ADJUST STOCK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {products.flatMap((prod) => {
                    const variants = prod.variants || [];
                    if (lowStockOnly && prod.stock > 10) return [];
                    return variants.map((v) => {
                      const currentVal = inventoryBatch[v.sku] !== undefined ? inventoryBatch[v.sku] : v.stock;
                      return (
                        <tr key={v.sku || v.id} className="hover:bg-zinc-900/40">
                          <td className="p-3 font-bold text-white">{prod.name}</td>
                          <td className="p-3 text-zinc-400">{v.sku}</td>
                          <td className="p-3 text-white font-bold">{v.size}</td>
                          <td className="p-3 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full border border-zinc-700" style={{ backgroundColor: v.color_hex }} />
                            <span>{v.color_name}</span>
                          </td>
                          <td className="p-3">
                            <span className={`font-bold ${currentVal <= 5 ? 'text-red-400' : currentVal <= 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {currentVal}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setInventoryBatch((prev) => ({ ...prev, [v.sku]: Math.max(0, currentVal - 1) }))}
                                className="w-7 h-7 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 flex items-center justify-center font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={currentVal}
                                onChange={(e) => setInventoryBatch((prev) => ({ ...prev, [v.sku]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                className="w-16 bg-zinc-900 border border-zinc-800 text-center py-1 text-xs text-white"
                              />
                              <button
                                onClick={() => setInventoryBatch((prev) => ({ ...prev, [v.sku]: currentVal + 1 }))}
                                className="w-7 h-7 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 flex items-center justify-center font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 4: COLLECTIONS
        ══════════════════════════════════════════════════════ */}
        {tab === 'collections' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-xs font-mono tracking-widest text-zinc-400 uppercase">ACTIVE STORE COLLECTIONS</h2>
              <button
                onClick={() => {
                  setEditingCollection({
                    slug: '',
                    title: '',
                    kicker: 'COLLECTION',
                    desc: '',
                    image: '/collections/the-chaos-edit.jpg',
                    products: [],
                    isActive: true,
                  });
                }}
                className="flex items-center gap-2 bg-white text-black px-4 py-2 text-xs font-mono font-bold hover:bg-zinc-200 transition-colors uppercase"
              >
                <Plus size={14} />
                <span>NEW COLLECTION</span>
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {collections.map((col) => (
                <div key={col.slug} className="border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
                  <div className="relative h-44 overflow-hidden border border-zinc-800 bg-zinc-950">
                    <img src={col.image} alt={col.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 flex flex-col justify-end">
                      <p className="text-[10px] font-mono tracking-widest text-zinc-400">{col.kicker}</p>
                      <h3 className="font-display font-black text-xl text-white tracking-tight">{col.title}</h3>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono">{col.desc}</p>
                  <div className="flex items-center justify-between text-xs font-mono border-t border-zinc-800/80 pt-3">
                    <span className="text-zinc-500">{(col.products || []).length} pieces attached</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingCollection(col)}
                        className="border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 text-zinc-300 hover:text-white"
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete ${col.title}?`)) {
                            act(
                              () => adminFetch(`/api/admin/catalog/collections/${col.slug}`, key, { method: 'DELETE' }),
                              `Deleted ${col.title}`
                            );
                          }
                        }}
                        className="border border-zinc-800 hover:border-red-800 px-3 py-1.5 text-red-400"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 5: DISCOUNTS & COUPONS
        ══════════════════════════════════════════════════════ */}
        {tab === 'discounts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-xs font-mono tracking-widest text-zinc-400 uppercase">PROMOTIONAL CODES & DISCOUNTS</h2>
              <button
                onClick={() => {
                  setEditingDiscount({
                    code: '',
                    discount_type: 'percentage',
                    value: 10,
                    min_order_amount: 999,
                    max_discount: null,
                    usage_limit: 500,
                    is_active: true,
                    description: '',
                  });
                }}
                className="flex items-center gap-2 bg-white text-black px-4 py-2 text-xs font-mono font-bold hover:bg-zinc-200 transition-colors uppercase"
              >
                <Plus size={14} />
                <span>CREATE COUPON</span>
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {discounts.map((d) => (
                <div key={d.code} className="border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-base text-white tracking-widest bg-zinc-800 px-2 py-1">
                      {d.code}
                    </span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 border ${d.is_active ? 'border-emerald-800 text-emerald-400' : 'border-zinc-700 text-zinc-500'}`}>
                      {d.is_active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </div>

                  <p className="text-2xl font-display font-black text-white">
                    {d.discount_type === 'percentage' ? `${d.value}% OFF` : `₹${d.value} OFF`}
                  </p>
                  <p className="text-xs text-zinc-400 font-mono">
                    Min order: ₹{d.min_order_amount || 0}
                    {d.max_discount ? ` · Max discount: ₹${d.max_discount}` : ''}
                  </p>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    Used: {d.usage_count || 0} {d.usage_limit ? `/ ${d.usage_limit} times` : 'times'}
                  </p>

                  <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
                    <button
                      onClick={() => setEditingDiscount(d)}
                      className="text-xs font-mono text-zinc-400 hover:text-white underline"
                    >
                      Edit Rules
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete coupon ${d.code}?`)) {
                          act(
                            () => adminFetch(`/api/admin/catalog/discounts/${d.code}`, key, { method: 'DELETE' }),
                            `Deleted coupon ${d.code}`
                          );
                        }
                      }}
                      className="text-xs font-mono text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 6: ORDERS, TRACKING & PAYMENT BREAKDOWN
        ══════════════════════════════════════════════════════ */}
        {tab === 'orders' && (
          <div className="space-y-6" data-testid="admin-orders">
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 border border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] text-zinc-500 uppercase block tracking-wider">TOTAL GROSS REVENUE</span>
                <span className="text-lg font-bold text-white block mt-1">₹{orderFinancials.gross.toLocaleString('en-IN')}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">{orders.length} orders total</span>
              </div>
              <div className="p-3 border border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] text-emerald-500 uppercase block tracking-wider">RAZORPAY PREPAID</span>
                <span className="text-lg font-bold text-emerald-400 block mt-1">₹{orderFinancials.razorpayPaid.toLocaleString('en-IN')}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">UPI, Cards, NetBanking</span>
              </div>
              <div className="p-3 border border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] text-amber-500 uppercase block tracking-wider">COD PENDING</span>
                <span className="text-lg font-bold text-amber-400 block mt-1">₹{orderFinancials.codPending.toLocaleString('en-IN')}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Collect on delivery</span>
              </div>
              <div className="p-3 border border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] text-indigo-400 uppercase block tracking-wider">COUPONS REDEEMED</span>
                <span className="text-lg font-bold text-indigo-300 block mt-1">₹{orderFinancials.discountsTotal.toLocaleString('en-IN')}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">CHAOS500, WELCOME10</span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search by Order ID, name, email, AWB..."
                  className="bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none w-72"
                />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs font-mono text-white outline-none"
                >
                  <option value="ALL">ALL STATUSES</option>
                  <option value="placed">PLACED</option>
                  <option value="confirmed">CONFIRMED</option>
                  <option value="processing">PROCESSING</option>
                  <option value="shipped">SHIPPED</option>
                  <option value="delivered">DELIVERED</option>
                  <option value="cancelled">CANCELLED</option>
                </select>
                <select
                  value={orderPaymentFilter}
                  onChange={(e) => setOrderPaymentFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs font-mono text-white outline-none"
                >
                  <option value="ALL">ALL PAYMENTS</option>
                  <option value="PAID">PAID (RAZORPAY)</option>
                  <option value="PENDING">PENDING PAYMENT</option>
                  <option value="COD">CASH ON DELIVERY</option>
                </select>
              </div>

              <span className="text-xs font-mono text-zinc-400">
                {filteredOrders.length} orders matching
              </span>
            </div>

            {/* Orders List */}
            <div className="divide-y divide-zinc-800 border border-zinc-800">
              {filteredOrders.length === 0 && <p className="py-12 text-zinc-500 text-xs font-mono text-center">No orders match criteria.</p>}
              {filteredOrders.map((o) => {
                const isPaid = (o.payment_status || '').toUpperCase() === 'PAID';
                const awb = o.tracking_awb || o.tracking_number;
                const partner = o.tracking_partner || o.courier_name || 'Delhivery Express';
                return (
                  <div key={o.order_id} className="p-4 grid lg:grid-cols-[1.5fr_1fr_auto] gap-4 items-center hover:bg-zinc-900/40 transition-colors" data-testid={`admin-order-${o.order_id}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-bold text-white text-sm">{o.order_id}</p>
                        <span className="text-zinc-500 font-mono text-xs">— {o.email}</span>
                      </div>
                      <p className="text-xs text-zinc-400 font-mono mt-1">
                        {o.name} · {o.phone} · ₹{(o.total || 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        {o.items?.map((i) => `${i.name} (${i.size || 'OS'} · ${i.color || 'Standard'}) × ${i.qty || 1}`).join(', ')}
                      </p>
                      {awb && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-950/50 text-cyan-400 border border-cyan-800 flex items-center gap-1">
                            <Truck size={10} />
                            <span>{partner} · AWB: {awb}</span>
                          </span>
                          <a
                            href={`/track/${o.order_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-zinc-400 hover:text-white underline flex items-center gap-0.5"
                          >
                            <span>LIVE TRACK</span>
                            <ArrowUpRight size={10} />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Payment Details Column */}
                    <div className="text-xs font-mono space-y-1">
                      <div className="flex items-center gap-1.5">
                        <CreditCard size={12} className={isPaid ? 'text-emerald-400' : 'text-amber-400'} />
                        <span className="text-zinc-300 font-semibold">{o.payment_method || 'Razorpay UPI'}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 font-bold uppercase ${
                          isPaid ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {o.payment_status || (o.payment_method?.includes('COD') ? 'PENDING' : 'PAID')}
                        </span>
                      </div>
                      {o.razorpay_payment_id && (
                        <p className="text-[10px] text-zinc-500 truncate" title={o.razorpay_payment_id}>
                          Ref: {o.razorpay_payment_id}
                        </p>
                      )}
                      <p className="text-[10px] text-zinc-400">
                        Net: ₹{o.total} {o.discount ? `(₹${o.discount} off)` : ''}
                      </p>
                    </div>

                    {/* Actions Column */}
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      <span className={`text-[10px] font-mono tracking-widest px-2.5 py-1 border ${
                        o.status === 'delivered'
                          ? 'border-emerald-800 text-emerald-400 bg-emerald-950/40'
                          : o.status === 'shipped'
                          ? 'border-cyan-800 text-cyan-400 bg-cyan-950/40'
                          : 'border-zinc-700 text-zinc-300'
                      }`}>
                        {(o.status || 'placed').toUpperCase()}
                      </span>

                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="bg-white text-black hover:bg-zinc-200 px-3 py-1.5 text-[10px] font-mono font-bold tracking-widest uppercase transition-colors"
                      >
                        TRACK / FULFILL
                      </button>

                      {o.status === 'shipped' && (
                        <StatusButton
                          label="MARK DELIVERED"
                          testId={`admin-deliver-${o.order_id}`}
                          onClick={() =>
                            act(
                              () =>
                                adminFetch(`/api/orders/${o.order_id}/status`, key, {
                                  method: 'POST',
                                  body: JSON.stringify({ status: 'delivered' }),
                                }),
                              `${o.order_id} → DELIVERED.`
                            )
                          }
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 6.5: CUSTOMERS & SIGN-IN ACCOUNTS
        ══════════════════════════════════════════════════════ */}
        {tab === 'customers' && (
          <div className="space-y-6" data-testid="admin-customers">
            {/* Customer KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 border border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] text-zinc-500 uppercase block tracking-wider">TOTAL CUSTOMERS</span>
                <span className="text-lg font-bold text-white block mt-1">{customers.length}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Active streetwear client base</span>
              </div>
              <div className="p-3 border border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] text-yellow-500 uppercase block tracking-wider">VIP CLUB MEMBERS</span>
                <span className="text-lg font-bold text-yellow-400 block mt-1">
                  {customers.filter((c) => (c.membership_tier || '').includes('CLUB') || (c.membership_tier || '').includes('VIP')).length}
                </span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Lifetime Founding Access</span>
              </div>
              <div className="p-3 border border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] text-zinc-500 uppercase block tracking-wider">SIGN-IN ACCOUNTS</span>
                <span className="text-lg font-bold text-white block mt-1">{accounts.length}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Registered credentials</span>
              </div>
              <div className="p-3 border border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] text-zinc-500 uppercase block tracking-wider">LIFETIME VOLUME</span>
                <span className="text-lg font-bold text-white block mt-1">
                  ₹{customers.reduce((acc, c) => acc + (c.total_spent || 0), 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Cumulative customer spend</span>
              </div>
            </div>

            {/* Sub-view Navigation & Search */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCustomerSubView('customers')}
                  className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
                    customerSubView === 'customers'
                      ? 'bg-white text-black font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  CUSTOMER PROFILES ({customers.length})
                </button>
                <button
                  onClick={() => setCustomerSubView('accounts')}
                  className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
                    customerSubView === 'accounts'
                      ? 'bg-white text-black font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  SIGN-IN ACCOUNTS & AUTH ({accounts.length})
                </button>
              </div>

              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by customer name, email, phone, city..."
                className="bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none w-72"
              />
            </div>

            {/* View 1: Customer Profiles */}
            {customerSubView === 'customers' && (
              <div className="border border-zinc-800 overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                    <tr>
                      <th className="p-3">CUSTOMER</th>
                      <th className="p-3">CONTACT</th>
                      <th className="p-3">LOCATION</th>
                      <th className="p-3">ORDERS</th>
                      <th className="p-3">TOTAL SPENT</th>
                      <th className="p-3">MEMBERSHIP</th>
                      <th className="p-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {customers
                      .filter((c) => {
                        const q = customerSearch.toLowerCase();
                        return !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q);
                      })
                      .map((c) => (
                        <tr key={c.id || c.email} className="hover:bg-zinc-900/50">
                          <td className="p-3 font-bold text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-300 font-mono">
                              {(c.name || 'C')[0]}
                            </span>
                            <span>{c.name}</span>
                          </td>
                          <td className="p-3 text-zinc-300">
                            <div>{c.email}</div>
                            <div className="text-[10px] text-zinc-500">{c.phone}</div>
                          </td>
                          <td className="p-3 text-zinc-400">
                            {c.city !== '—' ? `${c.city}, ${c.state || ''}` : '—'}
                          </td>
                          <td className="p-3 font-semibold text-white">{c.total_orders || 0}</td>
                          <td className="p-3 font-bold text-white">₹{(c.total_spent || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3">
                            <span className={`text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider ${
                              (c.membership_tier || '').includes('CLUB') || (c.membership_tier || '').includes('VIP')
                                ? 'bg-yellow-950 text-yellow-400 border border-yellow-800'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}>
                              {c.membership_tier || 'GUEST'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setViewingCustomer(c)}
                              className="px-2.5 py-1 text-[10px] font-mono border border-zinc-700 hover:border-white text-zinc-200 hover:text-white uppercase transition-colors"
                            >
                              VIEW PROFILE
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* View 2: Sign-in Accounts & Auth Credentials */}
            {customerSubView === 'accounts' && (
              <div className="border border-zinc-800 overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                    <tr>
                      <th className="p-3">ACCOUNT EMAIL</th>
                      <th className="p-3">NAME</th>
                      <th className="p-3">AUTH PROVIDER</th>
                      <th className="p-3">ROLE</th>
                      <th className="p-3">LAST SIGN IN</th>
                      <th className="p-3 text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {accounts.map((acc, aIdx) => (
                      <tr key={aIdx} className="hover:bg-zinc-900/50">
                        <td className="p-3 font-bold text-white flex items-center gap-1.5">
                          <Lock size={12} className="text-zinc-500" />
                          <span>{acc.email}</span>
                        </td>
                        <td className="p-3 text-zinc-300">{acc.name || '—'}</td>
                        <td className="p-3">
                          <span className="text-[10px] px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 uppercase">
                            {acc.auth_provider || 'Email OTP'}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-300">{acc.role || 'Customer'}</td>
                        <td className="p-3 text-zinc-400 text-[11px]">
                          {acc.last_sign_in ? new Date(acc.last_sign_in).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-[9px] px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold uppercase">
                            VERIFIED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 7: STOREFRONT CMS
        ══════════════════════════════════════════════════════ */}
        {tab === 'storefront' && storefront && (
          <div className="space-y-8 max-w-[900px]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-xs font-mono tracking-widest text-zinc-400 uppercase">VISUAL STOREFRONT CONTENT EDITOR</h2>
              <button
                onClick={async () => {
                  await act(
                    () =>
                      adminFetch('/api/admin/catalog/storefront', key, {
                        method: 'PUT',
                        body: JSON.stringify({ content: storefront }),
                      }),
                    'Storefront content updated and published live.'
                  );
                }}
                className="bg-white text-black px-5 py-2 text-xs font-mono font-bold hover:bg-zinc-200 transition-colors uppercase"
              >
                PUBLISH STOREFRONT CHANGES
              </button>
            </div>

            {/* Announcement Bar */}
            <div className="border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
              <h3 className="text-xs font-mono tracking-widest text-zinc-300 font-bold uppercase">Announcement Ticker</h3>
              <div className="space-y-3">
                <label className="block text-[10px] font-mono text-zinc-400">TICKER TEXT</label>
                <input
                  type="text"
                  value={storefront.announcement?.text || ''}
                  onChange={(e) =>
                    setStorefront({
                      ...storefront,
                      announcement: { ...(storefront.announcement || {}), text: e.target.value },
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 text-xs font-mono text-white"
                />
              </div>
            </div>

            {/* Hero Banner Section */}
            <div className="border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
              <h3 className="text-xs font-mono tracking-widest text-zinc-300 font-bold uppercase">Homepage Hero Banner</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1">KICKER</label>
                  <input
                    type="text"
                    value={storefront.hero?.kicker || ''}
                    onChange={(e) =>
                      setStorefront({
                        ...storefront,
                        hero: { ...(storefront.hero || {}), kicker: e.target.value },
                      })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 p-2.5 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1">DESKTOP IMAGE PATH</label>
                  <input
                    type="text"
                    value={storefront.hero?.desktop || ''}
                    onChange={(e) =>
                      setStorefront({
                        ...storefront,
                        hero: { ...(storefront.hero || {}), desktop: e.target.value },
                      })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 p-2.5 text-xs font-mono text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1">EDITORIAL COPY</label>
                  <textarea
                    rows={2}
                    value={storefront.hero?.copy || ''}
                    onChange={(e) =>
                      setStorefront({
                        ...storefront,
                        hero: { ...(storefront.hero || {}), copy: e.target.value },
                      })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 p-2.5 text-xs font-mono text-white"
                  />
                </div>
              </div>
            </div>

            {/* Campaign Banner Section */}
            <div className="border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
              <h3 className="text-xs font-mono tracking-widest text-zinc-300 font-bold uppercase">Campaign Section</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1">CAMPAIGN HEADLINE</label>
                  <input
                    type="text"
                    value={storefront.campaign?.headline || ''}
                    onChange={(e) =>
                      setStorefront({
                        ...storefront,
                        campaign: { ...(storefront.campaign || {}), headline: e.target.value },
                      })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 p-2.5 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1">BACKGROUND IMAGE</label>
                  <input
                    type="text"
                    value={storefront.campaign?.bg || ''}
                    onChange={(e) =>
                      setStorefront({
                        ...storefront,
                        campaign: { ...(storefront.campaign || {}), bg: e.target.value },
                      })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 p-2.5 text-xs font-mono text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 8: AUDIT TRAIL
        ══════════════════════════════════════════════════════ */}
        {tab === 'audit' && (
          <div className="space-y-4">
            <h2 className="text-xs font-mono tracking-widest text-zinc-400 uppercase">ADMINISTRATIVE AUDIT LOG</h2>
            <div className="border border-zinc-800 divide-y divide-zinc-800/60">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 text-xs font-mono flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-emerald-400 font-bold uppercase">{log.action}</span>
                    <span className="text-zinc-500 mx-2">·</span>
                    <span className="text-zinc-300">{log.entity_type} [{log.entity_id}]</span>
                    {log.details && (
                      <span className="text-zinc-500 block text-[10px] mt-0.5">
                        {JSON.stringify(log.details)}
                      </span>
                    )}
                  </div>
                  <div className="text-right text-[10px] text-zinc-500">
                    <span>{log.admin_identity}</span> · <span>{new Date(log.timestamp).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && <p className="p-6 text-center text-xs font-mono text-zinc-500">No audit logs recorded yet.</p>}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PRESERVED TABS: CUSTOM REQUESTS, SUPPORT, IRL, DROPS
        ══════════════════════════════════════════════════════ */}
        {tab === 'custom' && (
          <div className="divide-y divide-zinc-800 border border-zinc-800" data-testid="admin-custom">
            {(requests || []).length === 0 && <p className="py-10 text-zinc-500 text-xs font-mono text-center">No custom requests yet.</p>}
            {(requests || []).map((r) => (
              <div key={r.ref} className="p-4 grid md:grid-cols-[1fr_auto_auto] gap-3 items-center" data-testid={`admin-req-${r.ref}`}>
                <div>
                  <p className="font-mono font-bold">{r.ref} <span className="text-zinc-500 font-normal">— {r.name} · {r.email}</span></p>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{r.garment} · {r.size} · {(r.description || '').slice(0, 80)}</p>
                </div>
                <span className="text-[10px] tracking-widest font-mono text-zinc-400">{(r.status || 'received').toUpperCase()}</span>
                {REQ_NEXT[r.status || 'received'] ? (
                  <StatusButton
                    label={`MARK ${REQ_NEXT[r.status || 'received'].replace('-', ' ').toUpperCase()}`}
                    testId={`admin-advance-${r.ref}`}
                    onClick={() => act(() => adminFetch(`/api/custom-requests/${r.ref}/status`, key, { method: 'POST', body: JSON.stringify({ status: REQ_NEXT[r.status || 'received'] }) }), `${r.ref} updated.`)}
                  />
                ) : (
                  <span className="text-[10px] font-mono text-zinc-500">DONE</span>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'support' && (
          <div className="divide-y divide-zinc-800 border border-zinc-800" data-testid="admin-support">
            {(tickets || []).length === 0 && <p className="py-10 text-zinc-500 text-xs font-mono text-center">No support tickets.</p>}
            {(tickets || []).map((ticket) => (
              <div key={ticket.ticket_number} className="p-4 space-y-3" data-testid={`admin-ticket-${ticket.ticket_number}`}>
                <div className="flex items-center justify-between">
                  <p className="font-mono font-bold text-sm">{ticket.ticket_number} · Order {ticket.order_id || '—'}</p>
                  <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 border border-zinc-700">{(ticket.status || 'open').toUpperCase()}</span>
                </div>
                <p className="text-xs text-zinc-400 font-mono">{ticket.description}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'irl' && (
          <div className="space-y-6" data-testid="admin-irl">
            {/* Header with Add Button */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  NALAYAK IRL & COMMUNITY ATELIER GALLERY
                </h2>
                <p className="text-xs font-mono text-zinc-400 mt-1">
                  Curate community streetwear fit pics and brand lookbooks live to the homepage.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAddingIrl(true)}
                  className="flex items-center gap-2 bg-white text-black px-4 py-2 text-xs font-mono font-bold hover:bg-zinc-200 transition-colors uppercase"
                >
                  <Plus size={14} />
                  <span>ADD LOOKBOOK PHOTO</span>
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 border border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] text-zinc-500 uppercase block tracking-wider">TOTAL SUBMISSIONS</span>
                <span className="text-lg font-bold text-white block mt-1">{irl.length}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">All community & editorial fits</span>
              </div>
              <div className="p-3 border border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] text-emerald-500 uppercase block tracking-wider">LIVE ON SITE</span>
                <span className="text-lg font-bold text-emerald-400 block mt-1">
                  {irl.filter((i) => i.status === 'approved').length}
                </span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Visible on Homepage IRL grid</span>
              </div>
              <div className="p-3 border border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] text-amber-500 uppercase block tracking-wider">PENDING REVIEW</span>
                <span className="text-lg font-bold text-amber-400 block mt-1">
                  {irl.filter((i) => i.status === 'pending').length}
                </span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Awaiting editorial sign-off</span>
              </div>
              <div className="p-3 border border-zinc-800 bg-zinc-900/60">
                <span className="text-[10px] text-zinc-500 uppercase block tracking-wider">COMMUNITY IMPACT</span>
                <span className="text-lg font-bold text-white block mt-1">100% RAW</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Authentic client streetwear</span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-zinc-800 pb-3">
              {[
                { id: 'ALL', label: `ALL FITS (${irl.length})` },
                { id: 'pending', label: `PENDING REVIEW (${irl.filter((i) => i.status === 'pending').length})` },
                { id: 'approved', label: `LIVE ON SITE (${irl.filter((i) => i.status === 'approved').length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setIrlFilter(f.id)}
                  className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
                    irlFilter === f.id
                      ? 'bg-white text-black font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {irl
                .filter((item) => irlFilter === 'ALL' || item.status === irlFilter)
                .map((item) => {
                  const isApproved = item.status === 'approved';
                  const imgSrc = item.image_url?.startsWith('http') || item.image_url?.startsWith('/')
                    ? item.image_url
                    : `https://images.unsplash.com/${item.image_url}?w=600`;
                  return (
                    <div
                      key={item.id}
                      className="border border-zinc-800 bg-zinc-900 overflow-hidden flex flex-col justify-between group"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-black">
                        <img
                          src={imgSrc}
                          alt={item.caption || item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className={`absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider font-mono ${
                          isApproved ? 'bg-emerald-500 text-black' : 'bg-amber-500 text-black'
                        }`}>
                          {isApproved ? 'LIVE ON SITE' : 'PENDING'}
                        </span>
                        {item.city && (
                          <span className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-sm text-white text-[9px] font-mono px-2 py-0.5 uppercase">
                            {item.city}
                          </span>
                        )}
                      </div>

                      <div className="p-3 text-xs font-mono space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white uppercase">{item.name}</span>
                            <span className="text-zinc-500 text-[10px]">{item.handle}</span>
                          </div>
                          {item.caption && (
                            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                              {item.caption}
                            </p>
                          )}
                          {item.order_id && (
                            <p className="text-[10px] text-cyan-400 mt-1">
                              Verified Order: {item.order_id}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                          {!isApproved ? (
                            <button
                              onClick={() =>
                                act(
                                  async () => {
                                    await adminFetch(`/api/admin/irl/${item.id}/status`, key, {
                                      method: 'POST',
                                      body: JSON.stringify({ status: 'approved' }),
                                    });
                                    const refreshed = await adminFetch('/api/admin/irl', key);
                                    setIrl(refreshed.items || refreshed.irl || []);
                                  },
                                  `Approved & published fit by ${item.name} to homepage.`
                                )
                              }
                              className="flex-1 bg-white text-black hover:bg-zinc-200 py-1.5 text-[10px] font-bold uppercase transition-colors text-center"
                            >
                              APPROVE & PUBLISH
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                act(
                                  async () => {
                                    await adminFetch(`/api/admin/irl/${item.id}/status`, key, {
                                      method: 'POST',
                                      body: JSON.stringify({ status: 'pending' }),
                                    });
                                    const refreshed = await adminFetch('/api/admin/irl', key);
                                    setIrl(refreshed.items || refreshed.irl || []);
                                  },
                                  `Unpublished fit by ${item.name}.`
                                )
                              }
                              className="flex-1 border border-zinc-700 hover:border-zinc-500 text-zinc-300 py-1.5 text-[10px] font-bold uppercase transition-colors text-center"
                            >
                              UNPUBLISH
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (window.confirm(`Delete photo submission by ${item.name}?`)) {
                                act(
                                  async () => {
                                    await adminFetch(`/api/admin/irl/${item.id}`, key, { method: 'DELETE' });
                                    const refreshed = await adminFetch('/api/admin/irl', key);
                                    setIrl(refreshed.items || refreshed.irl || []);
                                  },
                                  'Fit removed from gallery.'
                                );
                              }
                            }}
                            className="p-1.5 text-zinc-500 hover:text-red-400 border border-zinc-800"
                            title="Delete fit"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {tab === 'drops' && (
          <div className="p-6 border border-zinc-800 text-center font-mono text-xs text-zinc-400 space-y-4">
            <p>BROADCAST DROP ALERTS TO REGISTERED VIP MEMBERS</p>
            <button
              onClick={() => {
                if (window.confirm('Broadcast live drop email to all registered members?')) {
                  act(
                    () => adminFetch('/api/drops/go-live', key, { method: 'POST', body: JSON.stringify({ drop_slug: 'the-chaos-edit' }) }),
                    'Drop alerts dispatched.'
                  );
                }
              }}
              className="bg-white text-black px-4 py-2 font-bold uppercase"
            >
              TRIGGER DROP VIP NOTIFICATION
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          MODAL: PRODUCT EDITOR & VARIANT BUILDER
      ══════════════════════════════════════════════════════ */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-sm font-mono tracking-widest font-bold uppercase">
                {editingProduct.id ? `EDIT PIECE: ${editingProduct.name}` : 'CREATE NEW PIECE'}
              </h2>
              <button onClick={() => setEditingProduct(null)} className="text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="block text-zinc-400 mb-1">TITLE</label>
                <input
                  type="text"
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">SLUG</label>
                <input
                  type="text"
                  value={editingProduct.slug || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, slug: e.target.value })}
                  placeholder="auto-generated-if-empty"
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">PRICE (₹)</label>
                <input
                  type="number"
                  value={editingProduct.price || 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) || 0 })}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">COMPARE AT PRICE (₹)</label>
                <input
                  type="number"
                  value={editingProduct.compareAt || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, compareAt: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">CATEGORY</label>
                <select
                  value={editingProduct.category || 'tees'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                >
                  <option value="tees">TEES</option>
                  <option value="hoodies">HOODIES</option>
                  <option value="shirts">SHIRTS</option>
                  <option value="bottoms">BOTTOMS</option>
                  <option value="accessories">ACCESSORIES</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">GENDER</label>
                <select
                  value={editingProduct.gender || 'unisex'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, gender: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                >
                  <option value="unisex">UNISEX</option>
                  <option value="men">MEN</option>
                  <option value="women">WOMEN</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">BADGE</label>
                <input
                  type="text"
                  value={editingProduct.badge || ''}
                  placeholder="NEW, BEST SELLER, LIMITED, etc."
                  onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value || null })}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">STATUS</label>
                <select
                  value={editingProduct.status || 'active'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                >
                  <option value="active">ACTIVE (PUBLISHED ON STORE)</option>
                  <option value="draft">DRAFT (HIDDEN)</option>
                  <option value="archived">ARCHIVED</option>
                </select>
              </div>

              {/* Collection Mapping */}
              <div className="sm:col-span-2 border border-zinc-800 p-3 bg-zinc-950 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-300 font-bold uppercase text-[11px] flex items-center gap-1.5">
                    <Layers size={13} className="text-white" />
                    <span>MAP TO COLLECTIONS & DROPS</span>
                  </label>
                  <span className="text-[10px] text-zinc-500">
                    {(editingProduct.collections || []).length} collections mapped
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Select which curated collections (e.g. The Chaos Edit, After Hours, Everyday Nalayak) will feature this piece.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                  {collections.map((col) => {
                    const mapped = (editingProduct.collections || []).includes(col.slug);
                    return (
                      <button
                        key={col.slug}
                        type="button"
                        onClick={() => {
                          const current = editingProduct.collections || [];
                          const updated = mapped
                            ? current.filter((s) => s !== col.slug)
                            : [...current, col.slug];
                          setEditingProduct({ ...editingProduct, collections: updated });
                        }}
                        className={`p-2 border text-left flex items-center justify-between transition-colors ${
                          mapped
                            ? 'border-white bg-zinc-800 text-white font-bold'
                            : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        <span className="truncate text-[10px] uppercase">{col.title}</span>
                        {mapped ? <CheckCircle2 size={12} className="text-white shrink-0 ml-1" /> : <Plus size={12} className="text-zinc-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Storefront Placement Toggles */}
              <div className="sm:col-span-2 border border-zinc-800 p-3 bg-zinc-950 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2.5 p-2 bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-zinc-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.newArrival)}
                    onChange={(e) => setEditingProduct({ ...editingProduct, newArrival: e.target.checked })}
                    className="accent-white h-4 w-4 rounded"
                  />
                  <div>
                    <span className="text-[11px] font-bold text-white block uppercase">NEW IN LANDING</span>
                    <span className="text-[9px] text-zinc-400 block">Show in /new-arrivals</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-zinc-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.bestSeller)}
                    onChange={(e) => setEditingProduct({ ...editingProduct, bestSeller: e.target.checked })}
                    className="accent-white h-4 w-4 rounded"
                  />
                  <div>
                    <span className="text-[11px] font-bold text-white block uppercase">BEST SELLER</span>
                    <span className="text-[9px] text-zinc-400 block">Featured as Most Wanted</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2 bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-zinc-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.featured)}
                    onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                    className="accent-white h-4 w-4 rounded"
                  />
                  <div>
                    <span className="text-[11px] font-bold text-white block uppercase">HOMEPAGE HERO</span>
                    <span className="text-[9px] text-zinc-400 block">Editorial homepage placement</span>
                  </div>
                </label>
              </div>

              {/* Available Sizes Picker */}
              <div className="sm:col-span-2 border border-zinc-800 p-3 bg-zinc-950 space-y-2">
                <label className="block text-zinc-300 font-bold uppercase text-[11px]">OFFERED SIZES</label>
                <div className="flex flex-wrap gap-2">
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'OS'].map((sz) => {
                    const active = (editingProduct.sizes || []).includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          const current = editingProduct.sizes || [];
                          const updated = active
                            ? current.filter((s) => s !== sz)
                            : [...current, sz];
                          setEditingProduct({ ...editingProduct, sizes: updated });
                        }}
                        className={`px-3 py-1.5 border text-xs font-mono font-bold uppercase transition-colors ${
                          active
                            ? 'bg-white text-black border-white'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colors Swatches Manager */}
              <div className="sm:col-span-2 border border-zinc-800 p-3 bg-zinc-950 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-zinc-300 font-bold uppercase text-[11px]">COLOR SWATCHES</label>
                  <button
                    type="button"
                    onClick={() => {
                      const name = window.prompt('Color name (e.g. COBALT BLUE, CHALK WHITE):');
                      if (!name) return;
                      const hex = window.prompt('Color hex code (e.g. #1035FF, #F4F1EA):', '#0a0a0a') || '#0a0a0a';
                      setEditingProduct({
                        ...editingProduct,
                        colors: [...(editingProduct.colors || []), { name: name.toUpperCase(), hex }],
                      });
                    }}
                    className="text-[10px] text-zinc-300 hover:text-white underline font-mono uppercase"
                  >
                    + ADD COLOR SWATCH
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editingProduct.colors || []).map((col, cIdx) => (
                    <div
                      key={cIdx}
                      className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-xs"
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-zinc-700" style={{ backgroundColor: col.hex }} />
                      <span className="text-zinc-200 font-bold">{col.name}</span>
                      <span className="text-zinc-500 font-mono text-[10px]">{col.hex}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct({
                            ...editingProduct,
                            colors: editingProduct.colors.filter((_, i) => i !== cIdx),
                          });
                        }}
                        className="text-zinc-500 hover:text-red-400 ml-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-zinc-400 mb-1">SEARCH & EDITORIAL TAGS (COMMA-SEPARATED)</label>
                <input
                  type="text"
                  value={Array.isArray(editingProduct.tags) ? editingProduct.tags.join(', ') : (editingProduct.tags || '')}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
                    setEditingProduct({ ...editingProduct, tags: parsed });
                  }}
                  placeholder="oversized, heavyweight, 240-gsm, acid-wash, brutalist, aw26"
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-zinc-400 mb-1">EDITORIAL DESCRIPTION</label>
                <textarea
                  rows={2}
                  value={editingProduct.desc || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, desc: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                />
              </div>

              {/* Media Uploader */}
              <div className="sm:col-span-2 border border-zinc-800 p-3 bg-zinc-950 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-400">PRODUCT MEDIA ASSETS</label>
                  <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 px-3 py-1 text-white flex items-center gap-1.5">
                    <Upload size={12} />
                    <span>UPLOAD IMAGE FILE</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append('file', file);
                        try {
                          const res = await fetch(`${API()}/api/admin/catalog/media/upload`, {
                            method: 'POST',
                            headers: {
                              'X-Admin-Key': key || '',
                              'X-Admin-Session': sessionToken || '',
                            },
                            body: formData,
                          });
                          if (!res.ok) throw new Error('Upload failed');
                          const data = await res.json();
                          setEditingProduct({
                            ...editingProduct,
                            images: [...(editingProduct.images || []), data.url],
                          });
                          toast.success('Image uploaded.');
                        } catch {
                          toast.error('Image upload failed.');
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(editingProduct.images || []).map((imgUrl, idx) => {
                    const isCover = idx === 0;
                    return (
                      <div key={idx} className={`relative group w-24 h-32 border ${isCover ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-zinc-800'} bg-zinc-900 flex flex-col justify-between overflow-hidden`}>
                        <img
                          src={imgUrl.startsWith('http') || imgUrl.startsWith('/') ? imgUrl : `https://images.unsplash.com/${imgUrl}?w=200`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {isCover && (
                          <span className="absolute top-1 left-1 bg-emerald-500 text-black text-[8px] font-bold px-1.5 py-0.5 tracking-wider uppercase">
                            PRIMARY
                          </span>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-sm p-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          {!isCover && (
                            <button
                              type="button"
                              onClick={() => {
                                const newImgs = [...editingProduct.images];
                                const [selected] = newImgs.splice(idx, 1);
                                newImgs.unshift(selected);
                                setEditingProduct({ ...editingProduct, images: newImgs });
                                toast.success('Set as primary cover image');
                              }}
                              className="text-[8px] text-zinc-300 hover:text-white uppercase font-bold"
                            >
                              MAKE COVER
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setEditingProduct({
                                ...editingProduct,
                                images: editingProduct.images.filter((_, i) => i !== idx),
                              })
                            }
                            className="bg-red-600/80 hover:bg-red-600 text-white p-1 ml-auto"
                            title="Delete image"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(editingProduct.images || []).length === 0 && (
                    <div className="w-full py-8 text-center border border-dashed border-zinc-800 bg-zinc-950/40 text-zinc-500 text-xs">
                      No images added yet. Click &quot;UPLOAD IMAGE FILE&quot; above to select your product photography.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4 flex justify-end gap-3">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white font-mono text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={async () => {
                  if (!editingProduct.name.trim()) {
                    toast.error('Product title is required.');
                    return;
                  }
                  const method = editingProduct.id ? 'PUT' : 'POST';
                  const endpoint = editingProduct.id
                    ? `/api/admin/catalog/products/${editingProduct.id}`
                    : '/api/admin/catalog/products';

                  await act(
                    () => adminFetch(endpoint, key, { method, body: JSON.stringify(editingProduct) }),
                    `Saved product ${editingProduct.name}`
                  );
                  setEditingProduct(null);
                }}
                className="bg-white text-black px-6 py-2 text-xs font-mono font-bold hover:bg-zinc-200 transition-colors uppercase"
              >
                SAVE PIECE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL: ORDER FULFILLMENT & TRACKING
      ══════════════════════════════════════════════════════ */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <p className="text-xs font-mono text-zinc-400">ORDER FULFILLMENT</p>
                <h2 className="text-base font-mono font-bold text-white">{selectedOrder.order_id}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-3 bg-zinc-950 border border-zinc-800">
                <p className="text-zinc-400 text-[10px] mb-1">SHIPPING DESTINATION</p>
                <p className="text-white font-bold">{selectedOrder.name} ({selectedOrder.phone})</p>
                <p className="text-zinc-400 mt-1">{selectedOrder.shipping_address}</p>
                <p className="text-zinc-500 text-[10px] mt-1">{selectedOrder.email}</p>
              </div>

              <div className="space-y-2">
                <p className="text-zinc-400 text-[10px]">ORDER ITEMS</p>
                {(selectedOrder.items || []).map((i, idx) => (
                  <div key={idx} className="flex justify-between border-b border-zinc-800 py-1.5">
                    <span>{i.name} ({i.size} · {i.color}) × {i.qty}</span>
                    <span className="text-white font-bold">₹{(i.price || 0) * (i.qty || 1)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-2 text-white">
                  <span>TOTAL CHARGED</span>
                  <span>₹{selectedOrder.total}</span>
                </div>
              </div>

              {/* Payment Details in Modal */}
              <div className="p-3 bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-zinc-500 text-[10px] uppercase block tracking-wider">PAYMENT AUDIT TRAIL</span>
                <div className="flex flex-wrap items-center justify-between text-xs pt-1">
                  <span>Method: <strong className="text-white">{selectedOrder.payment_method || 'Razorpay UPI'}</strong></span>
                  <span className={`px-2 py-0.5 font-bold uppercase text-[9px] ${
                    (selectedOrder.payment_status || 'PAID') === 'PAID'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}>
                    {selectedOrder.payment_status || (selectedOrder.payment_method?.includes('COD') ? 'PENDING' : 'PAID')}
                  </span>
                </div>
                {selectedOrder.razorpay_payment_id && (
                  <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                    Razorpay ID: {selectedOrder.razorpay_payment_id}
                  </p>
                )}
              </div>

              {/* Direct Customer Tracking Portal Link */}
              <div className="flex items-center justify-between p-2.5 bg-zinc-950 border border-zinc-800">
                <div className="flex items-center gap-2">
                  <Truck size={14} className="text-cyan-400" />
                  <span className="text-zinc-300 text-xs">Customer Tracking View</span>
                </div>
                <a
                  href={`/track/${selectedOrder.order_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline uppercase"
                >
                  <span>OPEN LIVE TRACKING PORTAL</span>
                  <ArrowUpRight size={11} />
                </a>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
                <div>
                  <label className="block text-zinc-400 text-[10px] mb-1">FULFILLMENT STATUS</label>
                  <select
                    defaultValue={selectedOrder.status || 'shipped'}
                    id="fulfillment-status-select"
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                  >
                    <option value="placed">PLACED</option>
                    <option value="confirmed">CONFIRMED</option>
                    <option value="processing">PROCESSING</option>
                    <option value="shipped">SHIPPED</option>
                    <option value="delivered">DELIVERED</option>
                    <option value="cancelled">CANCELLED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[10px] mb-1">COURIER PARTNER</label>
                  <input
                    type="text"
                    id="fulfillment-courier-input"
                    defaultValue={selectedOrder.tracking_partner || selectedOrder.courier_name || 'Delhivery Express'}
                    placeholder="Delhivery Express, BlueDart Prime, Shiprocket..."
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 text-[10px] mb-1">TRACKING AWB NUMBER</label>
                  <input
                    type="text"
                    id="fulfillment-awb-input"
                    defaultValue={selectedOrder.tracking_awb || selectedOrder.tracking_number || `DEL${Math.floor(100000000 + Math.random() * 900000000)}`}
                    placeholder="DEL9821447012"
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4 flex justify-end gap-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white font-mono text-xs"
              >
                CLOSE
              </button>
              <button
                onClick={async () => {
                  const status = document.getElementById('fulfillment-status-select')?.value || 'shipped';
                  const courier = document.getElementById('fulfillment-courier-input')?.value;
                  const awb = document.getElementById('fulfillment-awb-input')?.value;

                  await act(
                    () =>
                      adminFetch(`/api/admin/orders/${selectedOrder.order_id}/fulfill`, key, {
                        method: 'POST',
                        body: JSON.stringify({
                          status,
                          courier_name: courier,
                          tracking_number: awb,
                        }),
                      }),
                    `Order ${selectedOrder.order_id} fulfilled.`
                  );
                  setSelectedOrder(null);
                }}
                className="bg-white text-black px-6 py-2 text-xs font-mono font-bold hover:bg-zinc-200 transition-colors uppercase"
              >
                UPDATE FULFILLMENT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL: DISCOUNT / COUPON EDITOR
      ══════════════════════════════════════════════════════ */}
      {editingDiscount && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg p-6 space-y-5 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="font-bold text-white uppercase">{editingDiscount.code ? `EDIT: ${editingDiscount.code}` : 'NEW COUPON'}</h2>
              <button onClick={() => setEditingDiscount(null)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">COUPON CODE (UPPERCASE)</label>
                <input
                  type="text"
                  value={editingDiscount.code || ''}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. VIP20, DROP500"
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">DISCOUNT TYPE</label>
                  <select
                    value={editingDiscount.discount_type || 'percentage'}
                    onChange={(e) => setEditingDiscount({ ...editingDiscount, discount_type: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                  >
                    <option value="percentage">PERCENTAGE (%)</option>
                    <option value="fixed">FLAT CASH (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">VALUE</label>
                  <input
                    type="number"
                    value={editingDiscount.value || 0}
                    onChange={(e) => setEditingDiscount({ ...editingDiscount, value: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">MIN ORDER (₹)</label>
                  <input
                    type="number"
                    value={editingDiscount.min_order_amount || 0}
                    onChange={(e) => setEditingDiscount({ ...editingDiscount, min_order_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">MAX DISCOUNT (₹, Optional)</label>
                  <input
                    type="number"
                    value={editingDiscount.max_discount || ''}
                    onChange={(e) => setEditingDiscount({ ...editingDiscount, max_discount: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="coupon-active-toggle"
                  checked={editingDiscount.is_active}
                  onChange={(e) => setEditingDiscount({ ...editingDiscount, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="coupon-active-toggle" className="text-zinc-300">Coupon is active and redeemable</label>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4 flex justify-end gap-3">
              <button onClick={() => setEditingDiscount(null)} className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white">
                CANCEL
              </button>
              <button
                onClick={async () => {
                  if (!editingDiscount.code.trim()) {
                    toast.error('Coupon code is required.');
                    return;
                  }
                  await act(
                    () => adminFetch('/api/admin/catalog/discounts', key, { method: 'POST', body: JSON.stringify(editingDiscount) }),
                    `Coupon ${editingDiscount.code} saved.`
                  );
                  setEditingDiscount(null);
                }}
                className="bg-white text-black px-6 py-2 font-bold uppercase hover:bg-zinc-200"
              >
                SAVE COUPON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL: COLLECTION EDITOR
      ══════════════════════════════════════════════════════ */}
      {editingCollection && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-xl p-6 space-y-5 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="font-bold text-white uppercase">{editingCollection.title || 'NEW COLLECTION'}</h2>
              <button onClick={() => setEditingCollection(null)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">COLLECTION TITLE</label>
                <input
                  type="text"
                  value={editingCollection.title || ''}
                  onChange={(e) => setEditingCollection({ ...editingCollection, title: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">SLUG (URL IDENTIFIER)</label>
                <input
                  type="text"
                  value={editingCollection.slug || ''}
                  onChange={(e) => setEditingCollection({ ...editingCollection, slug: e.target.value.toLowerCase() })}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">HERO BANNER IMAGE PATH</label>
                <input
                  type="text"
                  value={editingCollection.image || ''}
                  onChange={(e) => setEditingCollection({ ...editingCollection, image: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">DESCRIPTION</label>
                <textarea
                  rows={2}
                  value={editingCollection.desc || ''}
                  onChange={(e) => setEditingCollection({ ...editingCollection, desc: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                />
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4 flex justify-end gap-3">
              <button onClick={() => setEditingCollection(null)} className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white">
                CANCEL
              </button>
              <button
                onClick={async () => {
                  if (!editingCollection.title.trim()) {
                    toast.error('Title is required');
                    return;
                  }
                  await act(
                    () => adminFetch('/api/admin/catalog/collections', key, { method: 'POST', body: JSON.stringify(editingCollection) }),
                    `Collection ${editingCollection.title} saved.`
                  );
                  setEditingCollection(null);
                }}
                className="bg-white text-black px-6 py-2 font-bold uppercase hover:bg-zinc-200"
              >
                SAVE COLLECTION
              </button>
            </div>
          </div>
        </div>
      )}
          {/* ══════════════════════════════════════════════════════
          MODAL: CUSTOMER PROFILE & ORDER HISTORY
      ══════════════════════════════════════════════════════ */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl p-6 space-y-6 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <p className="text-zinc-500 uppercase tracking-widest text-[10px]">CLIENT PROFILE</p>
                <h2 className="text-base font-bold text-white uppercase">{viewingCustomer.name}</h2>
              </div>
              <button onClick={() => setViewingCustomer(null)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase block">CONTACT INFO</span>
                <p className="text-white font-bold">{viewingCustomer.email}</p>
                <p className="text-zinc-400">{viewingCustomer.phone}</p>
                {viewingCustomer.city && viewingCustomer.city !== '—' && (
                  <p className="text-zinc-500 text-[10px] pt-1">{viewingCustomer.city}, {viewingCustomer.state} {viewingCustomer.pincode}</p>
                )}
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase block">MEMBERSHIP & VALUE</span>
                <p className="text-yellow-400 font-bold uppercase">{viewingCustomer.membership_tier || 'GUEST'}</p>
                <p className="text-zinc-400">Total Spent: ₹{(viewingCustomer.total_spent || 0).toLocaleString('en-IN')}</p>
                <p className="text-zinc-500 text-[10px]">Orders count: {viewingCustomer.total_orders || 0}</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">COMPLETE ORDER HISTORY</span>
              <div className="divide-y divide-zinc-800 border border-zinc-800 max-h-60 overflow-y-auto">
                {(viewingCustomer.orders || []).length === 0 && (
                  <p className="p-4 text-center text-zinc-500">No orders recorded yet.</p>
                )}
                {(viewingCustomer.orders || []).map((ord, oIdx) => (
                  <div key={oIdx} className="p-3 flex items-center justify-between hover:bg-zinc-950">
                    <div>
                      <span className="font-bold text-white block">{ord.order_id}</span>
                      <span className="text-[10px] text-zinc-500 block">
                        {ord.date ? new Date(ord.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'} · {ord.items_count || 1} items · {(ord.status || 'placed').toUpperCase()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white block">₹{ord.total}</span>
                      <a
                        href={`/track/${ord.order_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 underline uppercase"
                      >
                        VIEW TRACKING ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-3 flex justify-end">
              <button
                onClick={() => setViewingCustomer(null)}
                className="bg-white text-black px-5 py-2 font-bold uppercase hover:bg-zinc-200"
              >
                CLOSE PROFILE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL: ADD LOOKBOOK & COMMUNITY FIT PHOTO
      ══════════════════════════════════════════════════════ */}
      {addingIrl && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg p-6 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-sm font-bold text-white uppercase">ADD BRAND LOOKBOOK PHOTO</h2>
              <button onClick={() => setAddingIrl(false)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">IMAGE URL OR UPLOAD PATH</label>
                <input
                  type="text"
                  value={newIrlData.image_url}
                  onChange={(e) => setNewIrlData({ ...newIrlData, image_url: e.target.value })}
                  placeholder="/hero/hero-chaos-edit.jpg or photo-1531891437562-4301cf35b7e4"
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">SUBMITTER / MODEL NAME</label>
                  <input
                    type="text"
                    value={newIrlData.name}
                    onChange={(e) => setNewIrlData({ ...newIrlData, name: e.target.value })}
                    placeholder="Kabir M."
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">INSTAGRAM HANDLE</label>
                  <input
                    type="text"
                    value={newIrlData.handle}
                    onChange={(e) => setNewIrlData({ ...newIrlData, handle: e.target.value })}
                    placeholder="@kabir_nlyk"
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">CITY / ATELIER LOCATION</label>
                  <input
                    type="text"
                    value={newIrlData.city}
                    onChange={(e) => setNewIrlData({ ...newIrlData, city: e.target.value })}
                    placeholder="Mumbai / Kolkata / Delhi"
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">STATUS</label>
                  <select
                    value={newIrlData.status || 'approved'}
                    onChange={(e) => setNewIrlData({ ...newIrlData, status: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                  >
                    <option value="approved">LIVE ON HOMEPAGE</option>
                    <option value="pending">PENDING REVIEW</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">EDITORIAL CAPTION</label>
                <textarea
                  rows={2}
                  value={newIrlData.caption}
                  onChange={(e) => setNewIrlData({ ...newIrlData, caption: e.target.value })}
                  placeholder="AW26 stealth hoodie fit. Boxy streetwear silhouette."
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-white"
                />
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-3 flex justify-end gap-3">
              <button onClick={() => setAddingIrl(false)} className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white">
                CANCEL
              </button>
              <button
                onClick={async () => {
                  if (!newIrlData.image_url.trim()) {
                    toast.error('Image URL is required.');
                    return;
                  }
                  await act(
                    async () => {
                      await adminFetch('/api/admin/irl/create', key, {
                        method: 'POST',
                        body: JSON.stringify(newIrlData),
                      });
                      const refreshed = await adminFetch('/api/admin/irl', key);
                      setIrl(refreshed.items || refreshed.irl || []);
                    },
                    'Brand lookbook photo published.'
                  );
                  setAddingIrl(false);
                  setNewIrlData({ name: '', handle: '', city: 'Kolkata', image_url: '', caption: '' });
                }}
                className="bg-white text-black px-6 py-2 font-bold uppercase hover:bg-zinc-200"
              >
                PUBLISH FIT
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
