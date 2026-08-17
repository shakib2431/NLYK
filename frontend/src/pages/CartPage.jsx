import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import SafeImg from '@/components/SafeImg';
import { Reveal } from '@/components/Reveal';
import { useStore } from '@/context/StoreContext';
import { formatINR, FREE_SHIPPING_THRESHOLD } from '@/data/storeData';
import { useSeo } from '@/hooks/useSeo';

export default function CartPage() {
  useSeo('Bag', 'Review your bag.');
  const { cart, cartSubtotal, updateQty, removeFromCart, clearCart } = useStore();
  const [placing, setPlacing] = useState(false);
  const [order, setOrder] = useState(null);
  const shipping = cartSubtotal >= FREE_SHIPPING_THRESHOLD || cartSubtotal === 0 ? 0 : 99;

  const checkout = async () => {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('nalayak_user') || 'null'); } catch { /* ignore */ }
    if (!user?.email) {
      toast.error('Sign in to check out.', { description: 'Thirty seconds. Account, top right.' });
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          items: cart.map((i) => ({ slug: i.slug, name: i.name, size: i.size, color: i.color, qty: i.qty, price: i.price })),
          subtotal: cartSubtotal,
          shipping,
          total: cartSubtotal + shipping,
        }),
      });
      if (!res.ok) throw new Error('order_failed');
      const data = await res.json();
      setOrder({ id: data.orderId, emailed: data.emailed, total: cartSubtotal + shipping });
      clearCart();
    } catch {
      toast.error('Order failed to place. Try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (order) {
    return (
      <main className="px-4 md:px-8 py-32 md:py-40 max-w-[900px] mx-auto text-center" data-testid="order-success">
        <p className="text-[11px] tracking-[0.35em] text-smoke mb-4">ORDER {order.id}</p>
        <h1 className="font-display font-black uppercase tracking-tighter leading-[0.85] text-[12vw] md:text-[6vw]">
          GOOD CHOICE.
        </h1>
        <p className="mt-6 text-smoke text-sm md:text-base max-w-md mx-auto">
          {order.emailed
            ? 'Confirmed and receipt sent to your email. It ships from Mumbai within 48 hours.'
            : 'Confirmed. It ships from Mumbai within 48 hours.'}
        </p>
        <p className="mt-2 text-sm font-semibold">Total — ₹{order.total.toLocaleString('en-IN')}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/account" data-testid="order-account-btn" className="bg-ink text-paper px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors">
            VIEW YOUR ORDERS
          </Link>
          <Link to="/new-arrivals" data-testid="order-continue-btn" className="border border-ink px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink hover:text-paper transition-colors">
            CONTINUE SHOPPING
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 md:px-8 max-w-[1200px] mx-auto py-10 md:py-16" data-testid="cart-page">
      <Reveal y={16}>
        <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">REVIEW THE DAMAGE</p>
        <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-5xl md:text-7xl">YOUR BAG</h1>
      </Reveal>

      {cart.length === 0 ? (
        <div className="py-24 text-center" data-testid="cart-page-empty">
          <p className="font-display font-extrabold uppercase tracking-tight text-3xl">EMPTY.</p>
          <p className="mt-3 text-smoke text-sm">Nothing in here. Very disciplined. Very unlike you.</p>
          <Link to="/new-arrivals" data-testid="cart-page-shop-btn" className="inline-block mt-8 bg-ink text-paper px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors">
            SHOP NEW ARRIVALS
          </Link>
        </div>
      ) : (
        <div className="mt-12 grid lg:grid-cols-[1fr_360px] gap-12">
          <div className="divide-y divide-line border-y border-line">
            {cart.map((item) => (
              <div key={item.key} className="py-5 flex gap-5" data-testid={`cart-page-item-${item.key}`}>
                <Link to={`/product/${item.slug}`} className="h-32 w-24 bg-white border border-line overflow-hidden shrink-0">
                  <SafeImg id={item.image} w={300} alt={item.name} className="h-full w-full object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-3">
                    <Link to={`/product/${item.slug}`} className="text-sm font-medium leading-snug hover:text-smoke transition-colors">
                      {item.name}
                    </Link>
                    <button data-testid={`cart-page-remove-${item.key}`} onClick={() => removeFromCart(item.key)} aria-label="Remove item" className="text-smoke hover:text-ink transition-colors">
                      <Trash2 size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                  <p className="text-[11px] text-smoke mt-1 tracking-wide">{item.color} / {item.size}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center border border-ink">
                      <button data-testid={`cart-page-dec-${item.key}`} onClick={() => updateQty(item.key, -1)} className="px-3 py-1.5 hover:bg-ink hover:text-paper transition-colors" aria-label="Decrease quantity">
                        <Minus size={12} />
                      </button>
                      <span className="px-4 text-[13px] font-medium">{item.qty}</span>
                      <button data-testid={`cart-page-inc-${item.key}`} onClick={() => updateQty(item.key, 1)} className="px-3 py-1.5 hover:bg-ink hover:text-paper transition-colors" aria-label="Increase quantity">
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="text-sm font-semibold">{formatINR(item.price * item.qty)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="lg:sticky lg:top-28 self-start border border-ink p-6" data-testid="order-summary">
            <h2 className="font-display font-extrabold uppercase tracking-tight text-2xl">SUMMARY</h2>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-smoke">Subtotal</span>
                <span className="font-medium" data-testid="summary-subtotal">{formatINR(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-smoke">Shipping</span>
                <span className="font-medium">{shipping === 0 ? 'FREE' : formatINR(shipping)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-line text-base font-semibold">
                <span>Total</span>
                <span data-testid="summary-total">{formatINR(cartSubtotal + shipping)}</span>
              </div>
            </div>
            <button
              data-testid="summary-checkout-btn"
              disabled={placing}
              onClick={checkout}
              className="mt-6 w-full bg-ink text-paper py-4 text-[12px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300 disabled:opacity-50"
            >
              {placing ? 'PLACING ORDER' : 'CHECKOUT'}
            </button>
            <p className="mt-3 text-[11px] text-smoke text-center tracking-wide">
              Mock checkout — Razorpay connects with your keys. Receipt emails are real.
            </p>
            <Link to="/new-arrivals" data-testid="summary-continue-btn" className="block mt-4 text-center text-[11px] tracking-[0.25em] text-smoke hover:text-ink transition-colors">
              CONTINUE SHOPPING
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
