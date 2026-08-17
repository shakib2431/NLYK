import { Link } from 'react-router-dom';

export default function SectionHeader({ kicker, title, desc, linkTo, linkLabel }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 mb-10 md:mb-14">
      <div>
        {kicker && (
          <p className="text-[11px] tracking-[0.3em] text-smoke mb-3 font-medium">{kicker}</p>
        )}
        <h2 className="font-display font-800 uppercase tracking-tight leading-[0.9] text-4xl md:text-6xl font-extrabold">
          {title}
        </h2>
        {desc && <p className="mt-3 text-sm md:text-base text-smoke max-w-md">{desc}</p>}
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          data-testid={`section-${(linkLabel || 'link').toLowerCase().replace(/\s+/g, '-')}`}
          className="group text-[11px] tracking-[0.25em] font-medium border-b border-ink pb-1 hover:text-smoke hover:border-smoke transition-colors duration-300"
        >
          {linkLabel}
          <span className="inline-block transition-transform duration-300 group-hover:translate-x-1 ml-1">→</span>
        </Link>
      )}
    </div>
  );
}
