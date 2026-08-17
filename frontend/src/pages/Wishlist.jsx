import { Link } from 'react-router-dom';
import ProductCard from '@/components/ProductCard';
import { Reveal } from '@/components/Reveal';
import { useStore } from '@/context/StoreContext';
import { useSeo } from '@/hooks/useSeo';

export default function Wishlist() {
  useSeo('Wishlist', 'Your saved Nalayak pieces.');
  const { wishlistProducts } = useStore();

  return (
    <main className="px-4 md:px-8 max-w-[1600px] mx-auto py-10 md:py-16" data-testid="wishlist-page">
      <Reveal y={16}>
        <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">SAVED FOR LATER</p>
        <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-5xl md:text-7xl">WISHLIST</h1>
        <p className="mt-3 text-smoke text-sm">{wishlistProducts.length} piece{wishlistProducts.length !== 1 ? 's' : ''} you're pretending to think about.</p>
      </Reveal>

      {wishlistProducts.length === 0 ? (
        <div className="py-24 text-center" data-testid="wishlist-empty">
          <p className="font-display font-extrabold uppercase tracking-tight text-3xl">NOTHING SAVED. BOLD.</p>
          <p className="mt-3 text-smoke text-sm">Tap the heart on anything you can't stop thinking about.</p>
          <Link to="/new-arrivals" data-testid="wishlist-shop-btn" className="inline-block mt-8 bg-ink text-paper px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors">
            SHOP NEW ARRIVALS
          </Link>
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {wishlistProducts.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.05}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      )}
    </main>
  );
}
