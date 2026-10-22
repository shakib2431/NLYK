import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import Marquee from 'react-fast-marquee';
import { toast } from 'sonner';
import SafeImg from '@/components/SafeImg';
import ProductCard from '@/components/ProductCard';
import SectionHeader from '@/components/SectionHeader';
import { Reveal, MaskedLines, ease } from '@/components/Reveal';
import { getNewArrivals, getBestSellers } from '@/services/catalog';
import {
  hero, marqueeItems, manifesto, campaign, story, newsletter,
  irlImages, categoryTiles, collections, customDesign,
} from '@/data/storeData';
import CustomerReviews from '@/components/CustomerReviews';
import { useSeo } from '@/hooks/useSeo';


function Hero() {
  const ref = useRef(null);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  const slides = [
    {
      desktop: '/slide1.png',
      mobile: '/slide1-mobile.png',
      kicker: 'AW26 // THE WRONG CROWD',
      headline: ['NOT FOR', 'EVERYONE.'],
      copy: 'Clothes for people who were never interested in fitting in.',
      tag: 'DROP 01 · CHAOS EDIT',
    },
    {
      desktop: '/slide2.png',
      mobile: '/slide2-mobile.png',
      kicker: 'WASHED HEAVYWEIGHT // 450 GSM',
      headline: ['AFTER', 'HOURS.'],
      copy: 'Stealth boxy cuts engineered for the plans that start past midnight.',
      tag: 'DROP 02 · STEALTH FLEECE',
    },
    {
      desktop: '/slide3.png',
      mobile: '/slide3-mobile.png',
      kicker: 'RAW KOLKATA ATELIER // ESSENTIALS',
      headline: ['DAILY', 'DISRESPECT.'],
      copy: 'Heavyweight combed cotton. Pre-shrunk so your size stays your size.',
      tag: 'DROP 03 · EVERYDAY NALAYAK',
    },
  ];

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setSlide((current) => (current + 1) % slides.length);
    }, 5500);

    return () => clearInterval(timer);
  }, [paused, slides.length]);

  const currentSlide = slides[slide];

  return (
    <section
      ref={ref}
      className="relative h-[92vh] min-h-[620px] overflow-hidden bg-ink"
      data-testid="hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <motion.div
        className="absolute inset-0"
        style={{ y, scale }}
      >
        <picture>
          <source
            media="(max-width: 768px)"
            srcSet={currentSlide.mobile}
          />
          <motion.img
            key={currentSlide.desktop}
            src={currentSlide.desktop}
            alt="NALAYAK AW26 campaign — the wrong crowd"
            className="h-full w-full object-cover opacity-85"
            loading={slide === 0 ? 'eager' : 'lazy'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          />
        </picture>

        {/* High-legibility gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent opacity-95" />
        <div className="absolute inset-0 bg-ink/20" />
      </motion.div>

      <div className="relative z-10 h-full flex flex-col justify-end pb-12 md:pb-20 px-4 md:px-8 max-w-[1600px] mx-auto w-full">
        <motion.div
          key={slide}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="h-px w-8 bg-paper/60" />
            <span className="text-[10px] md:text-[11px] tracking-[0.35em] uppercase font-medium text-paper/80">
              {currentSlide.kicker}
            </span>
          </div>

          <h1 className="font-display font-black uppercase tracking-tighter leading-[0.85] text-paper text-[12vw] sm:text-[9vw] md:text-[6.2vw] text-balance">
            {currentSlide.headline.map((line, idx) => (
              <span key={idx} className="block">
                {line}
              </span>
            ))}
          </h1>

          <p className="mt-4 md:mt-5 text-sm md:text-base text-paper/80 max-w-md leading-relaxed font-sans">
            {currentSlide.copy}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={hero.primary.to}
              data-testid="hero-shop-new-btn"
              className="bg-paper text-ink px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink hover:text-paper border border-paper transition-colors duration-300"
            >
              {hero.primary.label}
            </Link>

            <Link
              to={hero.secondary.to}
              data-testid="hero-explore-btn"
              className="border border-paper text-paper px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-paper hover:text-ink transition-colors duration-300"
            >
              {hero.secondary.label}
            </Link>
          </div>
        </motion.div>

        {/* Slide Selector & Progress Indicators */}
        <div className="mt-10 pt-6 border-t border-paper/15 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {slides.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setSlide(idx)}
                data-testid={`hero-slide-indicator-${idx}`}
                aria-label={`Go to slide ${idx + 1}`}
                className="group flex items-center gap-2 text-[10px] tracking-[0.25em] font-medium transition-colors"
              >
                <span className={slide === idx ? 'text-paper font-bold' : 'text-paper/40 group-hover:text-paper/80'}>
                  0{idx + 1}
                </span>
                <span
                  className={`h-[2px] transition-all duration-300 ${
                    slide === idx ? 'w-10 md:w-16 bg-paper' : 'w-4 md:w-6 bg-paper/20 group-hover:bg-paper/50'
                  }`}
                />
              </button>
            ))}
          </div>

          <span className="hidden sm:inline-block text-[10px] tracking-[0.25em] text-paper/50 uppercase">
            {currentSlide.tag}
          </span>
        </div>
      </div>
    </section>
  );
}
function EditorialMarquee() {
  return (
    <div className="bg-ink text-paper py-4 border-y border-ink overflow-hidden" data-testid="editorial-marquee">
      <Marquee speed={35} gradient={false} pauseOnHover>
        {marqueeItems.map((item) => (
          <span key={item} className="mx-8 font-display font-bold uppercase tracking-[0.2em] text-lg md:text-xl whitespace-nowrap">
            {item} <span className="text-paper/40 mx-4">✕</span>
          </span>
        ))}
      </Marquee>
    </div>
  );
}

function NalayakEdit() {
  return (
    <section className="py-20 md:py-32 px-4 md:px-8 max-w-[1600px] mx-auto" data-testid="nalayak-edit">
      <SectionHeader kicker="EDITORIAL" title="THE NALAYAK EDIT" desc="Four moods. Zero apologies." linkTo="/collections" linkLabel="VIEW ALL" />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
        {collections.map((c, i) => (
          <Reveal key={c.slug} delay={i * 0.08} className={i % 4 === 0 || i % 4 === 3 ? 'md:col-span-7' : 'md:col-span-5'}>
            <Link
              to={`/collections/${c.slug}`}
              data-testid={`collection-tile-${c.slug}`}
              className="group relative block overflow-hidden bg-ink aspect-[4/3] md:aspect-auto md:h-[480px]"
            >
              <SafeImg
                id={c.image} w={1200} alt={c.title}
                className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 text-paper">
                <p className="text-[10px] tracking-[0.3em] text-paper/70 mb-2">0{i + 1} — COLLECTION</p>
                <h3 className="font-display font-extrabold uppercase tracking-tight text-2xl md:text-4xl">{c.title}</h3>
                <p className="mt-2 text-sm text-paper/80 max-w-xs">{c.desc}</p>
                <span className="mt-4 inline-block text-[11px] tracking-[0.25em] border-b border-paper pb-1 group-hover:translate-x-1 transition-transform duration-300">
                  SHOP THE EDIT →
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Categories() {
  return (
    <section className="py-16 md:py-24 border-t border-line bg-paper" data-testid="shop-by-category">
      <div className="px-4 md:px-8 max-w-[1600px] mx-auto mb-8 md:mb-12">
        <div className="flex items-center gap-3 mb-3">
          <img
            src="/NALayak%20Compass%20Gothic%20Logo.png"
            alt="NALAYAK"
            className="h-7 md:h-8 w-auto object-contain"
          />
          <span className="h-4 w-px bg-line" />
          <span className="text-[10px] md:text-[11px] tracking-[0.3em] uppercase text-smoke font-medium">
            CORE SILHOUETTES · ATELIER SPECIMENS
          </span>
        </div>
        <h2 className="font-display font-extrabold uppercase tracking-tight text-3xl md:text-5xl">
          SHOP BY CATEGORY
        </h2>
        <p className="mt-3 text-smoke text-sm md:text-base max-w-lg">
          Engineered with substantial weight, tight collars and boxy drapes.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar px-4 md:px-8 max-w-[1600px] mx-auto">
        {categoryTiles.map((tile, i) => (
          <Reveal key={tile.label} delay={i * 0.05} className="shrink-0 w-[68vw] sm:w-[38vw] md:w-[19%] md:min-w-0 md:flex-1">
            <Link
              to={tile.to}
              data-testid={`category-tile-${tile.label.toLowerCase()}`}
              className="group relative block overflow-hidden bg-ink aspect-[3/4]"
            >
              <SafeImg
                id={tile.image} w={700} alt={tile.label}
                className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-[1.05]"
              />

              {/* Official NALAYAK Brand Tag Pill */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-ink/85 backdrop-blur-md border border-paper/25 shadow-sm">
                <img
                  src="/nalayak-icon.png"
                  alt=""
                  className="h-3 w-3 object-contain invert"
                />
                <span className="text-[8.5px] tracking-[0.25em] font-semibold text-paper uppercase">
                  NALAYAK
                </span>
              </div>

              {/* Animated Compass Star Watermark */}
              <div className="absolute top-3 right-3 z-10 pointer-events-none">
                <img
                  src="/nalayak-icon.png"
                  alt=""
                  className="h-4 w-4 md:h-5 md:w-5 object-contain invert opacity-45 group-hover:opacity-100 group-hover:rotate-45 transition-all duration-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                />
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent group-hover:from-ink/95 transition-colors duration-500" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                {tile.spec && (
                  <p className="text-[9px] tracking-[0.25em] text-paper/60 uppercase mb-1">
                    {tile.spec}
                  </p>
                )}
                <h3 className="font-display font-black uppercase tracking-tight text-paper text-xl md:text-2xl">
                  {tile.label}
                </h3>
                <span className="text-[10px] tracking-[0.25em] text-paper/80 group-hover:translate-x-1 inline-block transition-transform duration-300 mt-2 font-medium">
                  EXPLORE →
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ShopByDepartment() {
  const departments = [
    {
      title: "MEN'S STREETWEAR",
      kicker: 'DEPARTMENT 01',
      desc: 'Heavyweight boxy drop-shoulders, wide-leg utility cargo & oversized fleece.',
      to: '/men',
      image: '/products/devanagari-chaos-tee-front.jpg',
      cta: 'SHOP MEN →',
    },
    {
      title: "WOMEN'S EDIT",
      kicker: 'DEPARTMENT 02',
      desc: 'Structured baby crops, relaxed open collars, tailored twill & jewelry.',
      to: '/women',
      image: '/products/her-chaos-crop-tee-front.jpg',
      cta: 'SHOP WOMEN →',
    },
    {
      title: 'UNISEX ARCHIVE',
      kicker: 'DEPARTMENT 03',
      desc: 'Signature heavyweight 240–450 GSM garments engineered for everyone.',
      to: '/collections',
      image: '/collections/the-chaos-edit.jpg',
      cta: 'EXPLORE ALL →',
    },
  ];

  return (
    <section className="py-20 md:py-28 px-4 md:px-8 max-w-[1600px] mx-auto border-t border-line" data-testid="shop-by-department">
      <SectionHeader
        kicker="DEPARTMENTS"
        title="BUILT FOR HOW YOU WEAR IT"
        desc="Men's, women's, and unisex silhouettes engineered with real weight and posture."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {departments.map((d, i) => (
          <Reveal key={d.title} delay={i * 0.08}>
            <Link
              to={d.to}
              data-testid={`department-card-${d.to.replace('/', '')}`}
              className="group relative block overflow-hidden bg-ink aspect-[3/4]"
            >
              <SafeImg
                id={d.image}
                w={900}
                alt={d.title}
                className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-700 group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 text-paper">
                <p className="text-[10px] tracking-[0.3em] text-paper/60 mb-2">{d.kicker}</p>
                <h3 className="font-display font-black uppercase tracking-tight text-2xl md:text-3xl leading-tight">
                  {d.title}
                </h3>
                <p className="mt-2 text-xs md:text-sm text-paper/75 max-w-xs leading-relaxed">
                  {d.desc}
                </p>
                <span className="mt-5 inline-block text-[11px] tracking-[0.25em] border-b border-paper pb-1 font-medium group-hover:translate-x-1 transition-transform duration-300">
                  {d.cta}
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Campaign() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  return (
    <section ref={ref} className="relative overflow-hidden bg-ink" data-testid="campaign-section">
      <motion.div className="absolute inset-0" style={{ y }}>
        <SafeImg
          id={campaign.bg} w={2000} alt="NALAYAK campaign"
          className="h-[116%] w-full object-cover opacity-50"
        />
      </motion.div>
      <div className="relative z-10 px-4 md:px-8 py-28 md:py-44 max-w-[1600px] mx-auto">
        <Reveal>
          <p className="text-paper/60 text-[11px] tracking-[0.35em] mb-6">FEATURED CAMPAIGN</p>
          <h2 className="font-display font-black uppercase tracking-tighter leading-[0.85] text-paper text-[13vw] md:text-[7.5vw] max-w-5xl text-balance">
            {campaign.headline}
          </h2>
          <p className="mt-6 text-paper/80 text-sm md:text-base max-w-md">{campaign.copy}</p>
          <Link
            to={campaign.cta.to}
            data-testid="campaign-cta-btn"
            className="inline-block mt-10 bg-paper text-ink px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-transparent hover:text-paper border border-paper transition-colors duration-300"
          >
            {campaign.cta.label}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function Manifesto() {
  return (
    <section className="py-20 md:py-32 px-4 md:px-8 max-w-[1600px] mx-auto border-t border-line" data-testid="manifesto-section">
      <Reveal>
        <p className="text-[11px] tracking-[0.3em] text-smoke mb-3">THE MANIFESTO</p>
        <h2 className="font-display font-extrabold uppercase tracking-tight leading-[0.9] text-4xl md:text-6xl mb-14">
          RULES WE ACTUALLY FOLLOW
        </h2>
      </Reveal>
      <div className="grid md:grid-cols-3 gap-px bg-line border border-line">
        {manifesto.map((m, i) => (
          <Reveal key={m.n} delay={i * 0.1} className="bg-paper p-8 md:p-12">
            <p className="font-display font-black text-smoke/40 text-5xl md:text-6xl tracking-tighter">{m.n}</p>
            <h3 className="mt-6 font-display font-extrabold uppercase tracking-tight text-xl md:text-2xl leading-tight">{m.title}</h3>
            <p className="mt-4 text-sm text-smoke leading-relaxed">{m.copy}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function CustomDesignSection() {
  return (
    <section className="grid md:grid-cols-2 border-t border-line" data-testid="custom-design-section">
      <div className="flex flex-col justify-center px-6 md:px-16 py-16 md:py-24 order-2 md:order-1 bg-white">
        <Reveal>
          <p className="text-[11px] tracking-[0.3em] text-smoke mb-4">CUSTOM DESIGN</p>
          <h2 className="font-display font-extrabold uppercase tracking-tight leading-[0.9] text-3xl md:text-5xl">
            MAKE IT YOURS.
          </h2>
          <p className="mt-5 text-sm md:text-base text-ink/70 max-w-md leading-relaxed">
            Have an idea that doesn't exist yet? A one-off piece, made with you, by us. Not off the shelf.
          </p>
          <Link
            to="/custom-design"
            data-testid="custom-cta-btn"
            className="inline-block self-start mt-8 border border-ink px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink hover:text-paper transition-colors duration-300"
          >
            START A REQUEST
          </Link>
        </Reveal>
      </div>
      <div className="relative overflow-hidden min-h-[320px] md:min-h-[520px] order-1 md:order-2">
        <SafeImg
          id={customDesign.heroImage} w={1400} alt="Nalayak custom design studio"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </section>
  );
}

function BrandStory() {
  return (
    <section className="grid md:grid-cols-2 border-t border-line" data-testid="brand-story">
      <div className="relative overflow-hidden min-h-[360px] md:min-h-[620px]">
        <SafeImg
          id={story.image} w={1400} alt="Inside the NALAYAK atelier workbench"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-col justify-center px-6 md:px-16 py-16 md:py-24 bg-white">
        <Reveal>
          <p className="text-[11px] tracking-[0.3em] text-smoke mb-4">THE ATELIER</p>
          <h2 className="font-display font-extrabold uppercase tracking-tight leading-[0.9] text-3xl md:text-5xl text-balance">
            {story.headline}
          </h2>
          <div className="mt-6 space-y-4 max-w-md">
            {story.paragraphs.map((p, i) => (
              <p key={i} className={`text-sm md:text-base leading-relaxed ${i === story.paragraphs.length - 1 ? 'font-semibold text-ink' : 'text-ink/75'}`}>
                {p}
              </p>
            ))}
          </div>
          <Link
            to={story.cta.to}
            data-testid="story-cta-btn"
            className="inline-block mt-8 border border-ink px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink hover:text-paper transition-colors duration-300"
          >
            {story.cta.label} →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function IrlGrid() {
  const [uploads, setUploads] = useState([]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/irl/approved`)
      .then((r) => r.json())
      .then((d) => setUploads(d.items || []))
      .catch(() => {});
  }, []);

  const tiles = [
    ...uploads.map((u) => ({ key: u.id, src: `${process.env.REACT_APP_BACKEND_URL}/api/irl/file/${u.id}` })),
    ...irlImages.map((id) => ({ key: id, id })),
  ].slice(0, 6);

  return (
    <section className="py-20 md:py-28 px-4 md:px-8 max-w-[1600px] mx-auto border-t border-line" data-testid="nalayak-irl">
      <SectionHeader kicker="COMMUNITY" title="NALAYAK IRL" desc="See how the wrong crowd wears it." />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {tiles.map((t, i) => (
          <Reveal key={t.key} delay={i * 0.05}>
            <div className="group relative overflow-hidden aspect-square bg-white border border-line">
              <SafeImg
                id={t.src || t.id} w={500} alt={`NALAYAK community look ${i + 1}`}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
              />
              <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/30 transition-colors duration-500 flex items-center justify-center">
                <span className="text-paper text-[11px] tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  @NALAYAK
                </span>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Newsletter() {
  const [email, setEmail] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!email.includes('@')) {
      toast.error('That email looks wrong, even by our standards.');
      return;
    }
    toast.success('You’re in. Regret nothing.', { description: 'First access to drops, unlocked.' });
    setEmail('');
  };

  return (
    <section className="bg-white border-t border-line" data-testid="newsletter-section">
      <div className="px-4 md:px-8 py-20 md:py-32 max-w-[1600px] mx-auto">
        <Reveal>
          <h2 className="font-display font-black uppercase tracking-tighter leading-[0.85] text-[12vw] md:text-[7vw]">
            {newsletter.headline}
          </h2>
          <p className="mt-4 text-sm md:text-base text-smoke max-w-md">{newsletter.copy}</p>
          <form onSubmit={submit} className="mt-10 flex flex-col sm:flex-row max-w-xl" data-testid="newsletter-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="YOUR EMAIL"
              data-testid="newsletter-email-input"
              className="flex-1 border border-ink bg-transparent px-5 py-4 text-sm tracking-wide placeholder:text-smoke/70 focus:outline-none focus:ring-1 focus:ring-ink"
            />
            <button
              type="submit"
              data-testid="newsletter-submit-btn"
              className="mt-3 sm:mt-0 bg-ink text-paper px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300 sm:border sm:border-ink sm:border-l-0"
            >
              {newsletter.cta}
            </button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  useSeo(null, 'NALAYAK — contemporary Indian streetwear. Clothes for people who were never interested in fitting in.');
  const newArrivals = getNewArrivals().slice(0, 4);
  const bestSellers = getBestSellers().slice(0, 8);

  return (
    <main>
      {/* 1. Campaign Hero */}
      <Hero />

      {/* 2. Editorial Marquee */}
      <EditorialMarquee />

      {/* 3. Shop By Category (Immediate visual discovery) */}
      <Categories />

      {/* 4. Curated New Arrivals */}
      <section className="py-20 md:py-28 px-4 md:px-8 max-w-[1600px] mx-auto border-t border-line" data-testid="new-arrivals-section">
        <SectionHeader
          kicker="JUST LANDED"
          title="NEW ARRIVALS"
          desc="Fresh pieces. Questionable decisions."
          linkTo="/new-arrivals"
          linkLabel="VIEW ALL"
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {newArrivals.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.07}>
              <ProductCard product={p} priority={i < 2} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* 5. Distinct Men's, Women's & Unisex Discovery */}
      <ShopByDepartment />

      {/* 6. The Nalayak Edit (Collections Showcase) */}
      <NalayakEdit />

      {/* 7. Campaign Parallax Banner */}
      <Campaign />

      {/* 8. Best Sellers Rail */}
      <section className="py-20 md:py-28 border-t border-line" data-testid="best-sellers-section">
        <div className="px-4 md:px-8 max-w-[1600px] mx-auto">
          <SectionHeader
            kicker="MOST WANTED"
            title="THE ONES EVERYONE WANTS"
            desc="Our most-wanted pieces. Statistically speaking, you’re late."
            linkTo="/collections"
            linkLabel="VIEW ALL"
          />
        </div>
        <div className="flex gap-4 md:gap-5 overflow-x-auto no-scrollbar px-4 md:px-8 max-w-[1600px] mx-auto">
          {bestSellers.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.05} className="shrink-0 w-[62vw] sm:w-[38vw] md:w-[23%] md:flex-1 md:min-w-0">
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* 9. Brand Story & Atelier Craft */}
      <BrandStory />

      {/* 10. Custom Design Section */}
      <CustomDesignSection />

      {/* 11. Nalayak IRL (Community Lookbook) */}
      <IrlGrid />

      {/* 12. Customer Reviews (Transparent Archive) */}
      <CustomerReviews />

      {/* 13. Brand Manifesto (Anchoring brand philosophy) */}
      <Manifesto />

      {/* 14. Newsletter VIP Access */}
      <Newsletter />
    </main>
  );
}