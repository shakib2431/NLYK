import { Link } from 'react-router-dom';
import SafeImg from '@/components/SafeImg';
import { Reveal } from '@/components/Reveal';
import { useStore } from '@/context/StoreContext';
import { getProducts } from '@/services/catalog';
import { getDropState, hasClubAccess, formatReleaseLabel } from '@/services/membership';
import { formatINR } from '@/data/storeData';
import { useSeo } from '@/hooks/useSeo';

const STATE_LABEL = {
  'club-live': 'CLUB ACCESS — LIVE NOW',
  'coming-soon': 'COMING SOON',
  locked: 'CLUB ACCESS ONLY',
  public: 'PUBLIC — LIVE',
  'sold-out': 'SOLD OUT',
};

function DropCard({ product, member, index }) {
  const { dropAlerts, toggleDropAlert } = useStore();
  const state = getDropState(product, member);
  const locked = state === 'locked' || state === 'coming-soon';
  const subscribed = dropAlerts.includes(product.slug);

  return (
    <Reveal delay={index * 0.06}>
      <div className="group" data-testid={`drop-card-${product.slug}`}>
        <div className="relative overflow-hidden bg-white border border-line aspect-[3/4]">
          <Link to={`/product/${product.slug}`} data-testid={`drop-link-${product.slug}`} aria-label={product.name}>
            <SafeImg
              id={product.images[0]} w={800} alt={product.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </Link>
          <span className={`absolute top-3 left-3 px-2 py-1 text-[10px] tracking-[0.2em] font-medium ${state === 'club-live' ? 'bg-ink text-paper' : 'bg-paper text-ink border border-ink'}`}>
            {STATE_LABEL[state]}
          </span>
          {locked && (
            <div className="absolute inset-0 bg-ink/70 flex flex-col items-center justify-center text-center px-6" data-testid={`drop-locked-${product.slug}`}>
              <p className="text-paper text-[10px] tracking-[0.3em] mb-2">CLUB ACCESS</p>
              <p className="text-paper font-display font-extrabold uppercase tracking-tight text-xl leading-tight">
                THESE PIECES AREN'T PUBLIC YET.
              </p>
              {state === 'coming-soon' ? (
                <button
                  onClick={() => toggleDropAlert(product.slug)}
                  data-testid={`drop-notify-${product.slug}`}
                  className="mt-5 border border-paper text-paper px-6 py-3 text-[10px] tracking-[0.3em] font-medium hover:bg-paper hover:text-ink transition-colors duration-300"
                >
                  {subscribed ? "YOU'RE ON THE LIST." : 'NOTIFY ME'}
                </button>
              ) : (
                <Link
                  to="/club"
                  data-testid={`drop-join-${product.slug}`}
                  className="mt-5 border border-paper text-paper px-6 py-3 text-[10px] tracking-[0.3em] font-medium hover:bg-paper hover:text-ink transition-colors duration-300"
                >
                  JOIN THE CLUB
                </Link>
              )}
            </div>
          )}
        </div>
        <div className="pt-3">
          <div className="flex justify-between text-[10px] tracking-[0.2em] text-smoke">
            <span>
              CLUB — {product.clubReleaseAt && Date.parse(product.clubReleaseAt) <= Date.now() ? 'LIVE NOW' : product.clubReleaseAt ? formatReleaseLabel(product.clubReleaseAt) : 'MEMBERS ONLY'}
            </span>
            <span>
              PUBLIC — {product.publicReleaseAt ? (Date.parse(product.publicReleaseAt) <= Date.now() ? 'LIVE' : formatReleaseLabel(product.publicReleaseAt)) : 'NEVER'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <h3 className="text-[13px] font-medium tracking-wide">{product.name}</h3>
            <span className="text-[13px] font-semibold">{formatINR(product.price)}</span>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function ClubDrops() {
  useSeo('Club Drops', 'Members-first drops. Public later, maybe.');
  const { member } = useStore();
  const access = hasClubAccess(member);
  const drops = getProducts().filter((p) => p.clubOnly || p.clubEarlyAccess || p.clubReleaseAt);

  return (
    <main className="px-4 md:px-8 max-w-[1600px] mx-auto py-10 md:py-16" data-testid="club-drops-page">
      <nav className="text-[10px] tracking-[0.25em] text-smoke mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-ink transition-colors">HOME</Link>
        <span className="mx-2">/</span>
        <Link to="/club" className="hover:text-ink transition-colors">CLUB</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">DROPS</span>
      </nav>

      <Reveal y={16}>
        <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">NALAYAK CLUB</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-5xl md:text-7xl">CLUB DROPS</h1>
          <p className="text-smoke text-sm max-w-sm">Members first. Everyone else eventually. Maybe.</p>
        </div>
      </Reveal>

      {!access && (
        <Reveal>
          <div className="mt-10 border border-ink p-6 md:p-10 grid md:grid-cols-[1fr_auto] gap-6 items-center" data-testid="drops-locked-banner">
            <div>
              <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">CLUB ACCESS</p>
              <p className="font-display font-extrabold uppercase tracking-tight text-2xl md:text-3xl">
                THESE PIECES AREN'T PUBLIC YET.
              </p>
              <p className="mt-2 text-sm text-smoke max-w-md">
                Join Nalayak Club to access selected drops before everyone else.
              </p>
            </div>
            <Link to="/club" data-testid="drops-join-club-btn" className="bg-ink text-paper px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300 text-center">
              JOIN THE CLUB
            </Link>
          </div>
        </Reveal>
      )}
      {access && (
        <p className="mt-10 text-[11px] tracking-[0.25em] text-smoke" data-testid="drops-access-line">
          CLUB ACCESS ACTIVE — YOU'RE IN FIRST.
        </p>
      )}

      <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {drops.map((p, i) => (
          <DropCard key={p.id} product={p} member={member} index={i} />
        ))}
      </div>
    </main>
  );
}
