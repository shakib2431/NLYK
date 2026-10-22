import { motion, AnimatePresence } from 'framer-motion';
import SafeImg from '@/components/SafeImg';
import { formatINR } from '@/data/storeData';

export default function MobileStickyPurchaseBar({
  isVisible,
  product,
  size,
  setSize,
  color,
  selectedColorImage,
  imgIndex,
  soldOut,
  dropState,
  onAddToCart,
}) {
  if (!product) return null;

  const isLocked = dropState === 'locked' || dropState === 'coming-soon';
  const displayImage = selectedColorImage || product.images?.[imgIndex] || product.images?.[0];
  const hasMultipleSizes = product.sizes && product.sizes.length > 1;
  const singleSize = product.sizes?.[0] || 'OS';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-paper/95 backdrop-blur-md border-t border-ink px-4 pt-2.5 md:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.12)]"
          style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))' }}
          data-testid="mobile-sticky-purchase-bar"
          role="region"
          aria-label="Quick purchase bar"
        >
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            {/* Product Thumbnail & Details */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-10 h-12 bg-white border border-line overflow-hidden shrink-0">
                <SafeImg
                  id={displayImage}
                  w={120}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-display font-extrabold text-[12px] uppercase tracking-tight truncate text-ink">
                  {product.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-semibold text-ink" data-testid="sticky-price">
                    {formatINR(product.price)}
                  </span>
                  {product.compareAt && (
                    <span className="text-[10px] text-smoke line-through">
                      {formatINR(product.compareAt)}
                    </span>
                  )}
                  {color?.name && (
                    <span className="text-[10px] text-smoke uppercase tracking-wider truncate">
                      • {color.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Variant Selector & Purchase Action */}
            <div className="flex items-center gap-2 shrink-0">
              {hasMultipleSizes ? (
                <div className="relative">
                  <label htmlFor="sticky-size-select" className="sr-only">
                    Select Size
                  </label>
                  <select
                    id="sticky-size-select"
                    value={size || ''}
                    onChange={(e) => setSize(e.target.value)}
                    data-testid="sticky-size-select"
                    aria-label="Select product size"
                    className="bg-white border border-ink text-[11px] font-bold py-2.5 pl-2.5 pr-6 uppercase tracking-wider appearance-none focus:outline-none focus-visible:ring-1 focus-visible:ring-ink cursor-pointer"
                  >
                    <option value="" disabled>
                      SIZE
                    </option>
                    {product.sizes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <span
                    className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-smoke"
                    aria-hidden="true"
                  >
                    ▼
                  </span>
                </div>
              ) : (
                <div
                  className="border border-line bg-white px-2 py-2 text-[10px] font-bold text-ink uppercase tracking-wider"
                  data-testid="sticky-single-size"
                >
                  {singleSize}
                </div>
              )}

              <button
                type="button"
                data-testid="sticky-add-to-bag"
                disabled={soldOut || isLocked}
                onClick={onAddToCart}
                aria-label={
                  soldOut
                    ? 'Product sold out'
                    : isLocked
                    ? 'Club membership required'
                    : `Add ${product.name} to bag`
                }
                className="bg-ink text-paper px-4 py-2.5 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-ink/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {soldOut ? 'SOLD OUT' : isLocked ? 'LOCKED' : 'ADD TO BAG'}
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
