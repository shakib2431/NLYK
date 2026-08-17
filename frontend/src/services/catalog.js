// Catalog service layer — reads local mock data today, Supabase tomorrow.
import { products, collections, listings } from '@/data/storeData';

export const getProducts = () => products;

export const getProductBySlug = (slug) =>
  products.find((p) => p.slug === slug) || null;

export const getListingProducts = (key) => {
  const cfg = listings[key];
  return cfg ? products.filter(cfg.filter) : products;
};

export const getNewArrivals = () => products.filter((p) => p.newArrival);
export const getBestSellers = () => products.filter((p) => p.bestSeller);
export const getFeatured = () => products.filter((p) => p.featured);

export const getCollections = () => collections;

export const getCollectionBySlug = (slug) =>
  collections.find((c) => c.slug === slug) || null;

export const getCollectionProducts = (slug) => {
  const col = getCollectionBySlug(slug);
  if (!col) return [];
  return col.products
    .map((s) => products.find((p) => p.slug === s))
    .filter(Boolean);
};

export const getRelatedProducts = (product, count = 4) =>
  products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .concat(products.filter((p) => p.id !== product.id && p.category !== product.category))
    .slice(0, count);

export const searchProducts = (query) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.includes(q) ||
      p.desc.toLowerCase().includes(q)
  );
};

export const sortProducts = (list, sort) => {
  const arr = [...list];
  switch (sort) {
    case 'price-asc': return arr.sort((a, b) => a.price - b.price);
    case 'price-desc': return arr.sort((a, b) => b.price - a.price);
    case 'newest': return arr.sort((a, b) => Number(b.newArrival) - Number(a.newArrival));
    case 'popular': return arr.sort((a, b) => Number(b.bestSeller) - Number(a.bestSeller));
    default: return arr;
  }
};
