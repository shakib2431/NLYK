import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Info, Star, ExternalLink } from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { demoReviews } from '@/data/storeData';

export default function CustomerReviews() {
  const [reviewsList, setReviewsList] = useState(demoReviews);
  const [meta, setMeta] = useState({
    sourceMode: 'community',
    isLiveGoogle: false,
    googleConfigured: false,
    attribution: 'NALAYAK Community Dispatch Archive',
    disclaimer: 'DEMO REVIEWS · PRE-LAUNCH FEEDBACK ARCHIVE',
    placeName: 'NALAYAK STUDIOS',
    googleMapsUrl: null,
    rating: null,
    userRatingsTotal: null,
  });

  const [activeCategory, setActiveCategory] = useState('all');
  const [activeIndex, setActiveIndex] = useState(0);

  // Fetch reviews from backend abstraction endpoint (supports Google Places API & Community Archive)
  useEffect(() => {
    const apiBase = process.env.REACT_APP_BACKEND_URL;
    if (!apiBase) return;

    let isMounted = true;
    fetch(`${apiBase}/api/reviews`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data || !Array.isArray(data.reviews) || data.reviews.length === 0) return;

        setReviewsList(data.reviews);
        setMeta({
          sourceMode: data.source_mode || 'community',
          isLiveGoogle: Boolean(data.is_live_google),
          googleConfigured: Boolean(data.google_configured),
          attribution: data.attribution || 'NALAYAK Community Dispatch Archive',
          disclaimer: data.disclaimer || 'DEMO REVIEWS · PRE-LAUNCH FEEDBACK ARCHIVE',
          placeName: data.place_name || 'NALAYAK STUDIOS',
          googleMapsUrl: data.google_maps_url || null,
          rating: data.rating,
          userRatingsTotal: data.user_ratings_total,
        });
      })
      .catch((err) => {
        console.warn('Customer reviews provider fallback to local archive:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute available categories dynamically
  const categories = useMemo(() => {
    if (meta.isLiveGoogle) {
      return [
        { id: 'all', label: 'ALL GOOGLE REVIEWS' },
        { id: '5star', label: '5-STAR RATED' },
      ];
    }
    return [
      { id: 'all', label: 'ALL DISPATCHES' },
      { id: 'fabric', label: 'FABRIC & WEIGHT' },
      { id: 'fit', label: 'FIT & SILHOUETTE' },
      { id: 'identity', label: 'BRAND IDENTITY' },
      { id: 'print', label: 'PRINT QUALITY' },
    ];
  }, [meta.isLiveGoogle]);

  // Filter reviews based on active category
  const filteredReviews = useMemo(() => {
    if (activeCategory === 'all') return reviewsList;
    if (meta.isLiveGoogle && activeCategory === '5star') {
      return reviewsList.filter((r) => r.rating === 5);
    }
    return reviewsList.filter((r) => r.category === activeCategory);
  }, [reviewsList, activeCategory, meta.isLiveGoogle]);

  // Reset activeIndex when category changes
  useEffect(() => {
    setActiveIndex(0);
  }, [activeCategory]);

  const activeReview = filteredReviews[activeIndex] || filteredReviews[0] || reviewsList[0];

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev === 0 ? filteredReviews.length - 1 : prev - 1));
  }, [filteredReviews.length]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev === filteredReviews.length - 1 ? 0 : prev + 1));
  }, [filteredReviews.length]);

  // Keyboard navigation support (ArrowLeft / ArrowRight)
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  };

  // Secondary companion reviews in the active slice
  const secondaryReviews = filteredReviews.filter((r) => r.id !== activeReview.id).slice(0, 3);

  return (
    <section
      className="py-20 md:py-32 px-4 md:px-8 max-w-[1600px] mx-auto border-t border-line bg-paper"
      data-testid="customer-reviews-section"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Customer Reviews and Testimonials"
    >
      {/* Editorial Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 md:mb-16 border-b border-line pb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2 h-2 bg-ink" />
            <p className="text-[11px] tracking-[0.3em] text-smoke uppercase font-medium">
              {meta.isLiveGoogle ? 'GOOGLE MAPS // VERIFIED FEEDBACK' : 'COMMUNITY VERBATIM // DISPATCH ARCHIVE'}
            </p>
          </div>
          <h2 className="font-display font-black uppercase tracking-tight leading-[0.88] text-4xl sm:text-6xl md:text-7xl text-ink">
            THE CROWD HAS SPOKEN.
          </h2>
          <p className="mt-4 text-sm md:text-base text-smoke max-w-lg leading-relaxed">
            No hype from us. Hear it from the people wearing it.
          </p>
        </div>

        {/* Trust Disclosure Badge / Google Verification Pill */}
        <div className="flex flex-col sm:items-end gap-3">
          {meta.isLiveGoogle ? (
            <a
              href={meta.googleMapsUrl || 'https://maps.google.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-ink bg-white text-[10px] tracking-[0.25em] text-ink uppercase hover:bg-ink hover:text-paper transition-colors group self-start sm:self-auto"
              data-testid="reviews-trust-badge"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>GOOGLE VERIFIED REVIEWS · POWERED BY GOOGLE</span>
              <ExternalLink size={11} className="transition-transform group-hover:translate-x-0.5" />
            </a>
          ) : (
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-line bg-white text-[10px] tracking-[0.25em] text-smoke uppercase self-start sm:self-auto"
              data-testid="reviews-trust-badge"
            >
              <Info size={13} className="text-ink shrink-0" />
              <span>DEMO REVIEWS · PRE-LAUNCH FEEDBACK ARCHIVE</span>
            </div>
          )}

          <p className="text-[11px] text-smoke/70 max-w-xs text-left sm:text-right leading-normal">
            {meta.isLiveGoogle
              ? (meta.rating
                  ? `★ ${meta.rating.toFixed(1)} rating across ${meta.userRatingsTotal || 0} reviews on Google Maps.`
                  : 'Verified reviews imported via Google Places API.')
              : 'Early feedback collected from studio wearers and test batches. Zero fabricated ratings.'}
          </p>
        </div>
      </div>

      {/* Category Filter Bar & Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-line/60">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Review categories">
          {categories.map((c) => {
            const active = activeCategory === c.id;
            const count = c.id === 'all'
              ? reviewsList.length
              : meta.isLiveGoogle && c.id === '5star'
              ? reviewsList.filter((r) => r.rating === 5).length
              : reviewsList.filter((r) => r.category === c.id).length;

            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveCategory(c.id)}
                data-testid={`reviews-filter-${c.id}`}
                className={`text-[10px] tracking-[0.2em] uppercase px-3 py-2 border transition-all duration-200 ${
                  active
                    ? 'border-ink bg-ink text-paper font-semibold shadow-sm'
                    : 'border-line bg-white/60 text-smoke hover:text-ink hover:border-ink/50'
                }`}
              >
                {c.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Carousel / Navigation Controls */}
        <div className="flex items-center gap-4 self-end sm:self-auto">
          <span className="text-xs font-mono tracking-widest text-smoke" data-testid="reviews-counter">
            {String(activeIndex + 1).padStart(2, '0')} / {String(filteredReviews.length).padStart(2, '0')}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrev}
              data-testid="reviews-prev-btn"
              aria-label="Previous testimonial"
              className="p-2.5 border border-line bg-white text-ink hover:bg-ink hover:text-paper hover:border-ink transition-colors duration-200"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              data-testid="reviews-next-btn"
              aria-label="Next testimonial"
              className="p-2.5 border border-line bg-white text-ink hover:bg-ink hover:text-paper hover:border-ink transition-colors duration-200"
            >
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Asymmetric Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        {/* Dominant Featured Testimonial (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col">
          <Reveal>
            <article
              className="border border-ink bg-white p-6 sm:p-10 md:p-12 relative flex flex-col justify-between h-full shadow-[0_12px_40px_rgba(0,0,0,0.03)]"
              data-testid="featured-review-card"
            >
              {/* Giant Background Watermark Quotation Mark */}
              <div
                className="absolute -bottom-10 right-4 text-ink/[0.04] pointer-events-none select-none font-serif text-[180px] md:text-[240px] leading-none"
                aria-hidden="true"
              >
                “
              </div>

              <div>
                {/* Card Top Meta */}
                <div className="flex items-center justify-between gap-4 border-b border-line pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="bg-ink text-paper text-[9px] tracking-[0.25em] font-bold px-2.5 py-1 uppercase">
                      {activeReview.categoryLabel || activeReview.category_label || (meta.isLiveGoogle ? 'GOOGLE VERIFIED' : 'COMMUNITY')}
                    </span>
                    {activeReview.batch && (
                      <span className="text-[10px] tracking-[0.15em] text-smoke uppercase font-mono">
                        {activeReview.batch}
                      </span>
                    )}
                  </div>

                  {/* Rating Stars for Verified Reviews */}
                  {activeReview.rating ? (
                    <div
                      className="flex items-center gap-1 text-ink"
                      aria-label={`${activeReview.rating} out of 5 stars`}
                    >
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < activeReview.rating ? 'fill-ink text-ink' : 'text-line'}
                        />
                      ))}
                      <span className="text-[10px] font-mono ml-1 text-smoke font-bold">
                        {activeReview.rating}.0
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] tracking-[0.2em] text-smoke font-mono uppercase">
                      DISPATCH #{activeReview.id.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Oversized Editorial Highlight */}
                <h3 className="font-display font-black uppercase tracking-tight text-2xl sm:text-3xl md:text-4xl text-ink leading-[1.08] mb-6">
                  “{activeReview.highlight}”
                </h3>

                {/* Full Verbatim Review Copy */}
                <blockquote className="text-base sm:text-lg md:text-xl text-ink/85 leading-relaxed font-sans font-normal relative z-10">
                  <p>“{activeReview.quote}”</p>
                </blockquote>
              </div>

              {/* Technical Spec & Garment Detail Strip */}
              <div className="mt-8 pt-6 border-t border-line">
                {activeReview.piece ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-[9px] tracking-[0.25em] text-smoke uppercase">TESTED PIECE</p>
                      <p className="text-xs font-semibold text-ink mt-0.5 uppercase tracking-wide">
                        {activeReview.piece}
                      </p>
                      {activeReview.variant && (
                        <p className="text-[11px] text-smoke">{activeReview.variant}</p>
                      )}
                    </div>
                    {activeReview.specs && activeReview.specs.map((spec, sIdx) => (
                      <div key={sIdx}>
                        <p className="text-[9px] tracking-[0.25em] text-smoke uppercase">{spec.label}</p>
                        <p className="text-xs font-semibold text-ink mt-0.5 tracking-wide uppercase">
                          {spec.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : activeReview.specs && activeReview.specs.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                    {activeReview.specs.map((spec, sIdx) => (
                      <div key={sIdx}>
                        <p className="text-[9px] tracking-[0.25em] text-smoke uppercase">{spec.label}</p>
                        <p className="text-xs font-semibold text-ink mt-0.5 tracking-wide uppercase">
                          {spec.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Author Attribution */}
                <div className="flex items-center justify-between pt-4 border-t border-line/60">
                  <div className="flex items-center gap-3">
                    {activeReview.avatar_url ? (
                      <img
                        src={activeReview.avatar_url}
                        alt={activeReview.author}
                        className="w-10 h-10 object-cover border border-line"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-ink text-paper font-display font-bold flex items-center justify-center text-sm tracking-wider">
                        {activeReview.initials || 'NV'}
                      </div>
                    )}
                    <div>
                      <p className="font-display font-extrabold text-sm sm:text-base text-ink tracking-tight uppercase">
                        {activeReview.author}
                      </p>
                      <p className="text-[11px] tracking-[0.15em] text-smoke uppercase font-mono">
                        {activeReview.location || (meta.isLiveGoogle ? 'Google Maps Reviewer' : 'Kolkata, WB')}
                      </p>
                    </div>
                  </div>

                  {activeReview.attribution_url ? (
                    <a
                      href={activeReview.attribution_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono tracking-widest text-ink hover:underline uppercase inline-flex items-center gap-1"
                    >
                      <span>VIEW ON GOOGLE</span>
                      <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span className="text-[10px] font-mono tracking-widest text-smoke uppercase">
                      LOGGED: {activeReview.date}
                    </span>
                  )}
                </div>
              </div>
            </article>
          </Reveal>
        </div>

        {/* Secondary Reviews Column (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between text-[10px] tracking-[0.25em] text-smoke uppercase mb-1">
            <span>{meta.isLiveGoogle ? 'CURATED GOOGLE FEEDBACK' : 'CURATED COMMUNITY DISPATCHES'}</span>
            <span className="hidden sm:inline">SELECT TO FEATURE →</span>
          </div>

          {secondaryReviews.map((rev, idx) => (
            <Reveal key={rev.id} delay={0.1 + idx * 0.08}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  const targetIdx = filteredReviews.findIndex((r) => r.id === rev.id);
                  if (targetIdx !== -1) setActiveIndex(targetIdx);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const targetIdx = filteredReviews.findIndex((r) => r.id === rev.id);
                    if (targetIdx !== -1) setActiveIndex(targetIdx);
                  }
                }}
                data-testid={`secondary-review-${rev.id}`}
                className="group border border-line bg-white p-5 sm:p-6 hover:border-ink transition-all duration-300 cursor-pointer relative overflow-hidden text-left"
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-[9px] tracking-[0.2em] font-semibold text-smoke uppercase">
                    {rev.categoryLabel || rev.category_label || (meta.isLiveGoogle ? 'GOOGLE VERIFIED' : 'COMMUNITY')}
                  </span>
                  {rev.rating ? (
                    <div className="flex items-center gap-0.5 text-ink">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} size={10} className="fill-ink text-ink" />
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-smoke/70 uppercase">
                      #{rev.id.toUpperCase()}
                    </span>
                  )}
                </div>

                <h4 className="font-display font-extrabold uppercase text-sm sm:text-base text-ink tracking-tight leading-snug mb-2 group-hover:text-ink transition-colors">
                  “{rev.highlight}”
                </h4>

                <p className="text-xs sm:text-sm text-ink/75 leading-relaxed line-clamp-3 mb-4">
                  “{rev.quote}”
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-line/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink uppercase text-[11px]">{rev.author}</span>
                    <span className="text-smoke text-[10px]">·</span>
                    <span className="text-smoke text-[10px] font-mono uppercase">
                      {rev.location || (meta.isLiveGoogle ? 'Google Review' : 'Community')}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-ink group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    FEATURE ↗
                  </span>
                </div>
              </div>
            </Reveal>
          ))}

          {/* Editorial Atelier Ethos Quote Banner */}
          <div className="border border-ink/20 bg-line/20 p-5 mt-auto">
            <p className="text-[10px] tracking-[0.25em] text-smoke uppercase mb-1">
              THE WRONG CROWD COMMITMENT
            </p>
            <p className="font-display font-bold text-xs sm:text-sm text-ink uppercase tracking-tight leading-snug">
              Every drop is small on purpose. Every critique informs the next pattern.
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] text-smoke">
                {meta.isLiveGoogle ? 'Reviewed our pieces on Google?' : 'Got thoughts on a piece?'}
              </span>
              {meta.isLiveGoogle && meta.googleMapsUrl ? (
                <a
                  href={meta.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] tracking-[0.2em] font-bold text-ink hover:underline uppercase inline-flex items-center gap-1"
                >
                  WRITE A GOOGLE REVIEW ↗
                </a>
              ) : (
                <Link
                  to="/contact"
                  className="text-[10px] tracking-[0.2em] font-bold text-ink hover:underline uppercase inline-flex items-center gap-1"
                >
                  SUBMIT ATELIER FEEDBACK →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
