// ═════════════════════════════════════════════════════════════════════════
// NALAYAK STUDIOS — REACTIVE CATALOG SERVICE LAYER
// Authoritative bridge connecting live API / Supabase catalogue with storefront.
// Zero-flash fallback to storeData.js with real-time dynamic background sync.
// Strict active-only filtering for products, collections and dynamic categories.
// ═════════════════════════════════════════════════════════════════════════

import { products as fallbackProducts, collections as fallbackCollections, listings as defaultListings } from '@/data/storeData';
import { useEffect, useState } from 'react';

const API_BASE = () => process.env.REACT_APP_BACKEND_URL || '';

export const fallbackCategories = [
  {
    id: 'cat_tees',
    slug: 'tees',
    name: 'TEES',
    title: 'TEES',
    subtitle: '240 GSM COMBED COTTON',
    desc: 'Heavyweight combed cotton oversized tees with drop-shoulder silhouettes.',
    image: '/products/devanagari-chaos-tee-front.jpg',
    to: '/tees',
    display_order: 1,
    is_active: true,
  },
  {
    id: 'cat_shirts',
    slug: 'shirts',
    name: 'SHIRTS',
    title: 'SHIRTS',
    subtitle: 'HEAVYWEIGHT TWILL & RELAXED',
    desc: 'Relaxed-fit heavyweight twill and utility button-downs.',
    image: 'photo-1596755094514-f87e34085b2c',
    to: '/shirts',
    display_order: 2,
    is_active: true,
  },
  {
    id: 'cat_hoodies',
    slug: 'hoodies',
    name: 'HOODIES',
    title: 'HOODIES',
    subtitle: '450 GSM BRUSHED FLEECE',
    desc: 'Ultra-dense 450 GSM box-cut fleece hoodies and crewnecks.',
    image: '/products/after-hours-stealth-hoodie-front.jpg',
    to: '/hoodies',
    display_order: 3,
    is_active: true,
  },
  {
    id: 'cat_bottoms',
    slug: 'bottoms',
    name: 'BOTTOMS',
    title: 'BOTTOMS',
    subtitle: 'WIDE-LEG CARGOS & DENIM',
    desc: 'Tactical wide-leg cargo pants, heavy wash denim and hardware tracks.',
    image: '/female-jeans-chain.png',
    to: '/bottoms',
    display_order: 4,
    is_active: true,
  },
  {
    id: 'cat_accessories',
    slug: 'accessories',
    name: 'ACCESSORIES',
    title: 'ACCESSORIES',
    subtitle: 'HARDWARE, CAPS & BAGS',
    desc: 'Signature sterling-finish chains, distress-embroidered caps and heavy canvas totes.',
    image: '/products/nalayak-chain-front.png',
    to: '/accessories',
    display_order: 5,
    is_active: true,
  },
  {
    id: 'cat_custom_design',
    slug: 'custom-design',
    name: 'CUSTOM DESIGN',
    title: 'CUSTOM DESIGN',
    subtitle: 'BESPOKE 1-OF-1 ATELIER',
    desc: 'Bespoke 1-of-1 editorial atelier pieces handcrafted on demand.',
    image: '/editorial/about-hero-streetwear.jpg',
    to: '/custom-design',
    display_order: 6,
    is_active: true,
  },
];

// In-memory cache
let _deletedCategorySlugs = new Set();
try {
  const storedDeletedCats = localStorage.getItem('nlyk_deleted_categories');
  if (storedDeletedCats) {
    const parsed = JSON.parse(storedDeletedCats);
    if (Array.isArray(parsed)) {
      _deletedCategorySlugs = new Set(parsed.map(s => String(s).toLowerCase()));
    }
  }
} catch {}

export const isCategoryActive = (c) => {
  if (!c) return false;
  const slug = (c.slug || '').toLowerCase();
  const id = (c.id || '').toLowerCase();
  if (_deletedCategorySlugs.has(slug) || _deletedCategorySlugs.has(id)) return false;
  if (c.is_active === false) return false;
  return true;
};

export const markCategoryDeletedLocally = (slugOrId) => {
  if (!slugOrId) return;
  const s = String(slugOrId).toLowerCase();
  _deletedCategorySlugs.add(s);
  try {
    localStorage.setItem('nlyk_deleted_categories', JSON.stringify(Array.from(_deletedCategorySlugs)));
  } catch {}
  _cachedCategories = _cachedCategories.filter((c) => (c.slug || '').toLowerCase() !== s && (c.id || '').toLowerCase() !== s);
  try {
    localStorage.setItem('nlyk_live_categories', JSON.stringify(_cachedCategories.filter(isCategoryActive)));
  } catch {}
  notifySubscribers();
};

export const unmarkCategoryDeletedLocally = (slugOrId) => {
  if (!slugOrId) return;
  const s = String(slugOrId).toLowerCase();
  _deletedCategorySlugs.delete(s);
  try {
    localStorage.setItem('nlyk_deleted_categories', JSON.stringify(Array.from(_deletedCategorySlugs)));
  } catch {}
};

let _archivedSlugs = new Set();
try {
  const storedArchived = localStorage.getItem('nlyk_archived_slugs');
  if (storedArchived) {
    const parsed = JSON.parse(storedArchived);
    if (Array.isArray(parsed)) {
      _archivedSlugs = new Set(parsed);
    }
  }
} catch {
  // Ignore storage read error
}

export const isProductActive = (p) => {
  if (!p) return false;
  if (p.status && p.status !== 'active') return false;
  if (_archivedSlugs.has(p.slug) || _archivedSlugs.has(p.id)) return false;
  return true;
};

export const markProductArchivedLocally = (slugOrId, isArchived = true) => {
  if (!slugOrId) return;
  if (isArchived) {
    _archivedSlugs.add(slugOrId);
    _cachedProducts = _cachedProducts.filter((p) => p.slug !== slugOrId && p.id !== slugOrId);
  } else {
    _archivedSlugs.delete(slugOrId);
  }
  try {
    localStorage.setItem('nlyk_archived_slugs', JSON.stringify(Array.from(_archivedSlugs)));
    localStorage.setItem('nlyk_live_products', JSON.stringify(_cachedProducts.filter(isProductActive)));
  } catch {}
  notifySubscribers();
};

let _cachedProducts = fallbackProducts.filter(isProductActive);
let _cachedCollections = [...fallbackCollections];
let _cachedCategories = fallbackCategories.filter(isCategoryActive);
let _cachedContent = null;
const _subscribers = new Set();

// Try to hydrate from localStorage if available
try {
  const stored = localStorage.getItem('nlyk_live_products');
  if (stored) {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length > 0) {
      _cachedProducts = parsed.filter(isProductActive);
    }
  }
} catch {}

try {
  const storedCats = localStorage.getItem('nlyk_live_categories');
  if (storedCats) {
    const parsed = JSON.parse(storedCats);
    if (Array.isArray(parsed) && parsed.length > 0) {
      _cachedCategories = parsed.filter(isCategoryActive);
    }
  }
} catch {}

const notifySubscribers = () => {
  const activeProds = _cachedProducts.filter(isProductActive);
  _subscribers.forEach((fn) => {
    try {
      fn({
        products: activeProds,
        collections: _cachedCollections,
        categories: _cachedCategories,
        content: _cachedContent,
      });
    } catch (err) {
      console.error('Catalog subscriber error:', err);
    }
  });
};

export const subscribeCatalog = (callback) => {
  _subscribers.add(callback);
  return () => _subscribers.delete(callback);
};

export const refreshCatalog = async () => {
  try {
    const base = API_BASE();
    if (!base && typeof window === 'undefined') return;

    const [prodRes, colRes, catRes, contentRes] = await Promise.allSettled([
      fetch(`${base}/api/catalog/products`),
      fetch(`${base}/api/catalog/collections`),
      fetch(`${base}/api/catalog/categories`),
      fetch(`${base}/api/catalog/content`),
    ]);

    let changed = false;

    if (prodRes.status === 'fulfilled' && prodRes.value.ok) {
      const data = await prodRes.value.json();
      if (Array.isArray(data.products)) {
        data.products.forEach((p) => {
          if (p.status === 'archived') {
            _archivedSlugs.add(p.slug);
            _archivedSlugs.add(p.id);
          }
        });
        const activeOnly = data.products.filter(isProductActive);
        _cachedProducts = activeOnly;
        try {
          localStorage.setItem('nlyk_archived_slugs', JSON.stringify(Array.from(_archivedSlugs)));
          localStorage.setItem('nlyk_live_products', JSON.stringify(activeOnly));
        } catch {}
        changed = true;
      }
    }

    if (colRes.status === 'fulfilled' && colRes.value.ok) {
      const data = await colRes.value.json();
      if (Array.isArray(data.collections) && data.collections.length > 0) {
        _cachedCollections = data.collections;
        changed = true;
      }
    }

    if (catRes.status === 'fulfilled' && catRes.value.ok) {
      const data = await catRes.value.json();
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        const liveList = data.categories.filter(isCategoryActive); _cachedCategories = liveList;
        try {
          localStorage.setItem('nlyk_live_categories', JSON.stringify(liveList));
        } catch {}
        changed = true;
      }
    }

    if (contentRes.status === 'fulfilled' && contentRes.value.ok) {
      const data = await contentRes.value.json();
      if (data.content) {
        _cachedContent = data.content;
        changed = true;
      }
    }

    if (changed) {
      notifySubscribers();
    }
  } catch (err) {
    console.debug('Catalog refresh failed, running on cached storeData:', err);
  }
};

// Initial background sync
if (typeof window !== 'undefined') {
  setTimeout(() => {
    refreshCatalog();
  }, 100);
}

// ── SYNCHRONOUS GETTERS (PRESERVED APIS) ──────────────────────────────────────

export const getProducts = () => _cachedProducts.filter(isProductActive);

export const getProductBySlug = (slug) => {
  if (!slug || _archivedSlugs.has(slug)) return null;
  const live = _cachedProducts.find((p) => (p.slug === slug || p.id === slug) && isProductActive(p));
  if (live) return live;
  const fallback = fallbackProducts.find((p) => (p.slug === slug || p.id === slug) && isProductActive(p));
  if (fallback && !_archivedSlugs.has(fallback.slug) && !_archivedSlugs.has(fallback.id)) {
    return fallback;
  }
  return null;
};

export const getListingProducts = (key) => {
  const cfg = defaultListings[key];
  const activeList = _cachedProducts.filter(isProductActive);
  if (!cfg) return activeList;
  return activeList.filter(cfg.filter);
};

export const getNewArrivals = () => _cachedProducts.filter((p) => isProductActive(p) && p.newArrival);
export const getBestSellers = () => _cachedProducts.filter((p) => isProductActive(p) && p.bestSeller);
export const getFeatured = () => _cachedProducts.filter((p) => isProductActive(p) && p.featured);

export const getCollections = () => _cachedCollections;

export const getCollectionBySlug = (slug) =>
  _cachedCollections.find((c) => c.slug === slug) ||
  fallbackCollections.find((c) => c.slug === slug) ||
  null;

export const getCollectionProducts = (slug) => {
  const col = getCollectionBySlug(slug);
  if (!col) return [];
  const productSlugs = col.products || [];
  return productSlugs
    .map((s) => getProductBySlug(s))
    .filter((p) => isProductActive(p));
};

export const getCategories = () => _cachedCategories;

export const getCategoryBySlug = (slug) =>
  _cachedCategories.find((c) => c.slug === slug) ||
  fallbackCategories.find((c) => c.slug === slug) ||
  null;

export const getRelatedProducts = (product, count = 4) => {
  if (!product) return [];
  const activeList = _cachedProducts.filter(isProductActive);
  return activeList
    .filter((p) => p.id !== product.id && p.category === product.category)
    .concat(activeList.filter((p) => p.id !== product.id && p.category !== product.category))
    .slice(0, count);
};

export const searchProducts = (query) => {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  return _cachedProducts.filter(
    (p) =>
      isProductActive(p) &&
      ((p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.desc || '').toLowerCase().includes(q) ||
        (p.kicker || '').toLowerCase().includes(q) ||
        (p.tags || []).some((t) => String(t).toLowerCase().includes(q)))
  );
};

export const sortProducts = (list, sort) => {
  const arr = [...list];
  switch (sort) {
    case 'price-asc': return arr.sort((a, b) => a.price - b.price);
    case 'price-desc': return arr.sort((a, b) => b.price - a.price);
    case 'newest': return arr.sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0));
    case 'bestseller': return arr.sort((a, b) => (b.bestSeller ? 1 : 0) - (a.bestSeller ? 1 : 0));
    default: return arr;
  }
};

// ── REACT HOOK FOR REAL-TIME STOREFRONT PAGES ────────────────────────────────

export function useLiveCatalog() {
  const [products, setProducts] = useState(() => getProducts());
  const [collections, setCollections] = useState(() => getCollections());
  const [categories, setCategories] = useState(() => getCategories());

  useEffect(() => {
    const unsub = subscribeCatalog(({ products: newProds, collections: newCols, categories: newCats }) => {
      setProducts(newProds.filter(isProductActive));
      setCollections([...newCols]);
      if (Array.isArray(newCats)) setCategories([...newCats]);
    });
    refreshCatalog();
    return unsub;
  }, []);

  return { products, collections, categories, refreshCatalog };
}

// ── COUPON VALIDATION HELPER ────────────────────────────────────────────────

export const validateCouponApi = async (code, subtotal) => {
  try {
    const res = await fetch(`${API_BASE()}/api/discounts/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim().toUpperCase(), subtotal }),
    });
    if (!res.ok) {
      return { valid: false, discount: 0, message: 'Invalid coupon' };
    }
    return await res.json();
  } catch {
    return { valid: false, discount: 0, message: 'Could not validate coupon' };
  }
};
