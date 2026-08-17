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
  const wished = wishlist.includes(product.slug);
  const soldOut = product.stock === 0;
  const canBuy = canPurchase(product, member);
  const discount = product.compareAt
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : 0;

  const quickAdd = (size) => {
    addToCart(product, size, product.colors[0]);
    toast.success(`${product.name} — added to bag`, { description: `Size ${size}` });
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
            id={product.images[0]} w={800} alt={product.name}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${hover && product.images[1] ? 'opacity-0' : 'opacity-100'}`}
            {...(priority ? { loading: 'eager' } : {})}
          />
          {product.images[1] && (
            <SafeImg
              id={product.images[1]} w={800} alt={`${product.name} alternate view`}
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${hover ? 'opacity-100 scale-[1.03]' : 'opacity-0'}`}
            />
          )}
        </Link>

        {product.badge && (
          <span className={`absolute top-3 left-3 px-2 py-1 text-[10px] tracking-[0.2em] font-medium ${product.badge === 'SOLD OUT' ? 'bg-ink text-paper' : 'bg-paper text-ink border border-ink'}`}>
            {product.badge}
          </span>
        )}
        {discount > 0 && !product.badge && (
          <span className="absolute top-3 left-3 px-2 py-1 text-[10px] tracking-[0.2em] font-medium bg-ink text-paper">
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
            className={`absolute inset-x-0 bottom-0 bg-paper border-t border-ink transition-transform duration-300 ${hover ? 'translate-y-0' : 'translate-y-full'} hidden md:block`}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[10px] tracking-[0.2em] font-medium flex items-center gap-1">
                <Plus size={12} /> QUICK ADD
              </span>
              <div className="flex gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    data-testid={`quick-add-${product.slug}-${s}`}
                    onClick={() => quickAdd(s)}
                    className="text-[11px] px-1.5 py-0.5 hover:bg-ink hover:text-paper transition-colors duration-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-x-0 bottom-0 bg-ink text-paper text-center py-2 text-[10px] tracking-[0.25em]">
            SOLD OUT
          </div>
        )}
      </div>

      <div className="pt-3 flex items-start justify-between gap-3">
        <div>
          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="text-[13px] font-medium tracking-wide leading-snug">{product.name}</h3>
          </Link>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[13px] font-semibold">{formatINR(product.price)}</span>
            {product.compareAt && (
              <span className="text-[12px] text-smoke line-through">{formatINR(product.compareAt)}</span>
            )}
          </div>
        </div>
        <div className="flex gap-1 pt-1">
          {product.colors.map((c) => (
            <span key={c.name} title={c.name} className="h-3 w-3 border border-ink/30" style={{ backgroundColor: c.hex }} />
          ))}
        </div>
      </div>
    </div>
  );
}
