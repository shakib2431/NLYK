import Marquee from 'react-fast-marquee';
import { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Search, Heart, User, ShoppingBag, Menu, ChevronDown } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { site } from '@/data/storeData';
import { useStore } from '@/context/StoreContext';
import MobileNav from '@/components/MobileNav';
import MegaMenu from '@/components/MegaMenu';

const desktopNav = [
  { label: 'NEW IN', to: '/new-arrivals', megaKey: 'NEW IN' },
  { label: 'COLLECTIONS', to: '/collections', megaKey: 'COLLECTIONS' },
  { label: 'CATEGORIES', to: '/collections', megaKey: 'CATEGORIES' },
  { label: 'MEN', to: '/men', megaKey: 'MEN' },
  { label: 'WOMEN', to: '/women', megaKey: 'WOMEN' },
  { label: 'CLUB', to: '/club' },
  { label: 'CUSTOM', to: '/custom-design' },
];

export default function Header() {
  const { cartCount, wishlist, setCartOpen, setSearchOpen, menuOpen, setMenuOpen } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState(null);
  const leaveTimeoutRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setActiveMegaMenu(null);
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, setMenuOpen, setSearchOpen]);

  const handleMouseEnterNav = (megaKey) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (megaKey) {
      setActiveMegaMenu(megaKey);
    } else {
      setActiveMegaMenu(null);
    }
  };

  const handleMouseLeaveNav = () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      setActiveMegaMenu(null);
    }, 160);
  };

  const handleMenuMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const handleMenuMouseLeave = () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      setActiveMegaMenu(null);
    }, 140);
  };

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
        className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
          scrolled || activeMegaMenu
            ? 'bg-white border-line shadow-[0_2px_10px_rgba(0,0,0,0.04)]'
            : 'bg-white/95 border-transparent'
        }`}
        style={{ backgroundColor: '#FFFFFF' }}
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

            <Link to="/" data-testid="logo-link" className="flex items-center shrink-0" aria-label="NALAYAK Home">
              <img
                src="/NALayak%20Compass%20Gothic%20Logo.png"
                alt="NALAYAK"
                className="h-14 md:h-16 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Redesigned Desktop Nav with Mega Menu Triggers */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7 2xl:gap-8 h-full" aria-label="Primary">
            {desktopNav.map((item) => {
              const isOpen = activeMegaMenu === item.megaKey;
              return (
                <div
                  key={item.label}
                  className="relative h-full flex items-center"
                  onMouseEnter={() => handleMouseEnterNav(item.megaKey)}
                  onMouseLeave={handleMouseLeaveNav}
                >
                  <NavLink
                    to={item.to}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className={({ isActive }) =>
                      `text-[11px] tracking-[0.2em] font-semibold transition-all duration-200 flex items-center gap-1 py-1 ${
                        isOpen || isActive
                          ? 'text-ink border-b-2 border-ink pb-0.5'
                          : 'text-ink/80 hover:text-ink'
                      }`
                    }
                  >
                    <span>{item.label}</span>
                    {item.megaKey && (
                      <ChevronDown
                        size={11}
                        strokeWidth={2}
                        className={`transition-transform duration-200 text-smoke/70 ${
                          isOpen ? 'rotate-180 text-ink' : ''
                        }`}
                      />
                    )}
                  </NavLink>
                </div>
              );
            })}
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

        {/* Visual Mega Menu Dropdown */}
        <MegaMenu
          activeMenu={activeMegaMenu}
          onClose={() => setActiveMegaMenu(null)}
          onMouseEnter={handleMenuMouseEnter}
          onMouseLeave={handleMenuMouseLeave}
        />
      </header>

      {/* Dimmed page backdrop overlay when mega menu is open */}
      {activeMegaMenu && (
        <div
          className="fixed inset-0 top-[56px] md:top-[64px] bg-black/45 backdrop-blur-[2px] z-30 transition-opacity duration-200"
          onClick={() => setActiveMegaMenu(null)}
          aria-hidden="true"
        />
      )}

      <AnimatePresence>
        {menuOpen && <MobileNav onClose={() => setMenuOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
