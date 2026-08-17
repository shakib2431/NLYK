import { Link } from 'react-router-dom';
import { X, Minus, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/context/StoreContext';
import { formatINR, FREE_SHIPPING_THRESHOLD } from '@/data/storeData';
import SafeImg from '@/components/SafeImg';

export default function CartDrawer() {
  const { setCartOpen, cart, cartSubtotal, updateQty, removeFromCart } = useStore();

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartSubtotal);
  const progress = Math.min(100, (cartSubtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div className="fixed inset-0 z-50" data-testid="cart-drawer">
      <motion.div
        className="absolute inset-0 bg-ink/50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => setCartOpen(false)}
      />
      <motion.aside
        className="absolute right-0 top-0 h-full w-full max-w-md bg-paper flex flex-col border-l border-ink"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-line">
          <h2 className="font-display font-extrabold uppercase tracking-tight text-xl">
            YOUR BAG <span className="text-smoke">({cart.length})</span>
          </h2>
          <button data-testid="cart-close-btn" onClick={() => setCartOpen(false)} aria-label="Close bag" className="p-1 hover:text-smoke transition-colors">
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>

        {cart.length > 0 ? (
          <>
            <div className="px-5 py-4 border-b border-line">
              <p className="text-[11px] tracking-[0.15em] mb-2" data-testid="shipping-progress-text">
                {remaining > 0 ? `${formatINR(remaining)} AWAY FROM FREE SHIPPING` : 'FREE SHIPPING UNLOCKED. GOOD CHOICE.'}
              </p>
              <div className="h-[3px] bg-line w-full">
                <motion.div className="h-full bg-ink" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 divide-y divide-line">
              {cart.map((item) => (
                <div key={item.key} className="py-4 flex gap-4" data-testid={`cart-item-${item.key}`}>
                  <Link to={`/product/${item.slug}`} onClick={() => setCartOpen(false)} className="h-24 w-[72px] bg-white border border-line overflow-hidden shrink-0">
                    <SafeImg id={item.image} w={300} alt={item.name} className="h-full w-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <p className="text-[13px] font-medium leading-snug">{item.name}</p>
                      <button data-testid={`cart-remove-${item.key}`} onClick={() => removeFromCart(item.key)} aria-label="Remove item" className="text-smoke hover:text-ink transition-colors">
                        <Trash2 size={15} strokeWidth={1.5} />
                      </button>
                    </div>
                    <p className="text-[11px] text-smoke mt-1 tracking-wide">{item.color} / {item.size}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center border border-ink">
                        <button data-testid={`cart-dec-${item.key}`} onClick={() => updateQty(item.key, -1)} className="px-2 py-1 hover:bg-ink hover:text-paper transition-colors" aria-label="Decrease quantity">
                          <Minus size={12} />
                        </button>
                        <span className="px-3 text-[12px] font-medium" data-testid={`cart-qty-${item.key}`}>{item.qty}</span>
                        <button data-testid={`cart-inc-${item.key}`} onClick={() => updateQty(item.key, 1)} className="px-2 py-1 hover:bg-ink hover:text-paper transition-colors" aria-label="Increase quantity">
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-[13px] font-semibold">{formatINR(item.price * item.qty)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-ink px-5 py-5 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="tracking-[0.15em] text-[11px] text-smoke">SUBTOTAL</span>
                <span className="font-semibold" data-testid="cart-subtotal">{formatINR(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="tracking-[0.15em] text-[11px] text-smoke">SHIPPING</span>
                <span className="font-semibold">{remaining > 0 ? formatINR(99) : 'FREE'}</span>
              </div>
              <Link
                to="/cart"
                onClick={() => setCartOpen(false)}
                data-testid="cart-checkout-btn"
                className="block w-full bg-ink text-paper text-center py-4 text-[12px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300"
              >
                CHECKOUT — {formatINR(cartSubtotal + (remaining > 0 ? 99 : 0))}
              </Link>
              <button
                data-testid="cart-continue-btn"
                onClick={() => setCartOpen(false)}
                className="block w-full text-center text-[11px] tracking-[0.25em] text-smoke hover:text-ink transition-colors"
              >
                CONTINUE SHOPPING
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center" data-testid="cart-empty">
            <p className="font-display font-extrabold uppercase tracking-tight text-3xl">EMPTY.</p>
            <p className="mt-3 text-smoke text-sm">Your bag is as empty as our respect for boring clothes.</p>
            <Link
              to="/new-arrivals"
              onClick={() => setCartOpen(false)}
              data-testid="cart-empty-shop-btn"
              className="mt-8 bg-ink text-paper px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors"
            >
              SHOP NEW ARRIVALS
            </Link>
          </div>
        )}
      </motion.aside>
    </div>
  );
}
