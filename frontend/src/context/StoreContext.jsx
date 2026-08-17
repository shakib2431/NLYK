import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getProductBySlug } from '@/services/catalog';
import { createFreeMembership, createFoundingMembership, startClubSubscription } from '@/services/membership';
import { sendWelcomeEmail, registerDropAlert } from '@/services/email';

const StoreContext = createContext(null);

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export function StoreProvider({ children }) {
  const [cart, setCart] = useState(() => load('nalayak_cart', []));
  const [wishlist, setWishlist] = useState(() => load('nalayak_wishlist', []));
  const [recentSearches, setRecentSearches] = useState(() => load('nalayak_recent_searches', []));
  const [recentlyViewed, setRecentlyViewed] = useState(() => load('nalayak_recently_viewed', []));
  const [member, setMember] = useState(() => load('nalayak_member', null));
  const [dropAlerts, setDropAlerts] = useState(() => load('nalayak_drop_alerts', []));
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => localStorage.setItem('nalayak_cart', JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem('nalayak_wishlist', JSON.stringify(wishlist)), [wishlist]);
  useEffect(() => localStorage.setItem('nalayak_recent_searches', JSON.stringify(recentSearches)), [recentSearches]);
  useEffect(() => localStorage.setItem('nalayak_recently_viewed', JSON.stringify(recentlyViewed)), [recentlyViewed]);
  useEffect(() => {
    if (member) localStorage.setItem('nalayak_member', JSON.stringify(member));
  }, [member]);
  useEffect(() => localStorage.setItem('nalayak_drop_alerts', JSON.stringify(dropAlerts)), [dropAlerts]);

  const addToCart = (product, size, color, qty = 1) => {
    const key = `${product.slug}-${size}-${color.name}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i));
      }
      return [
        ...prev,
        {
          key, slug: product.slug, name: product.name, price: product.price,
          image: product.images[0], size, color: color.name, qty,
        },
      ];
    });
    setCartOpen(true);
  };

  const updateQty = (key, delta) =>
    setCart((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    );

  const removeFromCart = (key) => setCart((prev) => prev.filter((i) => i.key !== key));

  const clearCart = () => setCart([]);

  const toggleWishlist = (slug) =>
    setWishlist((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );

  const addRecentSearch = (q) =>
    setRecentSearches((prev) => [q, ...prev.filter((s) => s !== q)].slice(0, 6));

  const addRecentlyViewed = (slug) =>
    setRecentlyViewed((prev) => [slug, ...prev.filter((s) => s !== slug)].slice(0, 8));

  const joinMember = () => {
    if (!member) sendWelcomeEmail('member');
    setMember((prev) => prev || createFreeMembership());
  };

  const joinFounding = () => {
    if (!member?.isFoundingMember) sendWelcomeEmail('club');
    setMember((prev) => (prev?.isFoundingMember ? prev : createFoundingMembership()));
  };

  const activateClub = () => {
    sendWelcomeEmail('club');
    setMember((prev) => startClubSubscription(prev));
  };

  const toggleDropAlert = (slug) => {
    if (!dropAlerts.includes(slug)) registerDropAlert(slug);
    setDropAlerts((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const cartCount = useMemo(() => cart.reduce((sum, i) => sum + i.qty, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.qty, 0), [cart]);
  const wishlistProducts = useMemo(
    () => wishlist.map(getProductBySlug).filter(Boolean),
    [wishlist]
  );
  const recentlyViewedProducts = useMemo(
    () => recentlyViewed.map(getProductBySlug).filter(Boolean),
    [recentlyViewed]
  );

  const value = {
    cart, cartCount, cartSubtotal, addToCart, updateQty, removeFromCart, clearCart,
    wishlist, wishlistProducts, toggleWishlist,
    recentSearches, addRecentSearch, recentlyViewedProducts, addRecentlyViewed,
    cartOpen, setCartOpen, searchOpen, setSearchOpen, menuOpen, setMenuOpen,
    member, joinMember, joinFounding, activateClub, dropAlerts, toggleDropAlert,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
