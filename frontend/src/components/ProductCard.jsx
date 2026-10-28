import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import SafeImg from '@/components/SafeImg';
import { useStore } from '@/context/StoreContext';
import { canPurchase } from '@/services/membership';
import { formatINR } from '@/data/storeData';

export default function ProductCard({ product, priority = false }) {
  const { wishlist, toggleWishlist, addToCart, member } = useStore();
  const [hover, setHover] = useState(false);
  const [mobileQuickAddOpen, setMobileQuickAddOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0]?.name || 'Standard');
  const selectedImage =
    product.colorImages?.[selectedColor] || product.images?.[0] || 'photo-1523381210434-271e8be1f52b';
  const wished = wishlist.includes(product.slug);
  const soldOut = product.stock === 0;
  const canBuy = canPurchase(product, member);
  const discount = product.compareAt
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : 0;

  const quickAdd = (size) => {
    const color = product.colors?.find((c) => c.name === selectedColor) || product.colors?.[0] || { name: 'Standard', hex: '#000000' };
    addToCart(product, size, color, 1, product.colorImages?.[color?.name] || product.images?.[0]);
    toast.success(`${product.name} — added to bag`, { description: `Size ${size} · ${color?.name || 'Standard'}` });
  };

  return (
    <div
      className="group"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-testid={`product-card-${product.slug}`}
    >
      <div className="relative overflow-hidden bg-white border border-line aspect-[3/4]">
        <Link to={`/product/${product.slug}`} data-testid={`product-link-${product.slug}`} aria-label={product.name}>
          <SafeImg
            id={selectedImage} w={800} alt={product.name}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${hover && product.images?.[1] ? 'opacity-0' : 'opacity-100'}`}
            {...(priority ? { loading: 'eager' } : {})}
          />
          {product.images?.[1] && (
            <SafeImg
              id={product.images[1]} w={800} alt={`${product.name} alternate view`}
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${hover ? 'opacity-100 scale-[1.03]' : 'opacity-0'}`}
            />
          )}
        </Link>

        {product.badge && (
          <span
            className={`absolute top-3 left-3 px-2.5 py-1 text-[9.5px] tracking-[0.2em] font-bold uppercase shadow-sm ${
              product.badge === 'BEST SELLER'
                ? 'bg-[#FF4400] text-white'
                : product.badge === 'NEW'
                ? 'bg-[#1035FF] text-white'
                : product.badge === 'LIMITED'
                ? 'bg-[#143822] text-[#E2E8F0]'
                : product.badge === 'SOLD OUT'
                ? 'bg-[#262626] text-[#A3A3A3]'
                : 'bg-ink text-paper'
            }`}
          >
            {product.badge}
          </span>
        )}
        {discount > 0 && !product.badge && (
          <span className="absolute top-3 left-3 px-2.5 py-1 text-[9.5px] tracking-[0.2em] font-bold uppercase bg-[#B80C2A] text-white shadow-sm">
            -{discount}%
          </span>
        )}

        <button
          data-testid={`wishlist-btn-${product.slug}`}
          onClick={() => {
            toggleWishlist(product.slug);
            toast(wished ? 'Removed from wishlist' : 'Saved to wishlist', { description: product.name });
          }}
          aria-label="Toggle wishlist"
          className="absolute top-3 right-3 p-2 bg-paper/90 hover:bg-paper transition-colors duration-300"
        >
          <Heart size={16} strokeWidth={1.5} className={wished ? 'fill-ink stroke-ink' : 'stroke-ink'} />
        </button>

        {canBuy && !soldOut && (
          <button
            type="button"
            aria-label={`Quick add ${product.name}`}
            data-testid={`mobile-quick-add-${product.slug}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setMobileQuickAddOpen(!mobileQuickAddOpen);
            }}
            className="md:hidden absolute bottom-2.5 right-2.5 z-20 h-8 w-8 bg-paper/95 backdrop-blur-sm border border-ink text-ink flex items-center justify-center active:scale-95 shadow-sm"
          >
            <Plus size={14} strokeWidth={2.5} className={mobileQuickAddOpen ? 'rotate-45 transition-transform' : 'transition-transform'} />
          </button>
        )}

        {!canBuy && !soldOut ? (
          <Link
            to="/club"
            data-testid={`club-locked-${product.slug}`}
            className={`absolute inset-x-0 bottom-0 bg-ink text-paper text-center py-2 text-[10px] tracking-[0.25em] transition-transform duration-300 ${hover ? 'translate-y-0' : 'translate-y-full'} hidden md:block`}
          >
            CLUB ACCESS
          </Link>
        ) : !soldOut ? (
          <div
            className={`absolute inset-x-0 bottom-0 bg-paper/95 backdrop-blur-md border-t border-ink transition-transform duration-300 ${
              hover || mobileQuickAddOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
            } z-10`}
          >
            {product.sizes && product.sizes.length > 1 ? (
              <div className="p-2 space-y-1.5">
                <div className="flex items-center justify-between px-0.5">
                  <button
                    type="button"
                    data-testid={`quick-add-btn-${product.slug}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const def = product.sizes.includes('M') ? 'M' : product.sizes[0];
                      quickAdd(def);
                    }}
                    className="text-[10px] tracking-[0.2em] font-bold uppercase flex items-center gap-1 text-ink hover:text-smoke active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus size={11} strokeWidth={2.5} /> QUICK ADD
                  </button>
                  <span className="text-[9px] tracking-[0.15em] text-smoke uppercase font-mono">
                    SELECT SIZE
                  </span>
                </div>
                <div className="grid grid-flow-col auto-cols-fr gap-1">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      data-testid={`quick-add-${product.slug}-${s}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        quickAdd(s);
                      }}
                      className="text-[10.5px] font-semibold py-1 bg-white border border-ink/30 hover:border-ink hover:bg-ink hover:text-paper active:scale-95 transition-all duration-150 text-center cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                type="button"
                data-testid={`quick-add-btn-${product.slug}`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  quickAdd(product.sizes?.[0] || 'OS');
                }}
                className="w-full py-2.5 px-3 flex items-center justify-center gap-2 text-[11px] tracking-[0.22em] font-bold uppercase bg-ink text-paper hover:bg-ink/85 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Plus size={12} strokeWidth={2.5} /> QUICK ADD {product.sizes?.[0] ? `· ${product.sizes[0]}` : ''}
              </button>
            )}
          </div>
        ) : (
          <div className="absolute inset-x-0 bottom-0 bg-ink text-paper text-center py-2 text-[10px] tracking-[0.25em]">
            SOLD OUT
          </div>
        )}
      </div>

      <div className="pt-2 flex items-start justify-between gap-2">
        <div>
          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="text-[13px] font-medium tracking-wide leading-snug">{product.name}</h3>
          </Link>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display font-bold text-sm tracking-tight text-ink">{formatINR(product.price)}</span>
            {product.compareAt && (
              <span className="text-[12px] text-smoke line-through">{formatINR(product.compareAt)}</span>
            )}
          </div>
        </div>
       <div className="flex gap-1 pt-1">
  {(product.colors || []).map((c) => (
    <button
      key={c.name}
      type="button"
      title={c.name}
      aria-label={`Select ${c.name}`}
      onClick={() => setSelectedColor(c.name)}
      className={`h-3 w-3 border transition-all duration-200 ${
        selectedColor === c.name
          ? 'border-ink ring-1 ring-ink ring-offset-1'
          : 'border-ink/30'
      }`}
      style={{ backgroundColor: c.hex }}
    />
  ))}
</div>
      </div>
    </div>
  );
}
