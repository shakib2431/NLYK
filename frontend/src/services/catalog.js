// ═════════════════════════════════════════════════════════════════════════
// NALAYAK STUDIOS — REACTIVE CATALOG SERVICE LAYER
// Authoritative bridge connecting live API / Supabase catalogue with storefront.
// Zero-flash fallback to storeData.js with real-time dynamic background sync.
// ═════════════════════════════════════════════════════════════════════════

import { products as fallbackProducts, collections as fallbackCollections, listings as defaultListings } from '@/data/storeData';
import { useEffect, useState } from 'react';

const API_BASE = () => process.env.REACT_APP_BACKEND_URL || '';

// In-memory cache
let _cachedProducts = [...fallbackProducts];
let _cachedCollections = [...fallbackCollections];
let _cachedContent = null;
const _subscribers = new Set();

// Try to hydrate from localStorage if available
try {
  const stored = localStorage.getItem('nlyk_live_products');
  if (stored) {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length > 0) {
      _cachedProducts = parsed;
    }
  }
} catch {
  // Ignore storage read error
}

const notifySubscribers = () => {
  _subscribers.forEach((fn) => {
    try {
      fn({ products: _cachedProducts, collections: _cachedCollections, content: _cachedContent });
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

    const [prodRes, colRes, contentRes] = await Promise.allSettled([
      fetch(`${base}/api/catalog/products`),
      fetch(`${base}/api/catalog/collections`),
      fetch(`${base}/api/catalog/content`),
    ]);

    let changed = false;

    if (prodRes.status === 'fulfilled' && prodRes.value.ok) {
      const data = await prodRes.value.json();
      if (Array.isArray(data.products) && data.products.length > 0) {
        _cachedProducts = data.products;
        try {
          localStorage.setItem('nlyk_live_products', JSON.stringify(data.products));
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
    // Non-fatal, stays on cached/fallback data
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

export const getProducts = () => _cachedProducts;

export const getProductBySlug = (slug) =>
  _cachedProducts.find((p) => p.slug === slug || p.id === slug) ||
  fallbackProducts.find((p) => p.slug === slug || p.id === slug) ||
  null;

export const getListingProducts = (key) => {
  const cfg = defaultListings[key];
  if (!cfg) return _cachedProducts;
  return _cachedProducts.filter(cfg.filter);
};

export const getNewArrivals = () => _cachedProducts.filter((p) => p.newArrival);
export const getBestSellers = () => _cachedProducts.filter((p) => p.bestSeller);
export const getFeatured = () => _cachedProducts.filter((p) => p.featured);

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
    .filter(Boolean);
};

export const getRelatedProducts = (product, count = 4) => {
  if (!product) return [];
  return _cachedProducts
    .filter((p) => p.id !== product.id && p.category === product.category)
    .concat(_cachedProducts.filter((p) => p.id !== product.id && p.category !== product.category))
    .slice(0, count);
};

export const searchProducts = (query) => {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  return _cachedProducts.filter(
    (p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.desc || '').toLowerCase().includes(q) ||
      (p.kicker || '').toLowerCase().includes(q) ||
      (p.tags || []).some((t) => String(t).toLowerCase().includes(q))
  );
};

export const sortProducts = (list, sort) => {
  const arr = [...list];
  switch (sort) {
    case 'price-asc': return arr.sort((a, b) => (a.price || 0) - (b.price || 0));
    case 'price-desc': return arr.sort((a, b) => (b.price || 0) - (a.price || 0));
    case 'newest': return arr.sort((a, b) => Number(Boolean(b.newArrival)) - Number(Boolean(a.newArrival)));
    case 'popular': return arr.sort((a, b) => Number(Boolean(b.bestSeller)) - Number(Boolean(a.bestSeller)));
    default: return arr;
  }
};

// ── REACT HOOK FOR REAL-TIME STOREFRONT PAGES ────────────────────────────────

export function useLiveCatalog() {
  const [products, setProducts] = useState(getProducts());
  const [collections, setCollections] = useState(getCollections());

  useEffect(() => {
    const unsub = subscribeCatalog(({ products: newProds, collections: newCols }) => {
      setProducts([...newProds]);
      setCollections([...newCols]);
    });
    refreshCatalog();
    return unsub;
  }, []);

  return { products, collections, refreshCatalog };
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
