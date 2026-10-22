import { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Verified measurements from Nalayak studio pattern master (garment dimensions)
const SIZE_SPECS = [
  { size: 'XS', chestIn: 36, waistIn: 26, lengthIn: 25.5 },
  { size: 'S',  chestIn: 38, waistIn: 28, lengthIn: 26 },
  { size: 'M',  chestIn: 40, waistIn: 30, lengthIn: 26.5 },
  { size: 'L',  chestIn: 42, waistIn: 32, lengthIn: 27 },
  { size: 'XL', chestIn: 44, waistIn: 34, lengthIn: 27.5 },
  { size: 'XXL', chestIn: 46, waistIn: 36, lengthIn: 28 },
];

/**
 * Returns verified fit guidance based strictly on product data.
 * Does not invent fictional data.
 */
function getFitGuidance(product) {
  if (!product) return null;

  const desc = (product.desc || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  const isOneSize = product.sizes?.length === 1 && product.sizes[0] === 'OS';

  if (category === 'accessories' || isOneSize) {
    return {
      type: 'ONE SIZE / UNIVERSAL FIT',
      advice: 'Engineered for universal fit. Unisex design.',
    };
  }

  if (desc.includes('oversized') || desc.includes('dropped shoulder')) {
    return {
      type: 'OVERSIZED FIT',
      advice: 'Cut with dropped shoulders and generous chest volume. Stay true to size for the intended streetwear drape, or size down for a closer fit.',
    };
  }

  if (desc.includes('cropped')) {
    return {
      type: 'CROPPED SILHOUETTE',
      advice: 'Cut shorter at the torso with relaxed shoulders. Designed to sit cleanly at or above the hip line.',
    };
  }

  if (desc.includes('boxy')) {
    return {
      type: 'BOXY FIT',
      advice: 'Square-cut profile through the chest and torso. True to size with a structured hang.',
    };
  }

  if (desc.includes('regular fit')) {
    return {
      type: 'REGULAR FIT',
      advice: 'Standard streetwear silhouette. Fits true to size.',
    };
  }

  return {
    type: 'RELAXED STREETWEAR FIT',
    advice: 'Our fits run relaxed. If you prefer a closer silhouette, size down. If you prefer drama, stay true to size.',
  };
}

export default function SizeGuideModal({
  isOpen,
  onClose,
  product,
  selectedSize,
  onSelectSize,
}) {
  const [unit, setUnit] = useState('in'); // 'in' | 'cm'
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Keyboard navigation: Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll and set initial focus
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  const fitGuidance = getFitGuidance(product);

  // Filter available rows according to product's actual sizes when defined
  const availableProductSizes = product?.sizes || [];
  const displayRows = SIZE_SPECS.filter((row) => {
    if (availableProductSizes.length === 0) return true;
    if (availableProductSizes.includes('OS')) return false;
    return availableProductSizes.includes(row.size);
  });

  const inToCm = (val) => Math.round(val * 2.54);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          data-testid="size-guide-modal-overlay"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/65 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal Card */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-guide-modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl bg-paper border border-ink p-6 md:p-8 max-h-[90vh] overflow-y-auto shadow-2xl"
            data-testid="size-guide-modal"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <p className="text-[10px] tracking-[0.3em] text-smoke uppercase">
                  ATELIER SPECIFICATION
                </p>
                <h2
                  id="size-guide-modal-title"
                  className="font-display font-black uppercase tracking-tight text-2xl md:text-3xl text-ink mt-0.5"
                >
                  SIZE GUIDE & MEASUREMENTS
                </h2>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Close size guide"
                data-testid="size-guide-close-btn"
                className="p-1.5 text-ink hover:text-smoke transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ink"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Fit Guidance Box (Derived strictly from product data) */}
            {fitGuidance && (
              <div
                className="my-5 border border-line bg-white p-4"
                data-testid="size-guide-fit-guidance"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-1.5 w-1.5 bg-ink" />
                  <p className="text-[10px] tracking-[0.25em] font-bold text-ink uppercase">
                    {fitGuidance.type}
                  </p>
                </div>
                <p className="text-xs text-smoke leading-relaxed">
                  {fitGuidance.advice}
                </p>
              </div>
            )}

            {/* Unit Selector */}
            <div className="flex items-center justify-between my-4">
              <p className="text-[11px] tracking-[0.2em] text-smoke uppercase">
                GARMENT MEASUREMENTS
              </p>

              <div
                className="inline-flex border border-ink p-0.5 bg-white"
                role="group"
                aria-label="Measurement units"
              >
                <button
                  type="button"
                  onClick={() => setUnit('in')}
                  data-testid="size-unit-in-btn"
                  className={`px-3 py-1 text-[11px] tracking-[0.2em] font-medium transition-colors ${
                    unit === 'in'
                      ? 'bg-ink text-paper'
                      : 'text-smoke hover:text-ink'
                  }`}
                >
                  INCHES
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('cm')}
                  data-testid="size-unit-cm-btn"
                  className={`px-3 py-1 text-[11px] tracking-[0.2em] font-medium transition-colors ${
                    unit === 'cm'
                      ? 'bg-ink text-paper'
                      : 'text-smoke hover:text-ink'
                  }`}
                >
                  CM
                </button>
              </div>
            </div>

            {/* Responsive Table */}
            {displayRows.length > 0 ? (
              <div className="overflow-x-auto border border-line">
                <table className="w-full text-left text-xs" data-testid="size-guide-table">
                  <thead>
                    <tr className="bg-ink text-paper text-[10px] tracking-[0.2em]">
                      <th className="px-4 py-3">SIZE</th>
                      <th className="px-4 py-3">CHEST ({unit.toUpperCase()})</th>
                      <th className="px-4 py-3">WAIST ({unit.toUpperCase()})</th>
                      <th className="px-4 py-3">LENGTH ({unit.toUpperCase()})</th>
                      <th className="px-4 py-3 text-right">SELECTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-white">
                    {displayRows.map((r) => {
                      const isSelected = selectedSize === r.size;
                      const chestVal = unit === 'in' ? `${r.chestIn}"` : `${inToCm(r.chestIn)} cm`;
                      const waistVal = unit === 'in' ? `${r.waistIn}"` : `${inToCm(r.waistIn)} cm`;
                      const lengthVal = unit === 'in' ? `${r.lengthIn}"` : `${inToCm(r.lengthIn)} cm`;

                      return (
                        <tr
                          key={r.size}
                          onClick={() => {
                            if (onSelectSize) {
                              onSelectSize(r.size);
                              onClose();
                            }
                          }}
                          className={`transition-colors cursor-pointer hover:bg-paper/80 ${
                            isSelected ? 'bg-line/40 font-semibold' : ''
                          }`}
                          data-testid={`size-row-${r.size.toLowerCase()}`}
                        >
                          <td className="px-4 py-3 font-bold text-ink">
                            {r.size}
                          </td>
                          <td className="px-4 py-3 text-ink/80">{chestVal}</td>
                          <td className="px-4 py-3 text-ink/80">{waistVal}</td>
                          <td className="px-4 py-3 text-ink/80">{lengthVal}</td>
                          <td className="px-4 py-3 text-right">
                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.15em] text-ink font-bold">
                                <Check size={12} strokeWidth={2} /> SELECTED
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSelectSize) {
                                    onSelectSize(r.size);
                                    onClose();
                                  }
                                }}
                                className="text-[10px] tracking-[0.15em] text-smoke hover:text-ink underline underline-offset-2"
                              >
                                CHOOSE
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 border border-line bg-white text-center text-sm text-smoke">
                This item is designed as ONE SIZE (Universal Fit).
              </div>
            )}

            {/* Measuring notes */}
            <div className="mt-5 space-y-2 text-[11px] text-smoke border-t border-line pt-4 leading-relaxed">
              <p>
                <strong className="text-ink">CHEST:</strong> Measured flat from armpit to armpit seam, doubled.
              </p>
              <p>
                <strong className="text-ink">LENGTH:</strong> Measured from highest shoulder point down to bottom hem.
              </p>
              <p className="text-[10px] tracking-wide text-smoke/70 italic pt-1">
                Measurements are garment dimensions, not body. For questions about fit, reach us at support@nalayak.in.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

