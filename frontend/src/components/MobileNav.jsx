import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { nav } from '@/data/storeData';

export default function MobileNav({ onClose }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-ink text-paper flex flex-col"
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      data-testid="mobile-nav"
    >
      <div className="flex items-center justify-between px-4 h-14 border-b border-paper/20">
        <span className="font-display font-extrabold tracking-tight text-xl">NALAYAK</span>
        <button data-testid="mobile-menu-close" onClick={onClose} aria-label="Close menu" className="p-1">
          <X size={22} strokeWidth={1.5} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-6 py-10 flex flex-col gap-2" aria-label="Mobile">
        {nav.map((item, i) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05, duration: 0.5 }}
          >
            <Link
              to={item.to}
              onClick={onClose}
              data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className="font-display font-extrabold uppercase tracking-tight text-4xl leading-[1.15] hover:text-smoke transition-colors duration-300"
            >
              {item.label}
            </Link>
          </motion.div>
        ))}
      </nav>
      <div className="px-6 py-6 border-t border-paper/20 flex gap-6 text-[11px] tracking-[0.2em]">
        <Link to="/account" onClick={onClose} data-testid="mobile-nav-account">ACCOUNT</Link>
        <Link to="/wishlist" onClick={onClose} data-testid="mobile-nav-wishlist">WISHLIST</Link>
        <Link to="/about" onClick={onClose} data-testid="mobile-nav-about">ABOUT</Link>
      </div>
    </motion.div>
  );
}
