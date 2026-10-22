import { useEffect } from 'react';
import { X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdvanceFilterDrawer({
  isOpen,
  onClose,
  totalProducts = 0,
  filteredCount = 0,
  selectedSizes = [],
  onToggleSize,
  allSizes = ['XS', 'S', 'M', 'L', 'XL', 'OS'],
  selectedCategories = [],
  onToggleCategory,
  allCategories = ['tees', 'shirts', 'hoodies', 'bottoms', 'accessories'],
  selectedColors = [],
  onToggleColor,
  allColors = [
    { name: 'Jet', hex: '#111111', label: 'Jet Black' },
    { name: 'Chalk', hex: '#F4F1EA', label: 'Chalk White' },
    { name: 'Ash', hex: '#8C8C8C', label: 'Ash Grey' },
    { name: 'Olive', hex: '#4A5340', label: 'Olive' },
    { name: 'Maroon', hex: '#5C2E2E', label: 'Maroon' },
  ],
  availability = 'all', // 'all' | 'inStock' | 'outOfStock'
  onChangeAvailability,
  selectedPrices = [],
  onTogglePrice,
  priceRanges = [
    { label: 'UNDER ₹1,000' },
    { label: '₹1,000 — ₹2,000' },
    { label: 'ABOVE ₹2,000' },
  ],
  sort = 'featured',
  onChangeSort,
  sortOptions = [
    { v: 'featured', label: 'Best selling' },
    { v: 'newest', label: 'Newest' },
    { v: 'popular', label: 'Most wanted' },
    { v: 'price-asc', label: 'Price: Low to High' },
    { v: 'price-desc', label: 'Price: High to Low' },
  ],
  onResetAll,
}) {
  // Lock body scroll and handle Escape key when drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const activeFiltersCount =
    selectedSizes.length +
    selectedCategories.length +
    selectedColors.length +
    selectedPrices.length +
    (availability !== 'all' ? 1 : 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" data-testid="advance-filter-modal">
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Right Sheet Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[420px] bg-white text-ink shadow-2xl flex flex-col z-50"
            role="dialog"
            aria-modal="true"
            aria-label="Filter products"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200 shrink-0">
              <div>
                <h2 className="font-display font-extrabold uppercase text-lg tracking-tight">
                  FILTER
                </h2>
                <p className="text-[11px] font-mono tracking-wider text-smoke uppercase mt-0.5">
                  {filteredCount} {filteredCount === 1 ? 'PRODUCT' : 'PRODUCTS'}
                </p>
              </div>

              <button
                onClick={onClose}
                aria-label="Close filters"
                data-testid="filter-close-btn"
                className="p-2 -mr-2 text-ink/70 hover:text-ink hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Scrollable Filter Options */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">
              {/* 1. Size Section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-3">
                  Size
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allSizes.map((size) => {
                    const isSelected = selectedSizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => onToggleSize(size)}
                        data-testid={`filter-size-${size.toLowerCase().replace(/\s+/g, '-')}`}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-ink text-paper shadow-sm'
                            : 'bg-neutral-100 text-ink/80 hover:bg-neutral-200'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Availability Section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-3">
                  Availability
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'inStock', label: 'In stock' },
                    { id: 'outOfStock', label: 'Out of stock' },
                  ].map((item) => {
                    const isSelected = availability === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onChangeAvailability(item.id)}
                        data-testid={`filter-availability-${item.id}`}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-ink text-paper shadow-sm'
                            : 'bg-neutral-100 text-ink/80 hover:bg-neutral-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Type / Category Section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-3">
                  Type
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => onToggleCategory(cat)}
                        data-testid={`filter-cat-${cat}`}
                        className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-ink text-paper shadow-sm'
                            : 'bg-neutral-100 text-ink/80 hover:bg-neutral-200'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Color Section (Direct Solid Colors Only, No Hue Clusters/Shades) */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-3">
                  Color
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allColors.map((c) => {
                    const isSelected = selectedColors.includes(c.name);
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => onToggleColor(c.name)}
                        data-testid={`filter-color-${c.name.toLowerCase()}`}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-medium flex items-center gap-2 border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-ink text-paper border-ink font-semibold shadow-sm'
                            : 'bg-neutral-100 text-ink/85 border-transparent hover:bg-neutral-200'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0 shadow-inner"
                          style={{ backgroundColor: c.hex }}
                          aria-hidden="true"
                        />
                        <span>{c.label || c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Price Range Section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-3">
                  Price
                </h3>
                <div className="flex flex-wrap gap-2">
                  {priceRanges.map((p, idx) => {
                    const isSelected = selectedPrices.includes(idx);
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => onTogglePrice(idx)}
                        data-testid={`filter-price-${idx}`}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-ink text-paper shadow-sm'
                            : 'bg-neutral-100 text-ink/80 hover:bg-neutral-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Sort By Section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-3">
                  Sort by:
                </h3>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => onChangeSort(e.target.value)}
                    data-testid="advance-sort-select"
                    className="w-full bg-neutral-100 border border-transparent rounded-xl px-4 py-3 text-xs font-semibold text-ink appearance-none focus:outline-none focus:ring-1 focus:ring-ink cursor-pointer"
                  >
                    {sortOptions.map((s) => (
                      <option key={s.v} value={s.v}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-smoke"
                  />
                </div>
              </div>
            </div>

            {/* Sticky Bottom Actions */}
            <div className="p-5 border-t border-neutral-200 bg-white flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onResetAll}
                disabled={activeFiltersCount === 0}
                data-testid="filter-remove-all-btn"
                className={`py-3.5 px-6 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                  activeFiltersCount > 0
                    ? 'border-neutral-300 text-ink hover:border-ink'
                    : 'border-neutral-200 text-neutral-400 cursor-not-allowed'
                }`}
              >
                REMOVE ALL
              </button>

              <button
                type="button"
                onClick={onClose}
                data-testid="filter-apply-btn"
                className="flex-1 py-3.5 px-6 rounded-full text-xs font-bold uppercase tracking-wider bg-ink text-paper hover:bg-ink/85 transition-colors shadow cursor-pointer text-center"
              >
                APPLY {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

