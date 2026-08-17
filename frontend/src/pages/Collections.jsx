import { Link } from 'react-router-dom';
import SafeImg from '@/components/SafeImg';
import { Reveal } from '@/components/Reveal';
import { getCollections } from '@/services/catalog';
import { useSeo } from '@/hooks/useSeo';

export default function Collections() {
  useSeo('Collections', 'The Nalayak Edit — curated drops, edits and moods.');
  const cols = getCollections();

  return (
    <main className="px-4 md:px-8 max-w-[1600px] mx-auto py-10 md:py-16" data-testid="collections-page">
      <nav className="text-[10px] tracking-[0.25em] text-smoke mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-ink transition-colors">HOME</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">COLLECTIONS</span>
      </nav>
      <Reveal y={16}>
        <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">THE NALAYAK EDIT</p>
        <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-5xl md:text-7xl">COLLECTIONS</h1>
        <p className="mt-3 text-smoke text-sm max-w-md">Curated moods, not categories. Pick your problem.</p>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
        {cols.map((c, i) => (
          <Reveal key={c.slug} delay={i * 0.08} className={i % 2 === 0 ? 'md:col-span-7' : 'md:col-span-5'}>
            <Link
              to={`/collections/${c.slug}`}
              data-testid={`collection-card-${c.slug}`}
              className="group relative block overflow-hidden bg-ink aspect-[4/3] md:aspect-auto md:h-[520px]"
            >
              <SafeImg
                id={c.image} w={1200} alt={c.title}
                className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 text-paper">
                <p className="text-[10px] tracking-[0.3em] text-paper/70 mb-2">0{i + 1} — COLLECTION</p>
                <h2 className="font-display font-extrabold uppercase tracking-tight text-3xl md:text-4xl">{c.title}</h2>
                <p className="mt-2 text-sm text-paper/80">{c.desc}</p>
                <span className="mt-4 inline-block text-[11px] tracking-[0.25em] border-b border-paper pb-1 group-hover:translate-x-1 transition-transform duration-300">
                  SHOP THE EDIT →
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </main>
  );
}
