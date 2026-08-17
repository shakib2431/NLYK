import { Link, useParams } from 'react-router-dom';
import SafeImg from '@/components/SafeImg';
import ProductCard from '@/components/ProductCard';
import { Reveal } from '@/components/Reveal';
import { getCollectionBySlug, getCollectionProducts } from '@/services/catalog';
import { useSeo } from '@/hooks/useSeo';

export default function CollectionDetail() {
  const { slug } = useParams();
  const col = getCollectionBySlug(slug);
  useSeo(col?.title || 'Collection', col?.desc);

  if (!col) {
    return (
      <main className="px-4 md:px-8 py-32 text-center" data-testid="collection-not-found">
        <p className="font-display font-extrabold uppercase tracking-tight text-4xl">THAT EDIT DOESN'T EXIST.</p>
        <Link to="/collections" className="inline-block mt-8 border border-ink px-8 py-4 text-[11px] tracking-[0.3em] hover:bg-ink hover:text-paper transition-colors">
          BACK TO COLLECTIONS
        </Link>
      </main>
    );
  }

  const items = getCollectionProducts(slug);

  return (
    <main data-testid={`collection-${slug}`}>
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden bg-ink">
        <SafeImg id={col.image} w={2000} alt={col.title} className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-end pb-12 px-4 md:px-8 max-w-[1600px] mx-auto">
          <Reveal y={20}>
            <p className="text-paper/70 text-[11px] tracking-[0.3em] mb-3">COLLECTION</p>
            <h1 className="font-display font-black uppercase tracking-tighter leading-[0.85] text-paper text-[13vw] md:text-[7vw]">
              {col.title}
            </h1>
            <p className="mt-3 text-paper/80 text-sm md:text-base max-w-md">{col.desc}</p>
          </Reveal>
        </div>
      </section>

      <section className="px-4 md:px-8 max-w-[1600px] mx-auto py-16 md:py-24">
        <div className="flex items-center justify-between mb-10">
          <span className="text-[11px] tracking-[0.2em] text-smoke">{items.length} PIECES</span>
          <Link to="/collections" className="text-[11px] tracking-[0.2em] text-smoke hover:text-ink transition-colors" data-testid="back-to-collections">
            ← ALL COLLECTIONS
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {items.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.06}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
