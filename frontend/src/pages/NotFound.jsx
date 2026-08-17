import { Link } from 'react-router-dom';
import { useSeo } from '@/hooks/useSeo';

export default function NotFound() {
  useSeo('404', 'This page does not exist.');
  return (
    <main className="px-4 md:px-8 py-32 md:py-44 text-center" data-testid="not-found-page">
      <p className="text-[11px] tracking-[0.35em] text-smoke mb-4">ERROR 404</p>
      <h1 className="font-display font-black uppercase tracking-tighter leading-[0.85] text-[18vw] md:text-[10vw]">
        WRONG TURN.
      </h1>
      <p className="mt-6 text-smoke text-sm md:text-base">This page doesn't exist. Very on-brand for you.</p>
      <Link
        to="/"
        data-testid="not-found-home-btn"
        className="inline-block mt-10 bg-ink text-paper px-10 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300"
      >
        BACK TO SAFETY
      </Link>
    </main>
  );
}
