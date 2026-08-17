import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/context/StoreContext';
import { searchProducts } from '@/services/catalog';
import { formatINR } from '@/data/storeData';
import SafeImg from '@/components/SafeImg';

const SUGGESTIONS = ['HOODIE', 'OVERSIZED TEE', 'CARGO', 'CHAOS', 'CAP'];

export default function SearchOverlay() {
  const { setSearchOpen, recentSearches, addRecentSearch } = useStore();
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setQ('');
    setTimeout(() => inputRef.current?.focus(), 350);
  }, []);

  const results = useMemo(() => searchProducts(q).slice(0, 6), [q]);

  const go = () => q.trim() && addRecentSearch(q.trim());

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-paper flex flex-col"
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      data-testid="search-overlay"
    >
      <div className="border-b border-line">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 h-16 md:h-20 flex items-center gap-4">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            placeholder="SEARCH THE WRONG STUFF"
            data-testid="search-input"
            className="flex-1 bg-transparent font-display font-extrabold uppercase tracking-tight text-2xl md:text-4xl placeholder:text-smoke/50 focus:outline-none"
          />
          <button data-testid="search-close-btn" onClick={() => setSearchOpen(false)} aria-label="Close search" className="p-1 hover:text-smoke transition-colors">
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-10">
          {q.trim() === '' ? (
            <div className="grid md:grid-cols-2 gap-10">
              <div>
                <p className="text-[11px] tracking-[0.25em] text-smoke mb-4">POPULAR RIGHT NOW</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      data-testid={`search-suggestion-${s.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setQ(s)}
                      className="border border-ink px-4 py-2 text-[11px] tracking-[0.2em] hover:bg-ink hover:text-paper transition-colors duration-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {recentSearches.length > 0 && (
                <div>
                  <p className="text-[11px] tracking-[0.25em] text-smoke mb-4">RECENT SEARCHES</p>
                  <div className="flex flex-col gap-2">
                    {recentSearches.map((s) => (
                      <button key={s} data-testid={`recent-search-${s}`} onClick={() => setQ(s)} className="text-left text-sm hover:text-smoke transition-colors flex items-center gap-2">
                        {s} <ArrowUpRight size={12} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : results.length > 0 ? (
            <div>
              <p className="text-[11px] tracking-[0.25em] text-smoke mb-6">{results.length} RESULT{results.length > 1 ? 'S' : ''} FOR “{q.toUpperCase()}”</p>
              <div className="divide-y divide-line border-y border-line">
                {results.map((p) => (
                  <Link
                    key={p.slug}
                    to={`/product/${p.slug}`}
                    onClick={go}
                    data-testid={`search-result-${p.slug}`}
                    className="flex items-center gap-4 py-3 group"
                  >
                    <div className="h-16 w-12 bg-white border border-line overflow-hidden shrink-0">
                      <SafeImg id={p.images[0]} w={200} alt={p.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium group-hover:text-smoke transition-colors">{p.name}</p>
                      <p className="text-[11px] tracking-[0.15em] text-smoke uppercase">{p.category}</p>
                    </div>
                    <span className="text-sm font-semibold">{formatINR(p.price)}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16" data-testid="search-empty">
              <p className="font-display font-extrabold uppercase tracking-tight text-3xl md:text-5xl">NOTHING. IMPRESSIVE.</p>
              <p className="mt-3 text-smoke text-sm">Even we don’t make “{q}”. Try “tee”, “hoodie” or “chaos”.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
