import { Link } from 'react-router-dom';
import { X, UserRound, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { nav } from '@/data/storeData';

export default function MobileNav({ onClose }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-ink text-paper flex flex-col"
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      data-testid="mobile-nav"
    >
      {/* Top header */}
      <div className="h-14 px-4 border-b border-paper/15 flex items-center justify-between">
        <span className="font-display font-extrabold tracking-tight text-sm">
          NALAYAK
        </span>

        <button
          data-testid="mobile-menu-close"
          onClick={onClose}
          aria-label="Close menu"
          className="p-2 -mr-2"
        >
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* Account row */}
      <div className="h-14 px-4 border-b border-paper/15 flex items-center">
        <Link
          to="/account"
          onClick={onClose}
          data-testid="mobile-nav-account"
          className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide"
        >
          <UserRound size={16} strokeWidth={1.5} />
          <span>Login / Account</span>
        </Link>
      </div>

      {/* Main menu */}
      <nav
        className="flex-1 overflow-y-auto"
        aria-label="Mobile"
      >
        {nav.map((item, i) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: 0.05 + i * 0.035,
              duration: 0.35
            }}
          >
            <Link
              to={item.to}
              onClick={onClose}
              data-testid={`mobile-nav-${item.label
                .toLowerCase()
                .replace(/\s+/g, '-')}`}
              className="min-h-[54px] px-4 border-b border-paper/15 flex items-center justify-between uppercase text-[13px] font-semibold tracking-[0.06em] hover:bg-paper/5 transition-colors"
            >
              <span>{item.label}</span>

              <ChevronRight
                size={17}
                strokeWidth={1.5}
                className="opacity-60"
              />
            </Link>
          </motion.div>
        ))}
      </nav>

      {/* Bottom links */}
      <div className="border-t border-paper/15 px-4">
        <Link
          to="/wishlist"
          onClick={onClose}
          data-testid="mobile-nav-wishlist"
          className="h-12 flex items-center text-[11px] uppercase tracking-[0.12em] border-b border-paper/15"
        >
          Wishlist
        </Link>

        <Link
          to="/about"
          onClick={onClose}
          data-testid="mobile-nav-about"
          className="h-12 flex items-center text-[11px] uppercase tracking-[0.12em]"
        >
          About Nalayak
        </Link>
      </div>
    </motion.div>
  );
}