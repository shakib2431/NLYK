import Marquee from 'react-fast-marquee';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Search, Heart, User, ShoppingBag, Menu } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { site, nav } from '@/data/storeData';
import { useStore } from '@/context/StoreContext';
import MobileNav from '@/components/MobileNav';

export default function Header() {
  const { cartCount, wishlist, setCartOpen, setSearchOpen, menuOpen, setMenuOpen } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, setMenuOpen, setSearchOpen]);

  return (
    <>
     <div
  className="bg-ink text-paper py-2 overflow-hidden"
  data-testid="announcement-bar"
>
  <Marquee speed={35} gradient={false} pauseOnHover>
    {[...Array(4)].map((_, i) => (
      <span
        key={i}
        className="mx-10 text-[10px] md:text-[11px] tracking-[0.25em] font-medium whitespace-nowrap"
      >
        {site.announcement}
      </span>
    ))}
  </Marquee>
</div>

      <header
        className={`sticky top-0 z-40 border-b transition-colors duration-300 ${scrolled ? 'bg-paper border-line' : 'bg-paper/95 border-transparent'}`}
        data-testid="site-header"
      >
        <div className="mx-auto max-w-[1600px] px-4 md:px-8 h-14 md:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              data-testid="mobile-menu-btn"
              className="lg:hidden p-1"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} strokeWidth={1.5} />
            </button>
            <Link to="/" data-testid="logo-link" className="font-display font-extrabold tracking-tight text-xl md:text-2xl">
              NALAYAK
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-7" aria-label="Primary">
            
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={({ isActive }) =>
                  `text-[11px] tracking-[0.2em] font-medium transition-colors duration-300 hover:text-smoke ${isActive ? 'border-b border-ink pb-0.5' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3 md:gap-4">
            <button data-testid="search-open-btn" onClick={() => setSearchOpen(true)} aria-label="Search" className="p-1 hover:text-smoke transition-colors duration-300">
              <Search size={19} strokeWidth={1.5} />
            </button>
            <Link to="/account" data-testid="account-link" aria-label="Account" className="p-1 hidden sm:block hover:text-smoke transition-colors duration-300">
              <User size={19} strokeWidth={1.5} />
            </Link>
            <Link to="/wishlist" data-testid="wishlist-link" aria-label="Wishlist" className="p-1 relative hover:text-smoke transition-colors duration-300">
              <Heart size={19} strokeWidth={1.5} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-ink text-paper text-[9px] h-4 w-4 flex items-center justify-center">{wishlist.length}</span>
              )}
            </Link>
            <button data-testid="cart-open-btn" onClick={() => setCartOpen(true)} aria-label="Open bag" className="p-1 relative hover:text-smoke transition-colors duration-300">
              <ShoppingBag size={19} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-ink text-paper text-[9px] h-4 w-4 flex items-center justify-center" data-testid="cart-count-badge">{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && <MobileNav onClose={() => setMenuOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
