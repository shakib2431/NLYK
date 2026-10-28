import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Heart, Minus, Plus, ChevronDown, Truck, RotateCcw, Box, X, ZoomIn, ZoomOut } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Viewer3D from '@/components/Viewer3D';
import SizeGuideModal from '@/components/SizeGuideModal';
import MobileStickyPurchaseBar from '@/components/MobileStickyPurchaseBar';
import { ProductSpecBadges, ProductSpecDetails } from '@/components/ProductSpecs';
import { toast } from 'sonner';
import SafeImg from '@/components/SafeImg';
import ProductCard from '@/components/ProductCard';
import SectionHeader from '@/components/SectionHeader';
import { Reveal } from '@/components/Reveal';
import { getProductBySlug, getRelatedProducts, useLiveCatalog } from '@/services/catalog';
import { getDropState, canPurchase, formatReleaseLabel } from '@/services/membership';
import { formatINR } from '@/data/storeData';
import { useStore } from '@/context/StoreContext';
import { useSeo } from '@/hooks/useSeo';

function Accordion({ title, children, testId }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <button
        onClick={() => setOpen(!open)}
        data-testid={testId}
        className="w-full flex items-center justify-between py-4 text-[11px] tracking-[0.25em] font-medium"
      >
        {title}
        <ChevronDown size={14} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-5 text-sm text-ink/70 leading-relaxed">{children}</div>}
    </div>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { products } = useLiveCatalog();
  const product = useMemo(
    () => products.find((p) => p.slug === slug || p.id === slug) || getProductBySlug(slug),
    [products, slug]
  );
  const { addToCart, wishlist, toggleWishlist, addRecentlyViewed, recentlyViewedProducts, member, dropAlerts, toggleDropAlert, cartOpen, setCartOpen } = useStore();

  const [imgIndex, setImgIndex] = useState(0);
  const [color, setColor] = useState(null);
  const [size, setSize] = useState(null);
  const [sizeError, setSizeError] = useState(false);
  const [qty, setQty] = useState(1);
  const [show3D, setShow3D] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const sizeGuideTriggerRef = useRef(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const mainPurchaseRef = useRef(null);
  const sizeSectionRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const selectedColorImage = product?.colorImages?.[color?.name] || null;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(hover: none), (pointer: coarse)');
      setIsTouchDevice(mq.matches);
      const listener = (e) => setIsTouchDevice(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, []);

  useEffect(() => {
    const el = mainPurchaseRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Bar appears on mobile when main purchase controls scroll out of the viewport
        const isPastCta = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        setShowStickyBar(isPastCta);
      },
      { threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [slug]);

  useEffect(() => {
    setIsHovered(false);
    setMousePos({ x: 50, y: 50 });
  }, [imgIndex, color, slug]);

  const handlePointerMove = (e) => {
    if (e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setMousePos({ x, y });
    setIsHovered(true);
  };

  const handlePointerEnter = (e) => {
    if (e.pointerType === 'touch') return;
    setIsHovered(true);
  };

  const handlePointerLeave = (e) => {
    if (e.pointerType === 'touch') return;
    setIsHovered(false);
    setMousePos({ x: 50, y: 50 });
  };

  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const zoomStyle = {
    transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
    transform: isHovered && !prefersReducedMotion ? 'scale(1.85)' : 'scale(1)',
    transition: isHovered
      ? 'transform 200ms cubic-bezier(0.2, 0, 0.2, 1)'
      : 'transform 300ms cubic-bezier(0.2, 0, 0.2, 1), transform-origin 0ms',
    willChange: isHovered ? 'transform, transform-origin' : 'auto',
  };

  useEffect(() => {
    setImgIndex(0); 
    setQty(1);
    setShowStickyBar(false);
    if (product) {
      if (product.colors && product.colors.length > 0) {
        setColor(product.colors[0]);
      } else {
        setColor({ name: 'Standard', hex: '#0a0a0a' });
      }
      addRecentlyViewed(product.slug);
      if (product.sizes?.length === 1) {
        setSize(product.sizes[0]);
      } else {
        setSize(null);
      }
    }
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const related = useMemo(() => (product ? getRelatedProducts(product, 4) : []), [product]);
  const completeTheLook = useMemo(
    () => (product ? getRelatedProducts(product, 8).slice(4, 8) : []),
    [product]
  );

  useSeo(product ? product.name : 'Product', product?.desc);

  if (!product) {
    return (
      <main className="px-4 md:px-8 py-32 text-center" data-testid="product-not-found">
        <p className="font-display font-extrabold uppercase tracking-tight text-4xl">WRONG PRODUCT. RIGHT VIBE.</p>
        <Link to="/new-arrivals" className="inline-block mt-8 bg-ink text-paper px-8 py-4 text-[11px] tracking-[0.3em]">
          SHOP NEW ARRIVALS
        </Link>
      </main>
    );
  }

  const soldOut = product.stock === 0;
  const dropState = getDropState(product, member);
  const purchasable = canPurchase(product, member) && !soldOut;
  const wished = wishlist.includes(product.slug);
  const discount = product.compareAt
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : 0;

  const subscribed = dropAlerts.includes(product.slug);
  const toggleNotify = () => {
    toggleDropAlert(product.slug);
    toast(
      subscribed ? 'Alert removed.' : "YOU'RE ON THE LIST.",
      { description: `${product.name} — we come to you first.` }
    );
  };

  const tryAdd = (buyNow = false) => {
    if (!size) {
      setSizeError(true);
      sizeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error('Pick a size first.', { description: 'Even rebels need the right fit.' });
      return;
    }
    setSizeError(false);
    addToCart(product, size, color, qty);
    if (buyNow) {
      toast.success('Proceeding to checkout.', { description: `${product.name} — ${size}` });
      navigate('/cart');
    } else {
      toast.success('Added to bag', { description: `${product.name} — ${size}` });
      setCartOpen(true);
    }
  };

  const handleStickyAdd = () => {
    if (dropState === 'locked' || dropState === 'coming-soon') {
      mainPurchaseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!size) {
      mainPurchaseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error('Pick a size first.', { description: 'Even rebels need the right fit.' });
      return;
    }
    tryAdd(false);
  };

  if (!product) {
    return (
      <main className="max-w-[1600px] mx-auto py-24 px-4 text-center min-h-[50vh] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-serif tracking-widest uppercase mb-4">Piece Not Found</h1>
        <p className="text-smoke text-xs mb-8">This piece may have retired or dropped off the radar.</p>
        <Link to="/" className="inline-block bg-ink text-paper px-8 py-3 text-xs tracking-widest font-mono uppercase">
          Back to Store
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-[1600px] mx-auto pb-24 md:pb-0" data-testid={`pdp-${product.slug}`}>
      <div className="px-4 md:px-8 pt-8">
        <nav className="text-[10px] tracking-[0.25em] text-smoke" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-ink transition-colors">HOME</Link>
          <span className="mx-2">/</span>
          <Link to={`/${product.category || 'shop'}`} className="hover:text-ink transition-colors">{(product.category || 'shop').toUpperCase()}</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{product.name}</span>
        </nav>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 px-4 md:px-8 py-5 md:py-7">
        <div>
          <motion.div
            key={`${imgIndex}-${color?.name || 'default'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="relative bg-white border border-line aspect-[3/4] overflow-hidden group select-none"
            data-testid="pdp-gallery"
          >
            <button
              type="button"
              onClick={() => {
                setZoomLevel(1);
                setShowZoom(true);
              }}
              onPointerEnter={handlePointerEnter}
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              onMouseEnter={handlePointerEnter}
              onMouseMove={handlePointerMove}
              onMouseLeave={handlePointerLeave}
              className="absolute inset-0 z-0 overflow-hidden cursor-crosshair sm:cursor-zoom-in text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-ink"
              aria-label="Expand product image in fullscreen"
            >
              {selectedColorImage ? (
                <img
                  src={selectedColorImage}
                  alt={`${product.name} — ${color?.name || ''}`}
                  className="h-full w-full object-cover select-none pointer-events-none"
                  style={zoomStyle}
                  draggable="false"
                />
              ) : (
                <SafeImg
                  id={product.images?.[imgIndex] || product.images?.[0] || 'photo-1523381210434-271e8be1f52b'}
                  w={1400}
                  alt={`${product.name} — view ${imgIndex + 1}`}
                  className="h-full w-full object-cover select-none pointer-events-none"
                  style={zoomStyle}
                  draggable="false"
                />
              )}
            </button>

            {/* Subtle hover zoom hint on desktop, tap to enlarge hint on touch */}
            <div
              className={`pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-paper/90 backdrop-blur-sm px-2.5 py-1 text-[9px] tracking-[0.2em] font-medium uppercase text-smoke border border-line/60 transition-opacity duration-300 ${
                isHovered ? 'opacity-0' : 'opacity-85 group-hover:opacity-100'
              }`}
              aria-hidden="true"
            >
              <ZoomIn size={12} className="text-ink" />
              <span className="hidden sm:inline">HOVER TO EXPLORE</span>
              <span className="sm:hidden">TAP TO EXPAND</span>
            </div>

            {product.badge && (
              <span className="pointer-events-none absolute top-4 left-4 z-10 px-2 py-1 text-[10px] tracking-[0.2em] font-medium bg-paper border border-ink">
                {product.badge}
              </span>
            )}
          </motion.div>
          
          <div className="mt-3 flex gap-3">
            {(product.images || []).map((id, i) => (
              <button
                key={id}
                data-testid={`pdp-thumb-${i}`}
                onClick={() => {
                  setImgIndex(i);
                  setIsHovered(false);
                  setMousePos({ x: 50, y: 50 });
                }}
                className={`h-20 w-16 bg-white border overflow-hidden transition-colors ${i === imgIndex ? 'border-ink' : 'border-line hover:border-smoke'}`}
                aria-label={`View image ${i + 1}`}
              >
                <SafeImg id={id} w={200} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          {product.has3D && (
            <button
              data-testid="pdp-view-3d"
              onClick={() => setShow3D(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 border border-ink py-3 text-[11px] tracking-[0.3em] font-medium hover:bg-ink hover:text-paper transition-colors duration-300"
            >
              <Box size={14} strokeWidth={1.5} /> VIEW IN 3D
            </button>
          )}
        </div>

        <div className="lg:sticky lg:top-28 self-start">
          <Reveal y={16}>
            <p className="text-[11px] tracking-[0.3em] text-smoke uppercase">{product.category} — {product.gender}</p>
            <h1 className="mt-2 font-display font-extrabold uppercase tracking-tight leading-[0.95] text-3xl md:text-5xl">
              {product.name}
            </h1>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-xl font-semibold" data-testid="pdp-price">{formatINR(product.price)}</span>
              {product.compareAt && (
                <>
                  <span className="text-smoke line-through">{formatINR(product.compareAt)}</span>
                  <span className="text-[11px] tracking-[0.15em] bg-ink text-paper px-2 py-0.5">-{discount}%</span>
                </>
              )}
            </div>
            <p className="mt-1 text-[11px] text-smoke tracking-wide">MRP incl. of all taxes</p>

            {/* Verified atelier specification badges */}
            <ProductSpecBadges product={product} />

            <div className="mt-8">
              <p className="text-[11px] tracking-[0.25em] font-medium mb-3">
                COLOUR — <span className="text-smoke">{color?.name.toUpperCase()}</span>
              </p>
              <div className="flex gap-2">
                {(product.colors || []).map((c) => (
                  <button
                    key={c.name}
                    data-testid={`pdp-color-${c.name.toLowerCase()}`}
                    onClick={() => {
                      setColor(c);
                      setImgIndex(0);
                      setIsHovered(false);
                      setMousePos({ x: 50, y: 50 });
                    }}
                    title={c.name}
                    aria-label={`Colour ${c.name}`}
                    className={`h-9 w-9 border-2 transition-colors ${color?.name === c.name ? 'border-ink' : 'border-line hover:border-smoke'}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div ref={sizeSectionRef} className="mt-8" data-testid="pdp-size-section">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] tracking-[0.25em] font-medium">SIZE</p>
                <button
                  ref={sizeGuideTriggerRef}
                  type="button"
                  onClick={() => setShowSizeGuide(true)}
                  data-testid="pdp-size-guide-link"
                  aria-haspopup="dialog"
                  aria-expanded={showSizeGuide}
                  className="text-[11px] tracking-[0.15em] text-smoke underline underline-offset-4 hover:text-ink transition-colors cursor-pointer"
                >
                  SIZE GUIDE
                </button>
              </div>
              <div className={`flex flex-wrap gap-2 p-1 transition-all duration-300 ${sizeError ? "ring-1 ring-red-500 bg-red-50/30" : ""}`}>
                {(product.sizes || []).map((s) => (
                  <button
                    key={s}
                    data-testid={`pdp-size-${s.toLowerCase().replace(' ', '-')}`}
                    onClick={() => { setSize(s); setSizeError(false); }}
                    className={`min-w-[52px] border px-4 py-3 text-[12px] tracking-wide transition-colors duration-200 ${size === s ? 'bg-ink text-paper border-ink' : 'border-line hover:border-ink'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {soldOut && (
                <p className="mt-3 text-[11px] tracking-[0.2em] text-smoke" data-testid="pdp-soldout">
                  SOLD OUT.
                </p>
              )}
            </div>

            <div className="mt-8 flex items-center gap-4">
              <p className="text-[11px] tracking-[0.25em] font-medium">QTY</p>
              <div className="flex items-center border border-ink">
                <button data-testid="pdp-qty-dec" onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 hover:bg-ink hover:text-paper transition-colors" aria-label="Decrease quantity">
                  <Minus size={13} />
                </button>
                <span className="px-4 text-sm font-medium" data-testid="pdp-qty">{qty}</span>
                <button data-testid="pdp-qty-inc" onClick={() => setQty(qty + 1)} className="px-3 py-2 hover:bg-ink hover:text-paper transition-colors" aria-label="Increase quantity">
                  <Plus size={13} />
                </button>
              </div>
            </div>

            <div ref={mainPurchaseRef} data-testid="pdp-purchase-section">
              {dropState === 'locked' || dropState === 'coming-soon' ? (
                <div className="mt-8 border border-ink p-6 md:p-8 text-center" data-testid="pdp-locked">
                  <p className="text-[11px] tracking-[0.25em] text-smoke mb-2">
                    {dropState === 'coming-soon'
                      ? `COMING SOON — CLUB ACCESS ${formatReleaseLabel(product.clubReleaseAt)}`
                      : 'CLUB ACCESS ONLY'}
                  </p>
                  <p className="font-display font-extrabold uppercase tracking-tight text-2xl">
                    THIS PIECE ISN'T PUBLIC YET.
                  </p>
                  <Link
                    to="/club"
                    data-testid="pdp-join-club-btn"
                    className="inline-block mt-5 bg-ink text-paper px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300"
                  >
                    JOIN THE CLUB
                  </Link>
                  {dropState === 'coming-soon' && (
                    <button
                      onClick={toggleNotify}
                      data-testid="pdp-notify-btn"
                      className="block mx-auto mt-4 text-[11px] tracking-[0.25em] text-smoke hover:text-ink transition-colors underline underline-offset-4"
                    >
                      {subscribed ? "YOU'RE ON THE LIST." : 'NOTIFY ME AT PUBLIC RELEASE'}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {dropState === 'club-live' && (
                    <p className="mt-8 text-[11px] tracking-[0.25em] text-smoke" data-testid="pdp-club-live">
                      CLUB EARLY ACCESS — YOU'RE IN FIRST.
                    </p>
                  )}
                  <div className={`${dropState === 'club-live' ? 'mt-3' : 'mt-8'} grid grid-cols-[1fr_auto] gap-3`}>
                    <button
                      data-testid="pdp-add-to-bag"
                      disabled={soldOut}
                      onClick={() => tryAdd(false)}
                      className="bg-ink text-paper py-4 text-[12px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {soldOut ? 'SOLD OUT' : 'ADD TO BAG'}
                    </button>
                    <button
                      data-testid="pdp-wishlist-btn"
                      onClick={() => {
                        toggleWishlist(product.slug);
                        toast(wished ? 'Removed from wishlist' : 'Saved to wishlist', { description: product.name });
                      }}
                      aria-label="Toggle wishlist"
                      className="border border-ink px-5 hover:bg-ink hover:text-paper transition-colors duration-300"
                    >
                      <Heart size={17} strokeWidth={1.5} className={wished ? 'fill-current' : ''} />
                    </button>
                  </div>
                  {!soldOut && (
                    <button
                      data-testid="pdp-buy-now"
                      onClick={() => tryAdd(true)}
                      className="mt-3 w-full border border-ink py-4 text-[12px] tracking-[0.3em] font-medium hover:bg-ink hover:text-paper transition-colors duration-300"
                    >
                      BUY NOW
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="mt-6 space-y-3 text-sm text-ink/70">
              <p className="flex items-center gap-3"><Truck size={15} strokeWidth={1.5} /> Free shipping above ₹999. Dispatched in 48 hours.</p>
              <p className="flex items-center gap-3"><RotateCcw size={15} strokeWidth={1.5} /> 7-day easy returns.</p>
            </div>

            {dropState === 'sold-out' && (
              <button
                onClick={toggleNotify}
                data-testid="pdp-restock-btn"
                className="mt-3 w-full border border-ink py-4 text-[12px] tracking-[0.3em] font-medium hover:bg-ink hover:text-paper transition-colors duration-300"
              >
                {subscribed ? "YOU'RE ON THE LIST." : 'NOTIFY WHEN BACK'}
              </button>
            )}

            <p className="mt-5 text-[11px] tracking-[0.2em] text-smoke" data-testid="pdp-member-line">
              {member && (member.membershipType || 'free') !== 'free' ? (
                'CLUB MEMBERS GET EARLY ACCESS.'
              ) : (
                <>
                  MEMBERS GET FIRST LOOKS.{' '}
                  {!member && (
                    <>
                      —{' '}
                      <Link to="/membership" data-testid="pdp-members-link" className="text-ink underline underline-offset-4 hover:text-smoke transition-colors">
                        JOIN FREE
                      </Link>
                    </>
                  )}
                </>
              )}
            </p>

            <div className="mt-8 border-t border-line">
              <Accordion title="DESCRIPTION" testId="pdp-acc-description">{product.desc}</Accordion>
              <Accordion title="FABRIC & SPECIFICATIONS" testId="pdp-acc-specs">
                <ProductSpecDetails product={product} />
              </Accordion>
              <Accordion title="DELIVERY" testId="pdp-acc-delivery">
                Dispatched within 48 hours from Kolkata. Metro cities: 2–4 days. Everywhere else: 4–7 days. Tracking lands in your inbox the moment it ships.
              </Accordion>
              <Accordion title="RETURNS" testId="pdp-acc-returns">
                7-day return window, unused with tags on. Refund hits your account in 5–7 working days. Sale pieces are final — choose wisely.
              </Accordion>
            </div>

            <div className="mt-10 border border-line p-6 md:p-8" data-testid="pdp-custom-cta">
              <p className="text-[11px] tracking-[0.25em] text-smoke mb-2">LOOKING FOR SOMETHING CUSTOM?</p>
              <p className="font-display font-extrabold uppercase tracking-tight text-xl md:text-2xl">WANT SOMETHING DIFFERENT?</p>
              <Link
                to="/custom-design"
                data-testid="pdp-custom-link"
                className="inline-block mt-4 text-[11px] tracking-[0.25em] border-b border-ink pb-1 hover:text-smoke hover:border-smoke transition-colors"
              >
                TALK TO NALAYAK →
              </Link>
            </div>
          </Reveal>
        </div>
      </div>

      <section className="px-4 md:px-8 py-8 md:py-12 border-t border-line" data-testid="complete-the-look">
        <SectionHeader title="COMPLETE THE LOOK" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-3.5">
          {(completeTheLook.length ? completeTheLook : related).map((p, i) => (
            <Reveal key={p.id} delay={i * 0.06}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-4 md:px-8 py-8 md:py-12 border-t border-line" data-testid="you-may-also-like">
        <SectionHeader title="YOU MAY ALSO LIKE" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-3.5">
          {related.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.06}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>

      {recentlyViewedProducts.filter((p) => p.slug !== product.slug).length > 0 && (
        <section className="px-4 md:px-8 py-16 border-t border-line" data-testid="recently-viewed">
          <SectionHeader title="RECENTLY VIEWED" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-3.5">
            {recentlyViewedProducts.filter((p) => p.slug !== product.slug).slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>
        {show3D && <Viewer3D key="viewer-3d" product={product} onClose={() => setShow3D(false)} />}
        {showZoom && (
          <motion.div
            key="product-zoom"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-3 md:p-8"
            onClick={() => setShowZoom(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowZoom(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Product image zoom viewer"
            tabIndex={-1}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowZoom(false);
              }}
              className="absolute top-4 right-4 z-20 p-3 bg-white text-black"
              aria-label="Close zoom viewer"
            >
              <X size={22} />
            </button>

            <div
              className="absolute top-4 left-4 z-20 flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
                className="p-3 bg-white text-black disabled:opacity-40"
                disabled={zoomLevel <= 1}
                aria-label="Zoom out"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-white text-xs min-w-12 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.5))}
                className="p-3 bg-white text-black disabled:opacity-40"
                disabled={zoomLevel >= 3}
                aria-label="Zoom in"
              >
                <ZoomIn size={18} />
              </button>
            </div>

            <div
              className="h-full w-full overflow-auto flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center justify-center min-w-full min-h-full"
                style={{ cursor: zoomLevel > 1 ? 'zoom-out' : 'zoom-in' }}
                onClick={() => setZoomLevel((z) => (z === 1 ? 2 : 1))}
              >
                {selectedColorImage ? (
                  <img
                    src={selectedColorImage}
                    alt={`${product.name} — ${color?.name || ''}`}
                    draggable="false"
                    className="max-h-[85vh] max-w-full object-contain"
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'center center',
                      transition: 'transform 200ms ease',
                    }}
                  />
                ) : (
                  <SafeImg
                    id={product.images?.[imgIndex] || product.images?.[0] || 'photo-1523381210434-271e8be1f52b'}
                    w={1800}
                    alt={`${product.name} — enlarged view`}
                    className="max-h-[85vh] max-w-full object-contain"
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'center center',
                      transition: 'transform 200ms ease',
                    }}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Size Guide & Fit Advisory Modal */}
      <SizeGuideModal
        isOpen={showSizeGuide}
        onClose={() => {
          setShowSizeGuide(false);
          sizeGuideTriggerRef.current?.focus();
        }}
        product={product}
        selectedSize={size}
        onSelectSize={(s) => setSize(s)}
      />

      {/* Mobile Sticky Add to Bag Bar */}
      <MobileStickyPurchaseBar
        isVisible={showStickyBar && !showSizeGuide && !showZoom && !cartOpen}
        product={product}
        size={size}
        setSize={setSize}
        color={color}
        selectedColorImage={selectedColorImage}
        imgIndex={imgIndex}
        soldOut={soldOut}
        dropState={dropState}
        onAddToCart={handleStickyAdd}
      />
    </main>
  );
}