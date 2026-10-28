import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  ArrowDown,
  ArrowRight,
  X,
  MessageSquarePlus,
  CheckCircle2,
  ChevronDown,
  User,
  Shirt,
  Mail,
  FileText,
  PenLine,
} from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import SafeImg from '@/components/SafeImg';
import { products } from '@/data/storeData';

// Coordinated Streetwear Editorial Color Palette
// Calibrated for high-contrast accessibility & youthful streetwear energy
const CARD_THEMES = [
  {
    bg: '#D8FF62', // Electric Lime
    textColor: '#111111',
    mutedColor: 'rgba(17, 17, 17, 0.72)',
    starColor: '#111111',
    pillBg: '#111111',
    pillText: '#D8FF62',
    badgeBg: 'rgba(17, 17, 17, 0.1)',
    border: 'rgba(17, 17, 17, 0.14)',
    accentName: 'ELECTRIC LIME',
  },
  {
    bg: '#83E7B2', // Mint Green
    textColor: '#111111',
    mutedColor: 'rgba(17, 17, 17, 0.72)',
    starColor: '#111111',
    pillBg: '#111111',
    pillText: '#83E7B2',
    badgeBg: 'rgba(17, 17, 17, 0.1)',
    border: 'rgba(17, 17, 17, 0.14)',
    accentName: 'MINT GREEN',
  },
  {
    bg: '#FF9678', // Coral Orange
    textColor: '#111111',
    mutedColor: 'rgba(17, 17, 17, 0.74)',
    starColor: '#111111',
    pillBg: '#111111',
    pillText: '#FFFFFF',
    badgeBg: 'rgba(17, 17, 17, 0.1)',
    border: 'rgba(17, 17, 17, 0.14)',
    accentName: 'CORAL ORANGE',
  },
  {
    bg: '#8DE4F5', // Sky Blue
    textColor: '#111111',
    mutedColor: 'rgba(17, 17, 17, 0.72)',
    starColor: '#111111',
    pillBg: '#111111',
    pillText: '#8DE4F5',
    badgeBg: 'rgba(17, 17, 17, 0.1)',
    border: 'rgba(17, 17, 17, 0.14)',
    accentName: 'SKY BLUE',
  },
  {
    bg: '#FF78AD', // Bubblegum Pink
    textColor: '#111111',
    mutedColor: 'rgba(17, 17, 17, 0.74)',
    starColor: '#111111',
    pillBg: '#111111',
    pillText: '#FF78AD',
    badgeBg: 'rgba(17, 17, 17, 0.1)',
    border: 'rgba(17, 17, 17, 0.14)',
    accentName: 'BUBBLEGUM PINK',
  },
  {
    bg: '#F5E9D8', // Warm Cream
    textColor: '#111111',
    mutedColor: 'rgba(17, 17, 17, 0.72)',
    starColor: '#A70F20',
    pillBg: '#A70F20',
    pillText: '#FFFFFF',
    badgeBg: 'rgba(167, 15, 32, 0.12)',
    border: 'rgba(17, 17, 17, 0.14)',
    accentName: 'WARM CREAM',
  },
  {
    bg: '#A70F20', // Deep NALAYAK Red
    textColor: '#FFFFFF',
    mutedColor: 'rgba(255, 255, 255, 0.82)',
    starColor: '#FFE066',
    pillBg: '#FFFFFF',
    pillText: '#A70F20',
    badgeBg: 'rgba(255, 255, 255, 0.18)',
    border: 'rgba(255, 255, 255, 0.18)',
    accentName: 'NALAYAK RED',
  },
  {
    bg: '#151515', // Ink Black
    textColor: '#F5E9D8',
    mutedColor: 'rgba(245, 233, 216, 0.75)',
    starColor: '#D8FF62',
    pillBg: '#D8FF62',
    pillText: '#151515',
    badgeBg: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(255, 255, 255, 0.15)',
    accentName: 'INK BLACK',
  },
];

export default function CustomerReviews() {
  const [reviewsList, setReviewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(6);

  const [meta, setMeta] = useState({
    sourceMode: 'community',
    isLiveGoogle: false,
    googleConfigured: false,
    attribution: 'NALAYAK Verified Dispatches',
    disclaimer: 'VERIFIED CUSTOMER & ATELIER DISPATCHES',
    placeName: 'NALAYAK STUDIOS',
    googleMapsUrl: null,
    rating: null,
    userRatingsTotal: null,
  });

  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedReview, setSelectedReview] = useState(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [customPieceInput, setCustomPieceInput] = useState(false);

  const [feedbackForm, setFeedbackForm] = useState({
    name: '',
    email: '',
    piece: 'General Atelier Experience',
    customPiece: '',
    rating: 5,
    highlight: '',
    quote: '',
  });

  // Re-usable review fetching logic from persistent backend API
  const fetchReviews = useCallback(() => {
    const apiBase = process.env.REACT_APP_BACKEND_URL || '';
    setLoading(true);
    setFetchError(null);

    fetch(`${apiBase}/api/reviews`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data?.reviews) ? data.reviews : [];
        setReviewsList(list);
        setMeta({
          sourceMode: data?.source_mode || 'community',
          isLiveGoogle: Boolean(data?.is_live_google),
          googleConfigured: Boolean(data?.google_configured),
          attribution: data?.attribution || 'NALAYAK Verified Dispatches',
          disclaimer: data?.disclaimer || 'VERIFIED CUSTOMER & ATELIER DISPATCHES',
          placeName: data?.place_name || 'NALAYAK STUDIOS',
          googleMapsUrl: data?.google_maps_url || null,
          rating: data?.rating,
          userRatingsTotal: data?.user_ratings_total,
        });
      })
      .catch((err) => {
        console.warn('Customer reviews fetch error:', err);
        setFetchError('Unable to load reviews right now.');
        setReviewsList([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Determine whether a review is genuinely associated with a specific product
  const isProductReview = useCallback((rev) => {
    // Google reviews are NEVER forced into product variants
    if (rev.source === 'google') return false;
    if (!rev.piece) return false;
    const pieceLower = rev.piece.toLowerCase();
    if (pieceLower.includes('general') || pieceLower.includes('atelier experience')) {
      return false;
    }
    // Check if review has an image or matches a catalog product with images
    if (rev.image || rev.photo_url || rev.photo) return true;
    if (rev.productSlug || rev.product_slug) return true;
    const found = products.find(
      (p) => p.name.toLowerCase() === pieceLower || p.slug.toLowerCase() === pieceLower
    );
    return Boolean(found && found.images && found.images.length > 0);
  }, []);

  // Resolve best genuine product image for product-specific reviews
  const getProductImage = useCallback((rev) => {
    if (rev.image) return rev.image;
    if (rev.photo_url) return rev.photo_url;
    if (rev.photo) return rev.photo;

    const slug = rev.productSlug || rev.product_slug;
    if (slug) {
      const found = products.find((p) => p.slug === slug);
      if (found && found.images && found.images[0]) return found.images[0];
    }

    if (rev.piece) {
      const match = products.find(
        (p) => p.name.toLowerCase() === rev.piece.toLowerCase() || p.slug === rev.piece.toLowerCase()
      );
      if (match && match.images && match.images[0]) return match.images[0];
    }

    return null;
  }, []);

  // Resolve product URL for product-specific review
  const getProductUrl = useCallback((rev) => {
    if (rev.source === 'google') return null;
    const slug = rev.productSlug || rev.product_slug;
    if (slug) return `/product/${slug}`;

    if (rev.piece) {
      const found = products.find(
        (p) =>
          p.name.toLowerCase() === rev.piece.toLowerCase() ||
          p.slug.toLowerCase().includes(rev.piece.toLowerCase().replace(/\s+/g, '-'))
      );
      if (found) return `/product/${found.slug}`;
    }
    return null;
  }, []);

  // Compute available categories dynamically from genuine loaded reviews
  const categories = useMemo(() => {
    const list = [{ id: 'all', label: 'ALL DISPATCHES' }];
    const hasProductReviews = reviewsList.some((r) => isProductReview(r));
    const hasGoogleReviews = reviewsList.some((r) => r.source === 'google');
    const has5Star = reviewsList.some((r) => r.rating === 5);

    if (hasProductReviews) {
      list.push({ id: 'product', label: 'PRODUCT FITS' });
    }
    if (hasGoogleReviews || meta.isLiveGoogle) {
      list.push({ id: 'google', label: 'GOOGLE REVIEWS' });
    }
    if (has5Star) {
      list.push({ id: '5star', label: '5-STAR ONLY' });
    }
    return list;
  }, [reviewsList, meta.isLiveGoogle, isProductReview]);

  // Filter reviews based on active category
  const filteredReviews = useMemo(() => {
    if (activeCategory === 'all') return reviewsList;
    if (activeCategory === 'product') {
      return reviewsList.filter((r) => isProductReview(r));
    }
    if (activeCategory === 'google') {
      return reviewsList.filter((r) => r.source === 'google');
    }
    if (activeCategory === '5star') {
      return reviewsList.filter((r) => r.rating === 5);
    }
    return reviewsList.filter((r) => r.category === activeCategory);
  }, [reviewsList, activeCategory, isProductReview]);

  // Sliced reviews for "Load More" pagination
  const displayedReviews = useMemo(() => {
    return filteredReviews.slice(0, visibleCount);
  }, [filteredReviews, visibleCount]);

  // Reset pagination when category changes
  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    setVisibleCount(6);
  };

  // Handle escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedReview(null);
        setIsFeedbackModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const cleanName = feedbackForm.name.trim();
    const resolvedPiece = customPieceInput
      ? feedbackForm.customPiece.trim()
      : feedbackForm.piece.trim();
    const cleanHighlight = feedbackForm.highlight.trim();
    const cleanQuote = feedbackForm.quote.trim();
    const cleanEmail = feedbackForm.email.trim();

    // Frontend validation
    if (!cleanName || cleanName.length < 2) {
      setSubmitError('Please enter your name or initials (at least 2 characters).');
      return;
    }
    if (!cleanQuote || cleanQuote.length < 10) {
      setSubmitError('Please write at least 10 characters of feedback.');
      return;
    }

    setSubmitting(true);
    const apiBase = process.env.REACT_APP_BACKEND_URL || '';

    try {
      const res = await fetch(`${apiBase}/api/reviews/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail || undefined,
          piece: resolvedPiece || 'General Atelier Experience',
          rating: Number(feedbackForm.rating) || 5,
          highlight: cleanHighlight || undefined,
          quote: cleanQuote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Submission failed. Please check your inputs and try again.');
      }

      setFeedbackSubmitted(true);
      fetchReviews(); // Immediately refresh reviews so it appears live right away

      setTimeout(() => {
        setFeedbackSubmitted(false);
        setIsFeedbackModalOpen(false);
        setFeedbackForm({
          name: '',
          email: '',
          piece: 'General Atelier Experience',
          customPiece: '',
          rating: 5,
          highlight: '',
          quote: '',
        });
        setCustomPieceInput(false);
        fetchReviews();
      }, 2000);
    } catch (err) {
      setSubmitError(err.message || 'Network error submitting review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="py-8 md:py-12 px-4 md:px-8 max-w-[1600px] mx-auto border-t border-line bg-paper"
      data-testid="customer-reviews-section"
      aria-label="Customer Reviews and Verbatim Dispatches"
    >
      {/* ── 1. SECTION EDITORIAL HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6 md:mb-8 border-b border-line pb-5">
        <div>
          {/* Punchy Streetwear Editorial Heading */}
          <h2 className="font-display font-black uppercase tracking-tight leading-[0.88] text-4xl sm:text-6xl md:text-7xl text-ink">
            REAL PEOPLE. UNREAL FITS.
          </h2>
        </div>

        {/* Right Header: Google Trust Pill or Community Status */}
        <div className="flex flex-col sm:items-end gap-3 self-start lg:self-end">
          {meta.isLiveGoogle ? (
            <div className="flex flex-col sm:items-end gap-1.5">
              <a
                href={meta.googleMapsUrl || 'https://maps.google.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-ink bg-white text-[10px] tracking-[0.25em] text-ink uppercase hover:bg-ink hover:text-paper transition-colors group shadow-sm"
                data-testid="reviews-trust-badge"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold">GOOGLE BUSINESS REVIEWS</span>
                <ExternalLink size={11} className="transition-transform group-hover:translate-x-0.5" />
              </a>
              {meta.rating && (
                <p className="text-[11px] font-mono text-smoke">
                  ★ {meta.rating.toFixed(1)} AVERAGE ACROSS {meta.userRatingsTotal || 0} REVIEWS
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSubmitError('');
                  setIsFeedbackModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-ink bg-ink text-paper text-[10px] tracking-widest uppercase font-bold hover:bg-neutral-800 transition-colors shadow-sm"
              >
                <MessageSquarePlus size={12} />
                <span>LEAVE FEEDBACK</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. CATEGORY FILTER BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-line/60">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Review categories">
          {categories.map((c) => {
            const active = activeCategory === c.id;
            const count =
              c.id === 'all'
                ? reviewsList.length
                : c.id === 'product'
                ? reviewsList.filter((r) => isProductReview(r)).length
                : c.id === 'google'
                ? reviewsList.filter((r) => r.source === 'google').length
                : c.id === '5star'
                ? reviewsList.filter((r) => r.rating === 5).length
                : reviewsList.filter((r) => r.category === c.id).length;

            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={active}
                onClick={() => handleCategoryChange(c.id)}
                data-testid={`reviews-filter-${c.id}`}
                className={`text-[10px] tracking-[0.2em] uppercase px-3 py-2 border transition-all duration-200 ${
                  active
                    ? 'border-ink bg-ink text-paper font-semibold shadow-sm'
                    : 'border-line bg-white/70 text-smoke hover:text-ink hover:border-ink/50'
                }`}
              >
                {c.label} ({count})
              </button>
            );
          })}
        </div>


      </div>

      {/* ── 3. REVIEWS GRID OR RESTRAINED EMPTY / LOADING STATE ── */}
      {loading ? (
        /* Loading Skeleton State */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 items-stretch">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl md:rounded-3xl border border-line bg-white/60 p-6 animate-pulse flex flex-col justify-between h-[380px]"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-200" />
                  <div className="space-y-1.5 flex-grow">
                    <div className="h-3 bg-neutral-200 rounded w-24" />
                    <div className="h-2.5 bg-neutral-100 rounded w-32" />
                  </div>
                </div>
                <div className="h-4 bg-neutral-200 rounded w-3/4" />
                <div className="space-y-2">
                  <div className="h-3 bg-neutral-100 rounded w-full" />
                  <div className="h-3 bg-neutral-100 rounded w-5/6" />
                </div>
              </div>
              <div className="h-8 bg-neutral-200 rounded-full w-28 mt-4" />
            </div>
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        /* Restrained, Authentic Empty State */
        <div className="py-16 text-center border border-dashed border-line rounded-3xl p-8 bg-white/50 max-w-2xl mx-auto">
          <div className="w-12 h-12 mx-auto rounded-full bg-ink/5 flex items-center justify-center mb-4">
            <span className="font-serif text-ink text-xl">✦</span>
          </div>
          <h3 className="font-display font-black text-xl uppercase tracking-tight text-ink mb-2">
            NO PUBLISHED DISPATCHES YET
          </h3>
          <p className="text-sm text-smoke max-w-md mx-auto mb-6 leading-relaxed">
            All customer submissions are verified and reviewed by the atelier before publishing to the community archive. Have a piece from NALAYAK? Be the first to share your fit experience.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitError('');
              setIsFeedbackModalOpen(true);
            }}
            className="px-5 py-2.5 bg-ink text-paper text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors shadow-sm inline-flex items-center gap-2"
          >
            <MessageSquarePlus size={13} />
            <span>SHARE YOUR FIT EXPERIENCE</span>
          </button>
        </div>
      ) : (
        /* Review Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 items-stretch">
          {displayedReviews.map((review, index) => {
            const hasProduct = isProductReview(review);
            const theme = CARD_THEMES[index % CARD_THEMES.length];
            const imageSrc = hasProduct ? getProductImage(review) : null;
            const productLink = hasProduct ? getProductUrl(review) : null;
            const isGoogle = review.source === 'google';

            return (
              <Reveal key={review.id} delay={0.05 + (index % 3) * 0.08}>
                <article
                  className="group relative flex flex-col h-full rounded-2xl md:rounded-3xl overflow-hidden border border-line bg-white shadow-sm hover:shadow-xl transition-all duration-300 ease-out hover:-translate-y-1.5 focus-within:ring-2 focus-within:ring-ink"
                  data-testid={`review-card-${review.id}`}
                >
                  {/* ── CARD VARIANT 1: PRODUCT-SPECIFIC CUSTOMER REVIEW ── */}
                  {hasProduct && imageSrc ? (
                    <>
                      {/* UPPER HALF: GENUINE PRODUCT PHOTOGRAPHY */}
                      <div className="relative aspect-[4/3] sm:aspect-[16/11] overflow-hidden bg-neutral-900 flex-shrink-0">
                        <SafeImg
                          id={imageSrc}
                          w={900}
                          alt={`${review.author} review for ${review.piece}`}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                        />

                        {/* Gradient overlay for contrast */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/25 pointer-events-none" />

                        {/* Top Floating Badges */}
                        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 z-10 pointer-events-none">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase font-semibold bg-black/75 backdrop-blur-md text-white border border-white/15 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D8FF62]" />
                            {review.tag || review.categoryLabel || 'ATELIER PIECE'}
                          </span>

                          {/* Strictly only show Verified Buyer if confirmed by backend */}
                          {review.is_verified_buyer && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] tracking-wider uppercase font-bold bg-white/95 backdrop-blur-md text-ink shadow-sm">
                              <Sparkles size={11} className="text-[#A70F20]" />
                              <span>VERIFIED BUYER</span>
                            </span>
                          )}
                        </div>

                        {/* Hover Quick-Inspect Pill */}
                        <button
                          type="button"
                          onClick={() => setSelectedReview(review)}
                          aria-label={`Inspect full review by ${review.author}`}
                          className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wider uppercase font-bold bg-white text-ink shadow-lg hover:bg-ink hover:text-white"
                        >
                          <span>SPECS & VERBATIM</span>
                          <ArrowUpRight size={11} />
                        </button>
                      </div>

                      {/* LOWER HALF: VIBRANT EDITORIAL COLOUR BLOCK */}
                      <div
                        className="p-5 sm:p-6 md:p-7 flex flex-col justify-between flex-grow transition-colors duration-200"
                        style={{
                          backgroundColor: theme.bg,
                          color: theme.textColor,
                        }}
                      >
                        <div>
                          {/* Customer Identity Row */}
                          <div
                            className="flex items-center justify-between gap-3 pb-3 border-b"
                            style={{ borderColor: theme.border }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {review.avatar_url ? (
                                <SafeImg
                                  id={review.avatar_url}
                                  w={100}
                                  alt={review.author}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-black/15 shadow-sm flex-shrink-0"
                                />
                              ) : (
                                <div
                                  className="w-10 h-10 rounded-full font-display font-black text-xs flex items-center justify-center border-2 border-black/15 shadow-sm flex-shrink-0"
                                  style={{ backgroundColor: theme.pillBg, color: theme.pillText }}
                                >
                                  {review.initials || 'NV'}
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-display font-black text-sm uppercase tracking-tight truncate leading-tight">
                                    {review.author}
                                  </h4>
                                  {review.is_verified_buyer && (
                                    <ShieldCheck size={13} className="flex-shrink-0 opacity-80" />
                                  )}
                                </div>
                                <p
                                  className="text-[11px] font-mono tracking-wide truncate mt-0.5"
                                  style={{ color: theme.mutedColor }}
                                >
                                  {review.location || 'Community Review'} · {review.date || 'RECENT'}
                                </p>
                              </div>
                            </div>

                            <div
                              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border shadow-xs"
                              style={{
                                borderColor: theme.border,
                                backgroundColor: theme.badgeBg,
                                color: theme.textColor,
                              }}
                              title="NALAYAK Atelier Verbatim"
                            >
                              <span className="font-serif text-sm leading-none select-none">✦</span>
                            </div>
                          </div>

                          {/* Star Rating */}
                          <div className="flex items-center gap-1 mt-3.5 mb-2.5" aria-label={`${review.rating || 5} out of 5 stars`}>
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={13}
                                className={i < (review.rating || 5) ? 'fill-current' : 'opacity-25'}
                                style={{ color: theme.starColor }}
                              />
                            ))}
                            <span className="text-xs font-mono font-bold ml-1 tracking-tight">
                              {(review.rating || 5)}.0
                            </span>
                          </div>

                          {/* Editorial Headline */}
                          {review.highlight && (
                            <h3 className="font-display font-black uppercase text-base sm:text-lg tracking-tight leading-snug line-clamp-2 mb-2">
                              “{review.highlight}”
                            </h3>
                          )}

                          {/* Authentic Review Excerpt */}
                          <blockquote
                            className="text-xs sm:text-sm leading-relaxed line-clamp-3 mb-5 font-normal"
                            style={{ color: theme.textColor }}
                          >
                            “{review.quote}”
                          </blockquote>
                        </div>

                        {/* Bottom Garment Link & Full Details Button */}
                        <div
                          className="pt-3 border-t flex items-center justify-between gap-2 text-xs"
                          style={{ borderColor: theme.border }}
                        >
                          {productLink ? (
                            <Link
                              to={productLink}
                              className="group/link inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 shadow-sm"
                              style={{
                                backgroundColor: theme.pillBg,
                                color: theme.pillText,
                              }}
                            >
                              <span className="truncate max-w-[170px] sm:max-w-[200px]">
                                {review.piece}
                              </span>
                              <ArrowUpRight
                                size={11}
                                className="transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                              />
                            </Link>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                              style={{
                                backgroundColor: theme.badgeBg,
                                color: theme.textColor,
                              }}
                            >
                              {review.piece || 'ATELIER FIT'}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedReview(review)}
                            className="text-[10px] font-mono tracking-wider uppercase font-semibold underline underline-offset-4 hover:opacity-75 transition-opacity"
                            style={{ color: theme.textColor }}
                          >
                            FULL DETAILS
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* ── CARD VARIANT 2: UNIVERSAL REVIEW (GOOGLE BUSINESS / GENERAL BRAND) ── */
                    <div className="p-6 sm:p-7 flex flex-col justify-between flex-grow bg-white">
                      <div>
                        {/* Header: Reviewer Identity & Source Badge */}
                        <div className="flex items-center justify-between gap-3 pb-4 border-b border-line/70">
                          <div className="flex items-center gap-3 min-w-0">
                            {review.avatar_url ? (
                              <img
                                src={review.avatar_url}
                                alt={review.author}
                                className="w-10 h-10 rounded-full object-cover border border-line shadow-xs flex-shrink-0"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-ink text-paper font-display font-black text-xs flex items-center justify-center border border-ink shadow-xs flex-shrink-0">
                                {review.initials || 'GV'}
                              </div>
                            )}

                            <div className="min-w-0">
                              <h4 className="font-display font-black text-sm uppercase tracking-tight truncate leading-tight text-ink">
                                {review.author}
                              </h4>
                              <p className="text-[11px] font-mono text-smoke tracking-wide truncate mt-0.5">
                                {review.date || 'RECENT'}
                              </p>
                            </div>
                          </div>

                          {/* Source Attribution Badge */}
                          {isGoogle ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200">
                              <span className="font-serif font-black text-xs">G</span>
                              <span>GOOGLE</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-neutral-100 text-ink border border-line">
                              <span>✦ ATELIER</span>
                            </span>
                          )}
                        </div>

                        {/* Rating Row */}
                        <div className="flex items-center gap-1 mt-4 mb-3" aria-label={`${review.rating || 5} out of 5 stars`}>
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={i < (review.rating || 5) ? 'fill-ink text-ink' : 'text-neutral-200'}
                            />
                          ))}
                          <span className="text-xs font-mono font-bold ml-1.5 text-ink tracking-tight">
                            {(review.rating || 5)}.0 / 5.0
                          </span>
                        </div>

                        {/* Headline if present */}
                        {review.highlight && (
                          <h3 className="font-display font-black uppercase text-base sm:text-lg tracking-tight leading-snug text-ink mb-2">
                            “{review.highlight}”
                          </h3>
                        )}

                        {/* Verbatim Review Quote */}
                        <blockquote className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-normal mb-4 font-sans">
                          “{review.quote}”
                        </blockquote>
                      </div>

                      {/* Universal Card Footer */}
                      <div className="pt-3 border-t border-line/60 flex items-center justify-between text-xs">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-smoke">
                          {isGoogle ? 'VERIFIED GOOGLE BUSINESS REVIEW' : 'ATELIER COMMUNITY DISPATCH'}
                        </span>

                        {isGoogle && (review.attribution_url || meta.googleMapsUrl) ? (
                          <a
                            href={review.attribution_url || meta.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-ink hover:underline"
                          >
                            <span>MAPS</span>
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedReview(review)}
                            className="text-[10px] font-mono uppercase font-semibold text-smoke hover:text-ink hover:underline"
                          >
                            READ FULL
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>
      )}

      {/* ── 4. PAGINATION / LOAD MORE INTERACTION ── */}
      {filteredReviews.length > visibleCount && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 6)}
            className="px-6 py-3 border border-ink bg-ink text-paper text-xs uppercase tracking-widest font-bold hover:bg-neutral-800 transition-colors shadow-sm flex items-center gap-2"
          >
            <span>LOAD MORE DISPATCHES ({visibleCount} OF {filteredReviews.length})</span>
            <ArrowDown size={13} />
          </button>
        </div>
      )}

      {/* ── 5. BRAND ETHOS STRIP & COMMUNITY SUBMISSION BANNER ── */}
      <div className="mt-10 pt-6 border-t border-line flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-serif text-ink text-base">✦</span>
          <p className="text-smoke font-mono tracking-wide text-[11px] uppercase">
            EVERY CRITIQUE INFORMS THE NEXT PATTERN · SMALL RUNS · HEAVYWEIGHT 240–450 GSM
          </p>
        </div>

        <div className="flex items-center gap-4">
          {meta.isLiveGoogle && meta.googleMapsUrl ? (
            <a
              href={meta.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold tracking-widest text-ink hover:underline uppercase inline-flex items-center gap-1"
            >
              <span>WRITE A GOOGLE REVIEW</span>
              <ExternalLink size={11} />
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSubmitError('');
                setIsFeedbackModalOpen(true);
              }}
              className="text-[11px] font-bold tracking-widest text-ink hover:underline uppercase inline-flex items-center gap-1"
            >
              <span>SUBMIT ATELIER VERBATIM →</span>
            </button>
          )}

          <Link
            to="/new-arrivals"
            className="text-[11px] font-bold tracking-widest text-ink hover:underline uppercase inline-flex items-center gap-1"
          >
            <span>EXPLORE NEW ARRIVALS →</span>
          </Link>
        </div>
      </div>

      {/* ── 6. MODAL: DETAILED REVIEW INSPECTION ── */}
      {selectedReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Detailed review from ${selectedReview.author}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedReview(null);
          }}
        >
          <div className="relative w-full max-w-2xl bg-white border border-ink shadow-2xl rounded-2xl md:rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-paper">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-mono tracking-[0.25em] text-ink uppercase font-bold">
                  {selectedReview.source === 'google' ? 'GOOGLE MAPS VERIFIED' : 'ATELIER VERBATIM ARCHIVE'}
                </span>
                {selectedReview.batch && (
                  <span className="text-[10px] font-mono text-smoke uppercase tracking-wider">
                    · {selectedReview.batch}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-ink transition-colors"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-8 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < (selectedReview.rating || 5) ? 'fill-ink text-ink' : 'text-line'}
                  />
                ))}
                <span className="text-xs font-mono font-bold ml-1.5 text-ink">
                  {(selectedReview.rating || 5)}.0 / 5.0
                </span>
              </div>

              {selectedReview.highlight && (
                <h3 className="font-display font-black uppercase text-xl sm:text-2xl text-ink tracking-tight leading-tight mb-2">
                  “{selectedReview.highlight}”
                </h3>
              )}

              {selectedReview.piece && (
                <p className="text-xs font-mono text-smoke uppercase tracking-wider mb-3">
                  PIECE: <strong className="text-ink">{selectedReview.piece}</strong>
                  {selectedReview.variant && ` · ${selectedReview.variant}`}
                </p>
              )}

              {/* Full Unabridged Review */}
              <div className="p-4 sm:p-5 rounded-xl bg-paper border border-line/60 mb-6">
                <p className="text-xs font-mono tracking-widest text-smoke uppercase mb-2">
                  VERBATIM DISPATCH //
                </p>
                <blockquote className="text-sm sm:text-base text-ink leading-relaxed font-sans font-normal">
                  “{selectedReview.quote}”
                </blockquote>
              </div>

              {/* Reviewer Meta Row */}
              <div className="flex items-center justify-between pt-4 border-t border-line">
                <div className="flex items-center gap-3">
                  {selectedReview.avatar_url ? (
                    <img
                      src={selectedReview.avatar_url}
                      alt={selectedReview.author}
                      className="w-10 h-10 rounded-full object-cover border border-line"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-ink text-paper font-display font-bold flex items-center justify-center text-xs">
                      {selectedReview.initials || 'NV'}
                    </div>
                  )}
                  <div>
                    <p className="font-display font-extrabold text-sm uppercase text-ink tracking-tight">
                      {selectedReview.author}
                    </p>
                    <p className="text-[11px] font-mono text-smoke uppercase tracking-wider">
                      {selectedReview.is_verified_buyer ? '✦ Verified Buyer' : 'Community Dispatch'} · {selectedReview.date || 'RECENT'}
                    </p>
                  </div>
                </div>

                {/* Shop Button if product linked */}
                {getProductUrl(selectedReview) ? (
                  <Link
                    to={getProductUrl(selectedReview)}
                    onClick={() => setSelectedReview(null)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-paper text-xs uppercase font-bold tracking-widest hover:bg-neutral-800 transition-colors shadow-sm"
                  >
                    <span>SHOP PIECE</span>
                    <ArrowUpRight size={13} />
                  </Link>
                ) : (
                  <Link
                    to="/new-arrivals"
                    onClick={() => setSelectedReview(null)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-paper text-xs uppercase font-bold tracking-widest hover:bg-neutral-800 transition-colors shadow-sm"
                  >
                    <span>VIEW PIECES</span>
                    <ArrowUpRight size={13} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. MODAL: SUBMIT ATELIER FEEDBACK / WRITE A REVIEW ── */}
      {isFeedbackModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Submit Customer Fit Experience"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFeedbackModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-4xl max-h-[min(94vh,630px)] bg-white border border-neutral-300 shadow-2xl rounded-2xl md:rounded-3xl overflow-hidden flex flex-col md:flex-row my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* ── LEFT COLUMN: STREETWEAR HERO BANNER WITH BRANDED MODEL ── */}
            <div className="relative hidden md:block md:w-[280px] lg:w-[320px] flex-shrink-0 bg-neutral-900 overflow-hidden select-none">
              <img
                src="/reviews-modal-banner.jpg"
                alt="NALAYAK Streetwear Fit"
                className="w-full h-full object-cover object-top scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25 pointer-events-none" />

              {/* Tagged Hotspot Badge on the Model's T-shirt */}
              <div className="absolute bottom-[22%] left-[16%] z-20 group/tag cursor-default">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-[#D8FF62]/80 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:border-[#D8FF62]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D8FF62] animate-pulse" />
                  <span className="text-[9px] font-mono tracking-widest font-black uppercase text-white">
                    ✦ NALAYAK COMPASS TEE
                  </span>
                </div>
              </div>

              {/* Subtle Atelier Coordinates at bottom */}
              <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between text-[8px] font-mono tracking-widest text-white/50 uppercase">
                <span>RAW KOLKATA ATELIER</span>
                <span>HEAVYWEIGHT 240 GSM</span>
              </div>
            </div>

            {/* ── RIGHT COLUMN: EDITORIAL SUBMISSION FORM (COMPACT & SCROLLABLE IF SCREEN IS SHORT) ── */}
            <div className="p-4 sm:p-5 md:p-6 lg:p-7 flex-1 flex flex-col justify-between relative bg-white overflow-y-auto max-h-[min(94vh,630px)]">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 rounded-full hover:bg-neutral-100 text-neutral-800 transition-colors z-10"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              {feedbackSubmitted ? (
                <div className="py-12 text-center my-auto animate-in fade-in">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-neutral-900 mb-1.5">
                    DISPATCH PUBLISHED TO ATELIER WALL
                  </h4>
                  <p className="text-xs sm:text-sm text-neutral-600 max-w-sm mx-auto leading-relaxed">
                    Thanks for keeping it raw. Your review has been added and is now live on the customer review wall!
                  </p>
                </div>
              ) : (
                <>
                  {/* Modal Header */}
                  <div className="pb-2.5 mb-3 border-b border-neutral-200/70 pr-8">
                    <p className="text-[9px] font-mono tracking-[0.25em] text-neutral-500 uppercase font-semibold">
                      NALAYAK ATELIER DISPATCH
                    </p>
                    <h3 className="font-display font-black text-xl sm:text-2xl lg:text-[26px] uppercase tracking-tight text-neutral-950 leading-[1.0] mt-0.5 mb-1">
                      SHARE YOUR{' '}
                      <span className="relative inline-block px-1.5 py-0.5 mx-0.5 text-neutral-950 font-black italic bg-[#D8FF62] rounded-sm transform -skew-x-6">
                        FIT
                      </span>{' '}
                      EXPERIENCE
                    </h3>
                    <p className="text-[11px] text-neutral-500 font-sans leading-tight">
                      Your experience helps the community.
                    </p>
                  </div>

                  <form onSubmit={handleFeedbackSubmit} className="space-y-2.5 sm:space-y-3">
                    {submitError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 text-red-600 text-[11px] font-mono rounded">
                        {submitError}
                      </div>
                    )}

                    {/* Row 1: Name & Piece */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      <div>
                        <label className="block text-[9px] font-mono tracking-wider uppercase text-neutral-600 font-semibold mb-0.5">
                          YOUR NAME / INITIALS *
                        </label>
                        <div className="relative flex items-center">
                          <User size={13} className="absolute left-2.5 text-neutral-400 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={feedbackForm.name}
                            onChange={(e) => setFeedbackForm({ ...feedbackForm, name: e.target.value })}
                            placeholder="e.g. Aryan K."
                            className="w-full pl-8 pr-2.5 py-1.5 sm:py-2 bg-neutral-50/80 border border-neutral-200 text-xs font-sans text-neutral-900 rounded focus:bg-white focus:border-neutral-900 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono tracking-wider uppercase text-neutral-600 font-semibold mb-0.5">
                          TESTED PIECE OR EXPERIENCE *
                        </label>
                        {!customPieceInput ? (
                          <div className="relative flex items-center">
                            <Shirt size={13} className="absolute left-2.5 text-neutral-400 pointer-events-none" />
                            <select
                              value={feedbackForm.piece}
                              onChange={(e) => {
                                if (e.target.value === '__custom__') {
                                  setCustomPieceInput(true);
                                  setFeedbackForm({ ...feedbackForm, piece: '' });
                                } else {
                                  setFeedbackForm({ ...feedbackForm, piece: e.target.value });
                                }
                              }}
                              className="w-full pl-8 pr-7 py-1.5 sm:py-2 bg-neutral-50/80 border border-neutral-200 text-xs font-sans text-neutral-900 rounded focus:bg-white focus:border-neutral-900 focus:outline-none appearance-none transition-colors truncate"
                            >
                              <option value="General Atelier Experience">General Atelier Experience / Brand</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                              <option value="__custom__">+ Other / Enter Custom Piece</option>
                            </select>
                            <ChevronDown size={13} className="absolute right-2.5 pointer-events-none text-neutral-400" />
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <div className="relative flex-grow flex items-center">
                              <Shirt size={13} className="absolute left-2.5 text-neutral-400 pointer-events-none" />
                              <input
                                type="text"
                                value={feedbackForm.customPiece}
                                onChange={(e) => setFeedbackForm({ ...feedbackForm, customPiece: e.target.value })}
                                placeholder="e.g. Vintage Wash Cargo"
                                className="w-full pl-8 pr-2 py-1.5 sm:py-2 bg-neutral-50/80 border border-neutral-200 text-xs font-sans text-neutral-900 rounded focus:bg-white focus:border-neutral-900 focus:outline-none transition-colors"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setCustomPieceInput(false);
                                setFeedbackForm({ ...feedbackForm, piece: 'General Atelier Experience' });
                              }}
                              className="px-2 border border-neutral-200 text-[9px] font-mono uppercase text-neutral-500 hover:text-neutral-900 rounded"
                            >
                              List
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Order Email */}
                    <div>
                      <label className="block text-[9px] font-mono tracking-wider uppercase text-neutral-600 font-semibold mb-0.5">
                        YOUR ORDER EMAIL (OPTIONAL — VERIFIES BUYER STATUS)
                      </label>
                      <div className="relative flex items-center">
                        <Mail size={13} className="absolute left-2.5 text-neutral-400 pointer-events-none" />
                        <input
                          type="email"
                          value={feedbackForm.email}
                          onChange={(e) => setFeedbackForm({ ...feedbackForm, email: e.target.value })}
                          placeholder="e.g. yourname@gmail.com"
                          className="w-full pl-8 pr-2.5 py-1.5 sm:py-2 bg-neutral-50/80 border border-neutral-200 text-xs font-sans text-neutral-900 rounded focus:bg-white focus:border-neutral-900 focus:outline-none transition-colors"
                        />
                      </div>
                      <p className="text-[9px] text-neutral-400 mt-0.5 font-sans leading-tight">
                        If you purchased from NALAYAK, enter your checkout email to automatically earn the ✦ VERIFIED BUYER badge.
                      </p>
                    </div>

                    {/* Row 3: Star Rating */}
                    <div className="flex items-center justify-between gap-3 pt-0.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[9px] font-mono tracking-wider uppercase text-neutral-600 font-semibold">
                          RATING *
                        </span>
                        <div className="flex items-center gap-0.5" role="group" aria-label="Rating selection">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                              className="p-0.5 hover:scale-110 transition-transform focus:outline-none"
                              aria-label={`Select ${star} stars`}
                            >
                              <Star
                                size={19}
                                className={star <= feedbackForm.rating ? 'fill-neutral-950 text-neutral-950' : 'text-neutral-300'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-xs bg-[#D8FF62] text-neutral-950 font-mono font-black text-[11px] tracking-wider shadow-xs">
                        {feedbackForm.rating}.0 STARS
                      </span>
                    </div>

                    {/* Row 4: Headline */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[9px] font-mono tracking-wider uppercase text-neutral-600 font-semibold">
                          HEADLINE / SUMMARY (OPTIONAL)
                        </label>
                        <span className="text-[9px] font-mono text-neutral-400">
                          {feedbackForm.highlight.length}/100
                        </span>
                      </div>
                      <div className="relative flex items-center">
                        <FileText size={13} className="absolute left-2.5 text-neutral-400 pointer-events-none" />
                        <input
                          type="text"
                          maxLength={100}
                          value={feedbackForm.highlight}
                          onChange={(e) => setFeedbackForm({ ...feedbackForm, highlight: e.target.value })}
                          placeholder="e.g. Heavyweight boxy drape holds shape in humidity"
                          className="w-full pl-8 pr-12 py-1.5 sm:py-2 bg-neutral-50/80 border border-neutral-200 text-xs font-sans text-neutral-900 rounded focus:bg-white focus:border-neutral-900 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Row 5: Verbatim Feedback */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[9px] font-mono tracking-wider uppercase text-neutral-600 font-semibold">
                          VERBATIM FEEDBACK *
                        </label>
                        <span className="text-[9px] font-mono text-neutral-400">
                          {feedbackForm.quote.length}/500
                        </span>
                      </div>
                      <div className="relative">
                        <PenLine size={13} className="absolute left-2.5 top-2.5 text-neutral-400 pointer-events-none" />
                        <textarea
                          rows={2}
                          required
                          maxLength={500}
                          value={feedbackForm.quote}
                          onChange={(e) => setFeedbackForm({ ...feedbackForm, quote: e.target.value })}
                          placeholder="Tell us about the fabric drape, collar rib, washes, packaging, or your overall NALAYAK experience..."
                          className="w-full pl-8 pr-12 py-1.5 sm:py-2 bg-neutral-50/80 border border-neutral-200 text-xs font-sans text-neutral-900 rounded focus:bg-white focus:border-neutral-900 focus:outline-none transition-colors leading-relaxed resize-none h-[64px]"
                        />
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="pt-2 flex items-center justify-between gap-3 border-t border-neutral-100">
                      <div className="flex items-center gap-1.5 text-neutral-500">
                        <ShieldCheck size={14} className="text-neutral-700 flex-shrink-0" />
                        <span className="text-[10px] font-sans leading-tight">
                          Submissions publish directly to the atelier wall.
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2 bg-black text-white text-[11px] font-mono font-bold uppercase tracking-wider rounded hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 flex-shrink-0"
                      >
                        {submitting ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>PUBLISHING...</span>
                          </>
                        ) : (
                          <>
                            <span>SUBMIT REVIEW</span>
                            <ArrowRight size={13} />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
