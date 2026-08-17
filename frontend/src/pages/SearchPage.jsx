import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '@/components/ProductCard';
import { Reveal } from '@/components/Reveal';
import { searchProducts } from '@/services/catalog';
import { useStore } from '@/context/StoreContext';
import { useSeo } from '@/hooks/useSeo';

export default function SearchPage() {
  useSeo('Search', 'Search Nalayak.');
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const { recentSearches, addRecentSearch, setSearchOpen } = useStore();

  useEffect(() => {
    setSearchOpen(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => searchProducts(q), [q]);

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) {
      addRecentSearch(q.trim());
      setParams({ q: q.trim() });
    }
  };

  return (
    <main className="px-4 md:px-8 max-w-[1600px] mx-auto py-10 md:py-16" data-testid="search-page">
      <Reveal y={16}>
        <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-5xl md:text-7xl">SEARCH</h1>
      </Reveal>
      <form onSubmit={submit} className="mt-10 border-b border-ink" data-testid="search-page-form">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="TYPE SOMETHING QUESTIONABLE"
          data-testid="search-page-input"
          className="w-full bg-transparent font-display font-extrabold uppercase tracking-tight text-2xl md:text-4xl py-4 placeholder:text-smoke/50 focus:outline-none"
        />
      </form>
      {recentSearches.length > 0 && q.trim() === '' && (
        <div className="mt-8 flex flex-wrap gap-2">
          {recentSearches.map((s) => (
            <button key={s} data-testid={`search-page-recent-${s}`} onClick={() => setQ(s)} className="border border-line px-4 py-2 text-[11px] tracking-[0.2em] hover:border-ink transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}
      {q.trim() !== '' && (
        <p className="mt-10 text-[11px] tracking-[0.25em] text-smoke" data-testid="search-page-count">
          {results.length} RESULT{results.length !== 1 ? 'S' : ''} FOR “{q.toUpperCase()}”
        </p>
      )}
      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {results.map((p, i) => (
          <Reveal key={p.id} delay={Math.min(i, 7) * 0.05}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>
      {q.trim() !== '' && results.length === 0 && (
        <div className="py-24 text-center" data-testid="search-page-empty">
          <p className="font-display font-extrabold uppercase tracking-tight text-3xl">NOTHING. IMPRESSIVE.</p>
          <p className="mt-3 text-smoke text-sm">Try “tee”, “hoodie”, or “chaos”.</p>
        </div>
      )}
    </main>
  );
}
