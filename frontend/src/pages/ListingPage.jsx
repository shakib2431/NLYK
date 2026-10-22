import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import SafeImg from '@/components/SafeImg';
import ProductCard from '@/components/ProductCard';
import { Reveal } from '@/components/Reveal';
import AdvanceFilterDrawer from '@/components/AdvanceFilterDrawer';
import { getListingProducts, sortProducts } from '@/services/catalog';
import { listings, formatINR } from '@/data/storeData';
import { useSeo } from '@/hooks/useSeo';

const PAGE_SIZE = 12;

const SORTS = [
  { v: 'featured', label: 'Best selling' },
  { v: 'newest', label: 'Newest' },
  { v: 'popular', label: 'Most wanted' },
  { v: 'price-asc', label: 'Price: Low to High' },
  { v: 'price-desc', label: 'Price: High to Low' },
];

const PRICE_RANGES = [
  { label: 'UNDER ₹1,000', test: (p) => p.price < 1000 },
  { label: '₹1,000 — ₹2,000', test: (p) => p.price >= 1000 && p.price <= 2000 },
  { label: 'ABOVE ₹2,000', test: (p) => p.price > 2000 },
];

const CATEGORIES = ['tees', 'shirts', 'hoodies', 'bottoms', 'accessories'];
const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'OS', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'];

// Direct solid colors only (no color hues or shade clusters)
const ALL_COLORS = [
  { name: 'Jet', hex: '#111111', label: 'Jet Black' },
  { name: 'Chalk', hex: '#F4F1EA', label: 'Chalk White' },
  { name: 'Ash', hex: '#8C8C8C', label: 'Ash Grey' },
  { name: 'Olive', hex: '#4A5340', label: 'Olive' },
  { name: 'Maroon', hex: '#5C2E2E', label: 'Maroon' },
];

const CATEGORY_TABS = [
  { id: 'ALL', label: 'View all' },
  { id: 'tees', label: 'T-shirts' },
  { id: 'shirts', label: 'Shirts' },
  { id: 'hoodies', label: 'Hoodies' },
  { id: 'bottoms', label: 'Pants & Cargos' },
  { id: 'accessories', label: 'Accessories' },
];

export default function ListingPage({ listingKey }) {
  const cfg = listings[listingKey];
  useSeo(cfg?.title || 'Collection', cfg?.desc);

  const [sort, setSort] = useState('featured');
  const [cats, setCats] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [prices, setPrices] = useState([]);
  const [availability, setAvailability] = useState('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [denseView, setDenseView] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState('ALL');

  useEffect(() => {
    setCats([]);
    setSizes([]);
    setColors([]);
    setPrices([]);
    setAvailability('all');
    setVisible(PAGE_SIZE);
    setSort('featured');
    setActiveCategoryTab('ALL');
  }, [listingKey]);

  const base = useMemo(() => getListingProducts(listingKey), [listingKey]);

  const filtered = useMemo(() => {
    let list = base;
    if (cats.length) list = list.filter((p) => cats.includes(p.category));
    if (sizes.length) list = list.filter((p) => p.sizes && p.sizes.some((s) => sizes.includes(s)));
    if (colors.length) list = list.filter((p) => p.colors && p.colors.some((c) => colors.includes(c.name)));
    if (prices.length) list = list.filter((p) => prices.some((i) => PRICE_RANGES[i]?.test(p)));
    if (availability === 'inStock') list = list.filter((p) => p.stock > 0);
    if (availability === 'outOfStock') list = list.filter((p) => p.stock === 0);
    return sortProducts(list, sort);
  }, [base, cats, sizes, colors, prices, availability, sort]);

  // Dense View Items with Category Break Markers (like BLUORNG)
  const denseItems = useMemo(() => {
    if (!denseView) return [];

    if (activeCategoryTab !== 'ALL') {
      return filtered
        .filter((p) => p.category.toLowerCase() === activeCategoryTab.toLowerCase())
        .map((p) => ({ type: 'product', data: p }));
    }

    const result = [];
    const categoryOrder = ['tees', 'shirts', 'hoodies', 'bottoms', 'accessories'];

    categoryOrder.forEach((cat) => {
      const catProducts = filtered.filter((p) => p.category.toLowerCase() === cat);
      if (catProducts.length > 0) {
        result.push({
          type: 'marker',
          title: cat.toUpperCase(),
          id: `marker-${cat}`,
        });
        catProducts.forEach((p) => {
          result.push({ type: 'product', data: p });
        });
      }
    });

    const remaining = filtered.filter((p) => !categoryOrder.includes(p.category.toLowerCase()));
    if (remaining.length > 0) {
      result.push({ type: 'marker', title: 'MORE', id: 'marker-more' });
      remaining.forEach((p) => result.push({ type: 'product', data: p }));
    }

    return result;
  }, [denseView, activeCategoryTab, filtered]);

  const toggle = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

  const handleResetAll = () => {
    setCats([]);
    setSizes([]);
    setColors([]);
    setPrices([]);
    setAvailability('all');
    setActiveCategoryTab('ALL');
  };

  const activeFiltersCount =
    cats.length +
    sizes.length +
    colors.length +
    prices.length +
    (availability !== 'all' ? 1 : 0);

  return (
    <main className="px-4 md:px-8 max-w-[1600px] mx-auto py-10 md:py-16" data-testid={`listing-${listingKey}`}>
      {/* Breadcrumb */}
      <nav className="text-[10px] tracking-[0.25em] text-smoke mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-ink transition-colors" data-testid="breadcrumb-home">
          HOME
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink uppercase">{cfg?.title}</span>
      </nav>

      {/* Header Banner */}
      <Reveal y={16}>
        <p className="text-[11px] tracking-[0.3em] text-smoke mb-2 uppercase">{cfg?.kicker}</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-5xl md:text-7xl">
            {cfg?.title}
          </h1>
          <p className="text-smoke text-sm max-w-sm">{cfg?.desc}</p>
        </div>
      </Reveal>

      {/* Control Bar */}
      <div className="mt-10 flex items-center justify-between border-y border-line py-3.5">
        <div className="flex items-center gap-3">
          <span className="text-xs tracking-[0.2em] font-bold uppercase text-ink">
            {cfg?.title}
          </span>
          <span className="text-[11px] tracking-[0.15em] font-mono text-smoke" data-testid="product-count">
            ({filtered.length} {filtered.length === 1 ? 'PIECE' : 'PIECES'})
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetAll}
              className="text-[10px] tracking-[0.15em] font-mono text-smoke hover:text-ink underline uppercase hidden sm:inline-block cursor-pointer mr-1"
            >
              CLEAR ALL ({activeFiltersCount})
            </button>
          )}

          {/* Compass Star "Show Everything" Dense View Toggle */}
          <button
            type="button"
            data-testid="toggle-dense-view-btn"
            onClick={() => setDenseView(!denseView)}
            title={denseView ? 'Switch to Editorial View' : 'Show Everything · Dense Atelier View'}
            className={`relative flex items-center justify-center h-9 w-9 rounded-full border transition-all duration-300 cursor-pointer ${
              denseView
                ? 'bg-ink text-paper border-ink shadow-md scale-105'
                : 'bg-white text-ink border-neutral-300 hover:border-ink hover:bg-neutral-50 shadow-sm'
            }`}
            aria-pressed={denseView}
            aria-label="Toggle Show Everything Dense View"
          >
            {/* NALAYAK Compass Star Logo */}
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill={denseView ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.8"
              className={denseView ? 'animate-pulse' : ''}
            >
              <path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z" />
            </svg>
            {denseView && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          {/* Advance Filters Button */}
          <button
            data-testid="filter-drawer-btn"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase border border-neutral-300 bg-white hover:border-ink hover:bg-neutral-50 px-4 py-2 rounded-full shadow-sm transition-all cursor-pointer"
          >
            <SlidersHorizontal size={13} strokeWidth={2} />
            <span>Advance Filters</span>
            {activeFiltersCount > 0 && (
              <span className="h-4 w-4 rounded-full bg-ink text-paper text-[9px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Horizontal Category Quick Tabs (Revealed in Dense View or Quick Filter) */}
      {denseView && (
        <div className="mt-5 flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeCategoryTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategoryTab(tab.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-ink text-paper shadow-sm'
                    : 'bg-neutral-100 text-ink/80 hover:bg-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* DENSE ATELIER VIEW (Show Everything Multi-Column Grid) */}
      {denseView ? (
        <div className="mt-6">
          {denseItems.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-display font-extrabold uppercase tracking-tight text-3xl">NOTHING MATCHES.</p>
              <button
                onClick={handleResetAll}
                className="mt-6 inline-block border border-ink px-8 py-3 text-xs tracking-widest font-semibold uppercase hover:bg-ink hover:text-paper transition-colors rounded-full cursor-pointer"
              >
                RESET ALL FILTERS
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2.5 sm:gap-3">
              {denseItems.map((item) => {
                if (item.type === 'marker') {
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-center p-2.5 aspect-[3/4] rounded-xl bg-neutral-100/70 border border-dashed border-neutral-300 select-none"
                    >
                      <span className="font-display font-extrabold uppercase text-[11px] sm:text-xs tracking-widest text-ink/75 text-center leading-tight">
                        {item.title}
                      </span>
                    </div>
                  );
                }

                const p = item.data;
                return (
                  <Link
                    key={p.id}
                    to={`/product/${p.slug}`}
                    className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-neutral-100 border border-line/60 shadow-sm hover:shadow-md transition-all duration-300 block"
                    title={`${p.name} — ${formatINR(p.price)}`}
                  >
                    <SafeImg
                      id={p.images[0]}
                      w={400}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2 text-paper">
                      <p className="text-[10px] font-bold uppercase tracking-tight truncate leading-tight">
                        {p.name}
                      </p>
                      <p className="text-[9px] font-mono text-paper/85 mt-0.5">
                        {formatINR(p.price)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* STANDARD EDITORIAL GRID VIEW */
        <div className="mt-8">
          {filtered.length === 0 ? (
            <div className="py-24 text-center" data-testid="listing-empty">
              <p className="font-display font-extrabold uppercase tracking-tight text-3xl">
                NOTHING MATCHES.
              </p>
              <p className="mt-3 text-smoke text-sm">
                Loosen the filters. Your standards, not ours.
              </p>
              <button
                onClick={handleResetAll}
                className="mt-6 inline-block border border-ink px-8 py-3 text-xs tracking-widest font-semibold uppercase hover:bg-ink hover:text-paper transition-colors rounded-full cursor-pointer"
              >
                RESET ALL FILTERS
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filtered.slice(0, visible).map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 7) * 0.04}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {visible < filtered.length && (
            <div className="mt-14 text-center">
              <button
                data-testid="load-more-btn"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="border border-ink px-10 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink hover:text-paper transition-colors duration-300 rounded-full cursor-pointer"
              >
                LOAD MORE ({filtered.length - visible} LEFT)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Advance Filter Drawer */}
      <AdvanceFilterDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        totalProducts={base.length}
        filteredCount={filtered.length}
        selectedSizes={sizes}
        onToggleSize={(s) => toggle(sizes, setSizes, s)}
        allSizes={ALL_SIZES}
        selectedCategories={cats}
        onToggleCategory={(c) => toggle(cats, setCats, c)}
        allCategories={CATEGORIES}
        selectedColors={colors}
        onToggleColor={(c) => toggle(colors, setColors, c)}
        allColors={ALL_COLORS}
        availability={availability}
        onChangeAvailability={setAvailability}
        selectedPrices={prices}
        onTogglePrice={(i) => toggle(prices, setPrices, i)}
        priceRanges={PRICE_RANGES}
        sort={sort}
        onChangeSort={setSort}
        sortOptions={SORTS}
        onResetAll={handleResetAll}
      />
    </main>
  );
}
