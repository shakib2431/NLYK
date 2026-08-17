import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ProductCard from '@/components/ProductCard';
import { Reveal } from '@/components/Reveal';
import { getListingProducts, sortProducts } from '@/services/catalog';
import { listings } from '@/data/storeData';
import { useSeo } from '@/hooks/useSeo';

const PAGE_SIZE = 8;
const SORTS = [
  { v: 'featured', label: 'FEATURED' },
  { v: 'newest', label: 'NEWEST' },
  { v: 'popular', label: 'MOST WANTED' },
  { v: 'price-asc', label: 'PRICE: LOW TO HIGH' },
  { v: 'price-desc', label: 'PRICE: HIGH TO LOW' },
];
const PRICE_RANGES = [
  { label: 'UNDER ₹1,000', test: (p) => p.price < 1000 },
  { label: '₹1,000 — ₹2,000', test: (p) => p.price >= 1000 && p.price <= 2000 },
  { label: 'ABOVE ₹2,000', test: (p) => p.price > 2000 },
];
const CATEGORIES = ['tees', 'shirts', 'hoodies', 'bottoms', 'accessories'];
const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'OS'];

function FilterGroup({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-line py-5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-[11px] tracking-[0.25em] font-medium"
        data-testid={`filter-toggle-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {title}
        <ChevronDown size={14} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pt-4 space-y-2">{children}</div>}
    </div>
  );
}

function Check({ label, checked, onChange, testId }) {
  return (
    <label className="flex items-center gap-3 text-sm cursor-pointer group" data-testid={testId}>
      <span className={`h-4 w-4 border border-ink flex items-center justify-center transition-colors ${checked ? 'bg-ink' : 'group-hover:bg-line'}`}>
        {checked && <span className="h-1.5 w-1.5 bg-paper" />}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className={checked ? 'font-medium' : 'text-ink/70'}>{label}</span>
    </label>
  );
}

export default function ListingPage({ listingKey }) {
  const cfg = listings[listingKey];
  useSeo(cfg.title, cfg.desc);

  const [sort, setSort] = useState('featured');
  const [cats, setCats] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [prices, setPrices] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setCats([]); setSizes([]); setPrices([]); setInStockOnly(false);
    setVisible(PAGE_SIZE); setSort('featured');
  }, [listingKey]);

  const base = useMemo(() => getListingProducts(listingKey), [listingKey]);

  const filtered = useMemo(() => {
    let list = base;
    if (cats.length) list = list.filter((p) => cats.includes(p.category));
    if (sizes.length) list = list.filter((p) => p.sizes.some((s) => sizes.includes(s)));
    if (prices.length) list = list.filter((p) => prices.some((i) => PRICE_RANGES[i].test(p)));
    if (inStockOnly) list = list.filter((p) => p.stock > 0);
    return sortProducts(list, sort);
  }, [base, cats, sizes, prices, inStockOnly, sort]);

  const toggle = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

  const filters = (
    <div>
      <FilterGroup title="CATEGORY">
        {CATEGORIES.map((c) => (
          <Check key={c} label={c.toUpperCase()} checked={cats.includes(c)} onChange={() => toggle(cats, setCats, c)} testId={`filter-cat-${c}`} />
        ))}
      </FilterGroup>
      <FilterGroup title="SIZE">
        <div className="flex flex-wrap gap-2">
          {ALL_SIZES.map((s) => (
            <button
              key={s}
              data-testid={`filter-size-${s.toLowerCase().replace(' ', '-')}`}
              onClick={() => toggle(sizes, setSizes, s)}
              className={`border px-3 py-1.5 text-[11px] tracking-wide transition-colors duration-200 ${sizes.includes(s) ? 'bg-ink text-paper border-ink' : 'border-line hover:border-ink'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="PRICE">
        {PRICE_RANGES.map((r, i) => (
          <Check key={r.label} label={r.label} checked={prices.includes(i)} onChange={() => toggle(prices, setPrices, i)} testId={`filter-price-${i}`} />
        ))}
      </FilterGroup>
      <FilterGroup title="AVAILABILITY">
        <Check label="IN STOCK ONLY" checked={inStockOnly} onChange={() => setInStockOnly(!inStockOnly)} testId="filter-instock" />
      </FilterGroup>
    </div>
  );

  return (
    <main className="px-4 md:px-8 max-w-[1600px] mx-auto py-10 md:py-16" data-testid={`listing-${listingKey}`}>
      <nav className="text-[10px] tracking-[0.25em] text-smoke mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-ink transition-colors" data-testid="breadcrumb-home">HOME</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{cfg.title}</span>
      </nav>

      <Reveal y={16}>
        <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">{cfg.kicker}</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-5xl md:text-7xl">{cfg.title}</h1>
          <p className="text-smoke text-sm max-w-sm">{cfg.desc}</p>
        </div>
      </Reveal>

      <div className="mt-10 flex items-center justify-between border-y border-line py-3">
        <div className="flex items-center gap-4">
          <button
            data-testid="filter-drawer-btn"
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden flex items-center gap-2 text-[11px] tracking-[0.2em] font-medium"
          >
            <SlidersHorizontal size={14} /> FILTERS
          </button>
          <span className="text-[11px] tracking-[0.2em] text-smoke" data-testid="product-count">
            {filtered.length} PRODUCT{filtered.length !== 1 ? 'S' : ''}
          </span>
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          data-testid="sort-select"
          className="bg-transparent text-[11px] tracking-[0.2em] font-medium focus:outline-none cursor-pointer"
        >
          {SORTS.map((s) => (
            <option key={s.v} value={s.v}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-10 mt-8">
        <aside className="hidden lg:block">{filters}</aside>

        <div>
          {filtered.length === 0 ? (
            <div className="py-24 text-center" data-testid="listing-empty">
              <p className="font-display font-extrabold uppercase tracking-tight text-3xl">NOTHING MATCHES.</p>
              <p className="mt-3 text-smoke text-sm">Loosen the filters. Your standards, not ours.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-4 md:grid-cols-3 gap-4 md:gap-5">
              {filtered.slice(0, visible).map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 7) * 0.05}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          )}
          {visible < filtered.length && (
            <div className="mt-14 text-center">
              <button
                data-testid="load-more-btn"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="border border-ink px-10 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink hover:text-paper transition-colors duration-300"
              >
                LOAD MORE ({filtered.length - visible} LEFT)
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" data-testid="filter-drawer">
            <motion.div className="absolute inset-0 bg-ink/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} />
            <motion.aside
              className="absolute left-0 top-0 h-full w-[85%] max-w-sm bg-paper flex flex-col"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center justify-between px-5 h-16 border-b border-line">
                <span className="font-display font-extrabold uppercase text-xl">FILTERS</span>
                <button data-testid="filter-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close filters">
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5">{filters}</div>
              <div className="border-t border-ink p-5">
                <button
                  data-testid="filter-apply-btn"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full bg-ink text-paper py-4 text-[11px] tracking-[0.3em] font-medium"
                >
                  SHOW {filtered.length} PRODUCTS
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
