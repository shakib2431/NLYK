import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import SafeImg from '@/components/SafeImg';
import { Reveal } from '@/components/Reveal';
import { useSeo } from '@/hooks/useSeo';

export default function About() {
  useSeo(
    'About — Brand Manifesto',
    'We were never made to fit in. NALAYAK brings an unapologetic, culturally grounded point of view to contemporary Indian streetwear.'
  );

  const pillars = [
    {
      num: '01',
      title: 'WEAR YOUR OWN RULES',
      subtitle: 'Autonomy over consensus',
      desc: "Personal style shouldn't require committee approval. We create garments for the people who dress according to their own internal compass, regardless of what the crowd applauds.",
    },
    {
      num: '02',
      title: 'ROOTED HERE',
      subtitle: 'The energy of India’s streets',
      desc: "Born from the raw texture, monsoon-stained concrete, chaotic beauty, and restless ambition of contemporary Indian cities. Not an imitation of foreign luxury—an original cultural voice.",
    },
    {
      num: '03',
      title: 'MADE TO STAND OUT',
      subtitle: 'Volume, silhouette & bold graphics',
      desc: "Boxy cuts, relaxed drop-shoulders, and uncompromising volumes engineered to command physical space. We design clothes to be seen and remembered, never to fade politely into the background.",
    },
    {
      num: '04',
      title: 'NO PERMISSION NEEDED',
      subtitle: 'Reclaiming the word',
      desc: "The word ‘Nalayak’ was created to dismiss the defiant and non-conforming. We reclaimed it as our badge of honor: sovereign, unapologetic, and completely our own.",
    },
  ];

  const designPractices = [
    {
      title: 'ORIGINAL GRAPHICS & DEVANAGARI TYPOGRAPHY',
      desc: 'Bespoke Devanagari lettering ("नालायक"), brutalist graphic systems, and distressed typographic treatments developed as authentic creative artworks—never borrowed, recycled, or generic.',
    },
    {
      title: 'SUBSTANTIAL STREETWEAR SILHOUETTES',
      desc: 'Structured boxy fits, dropped shoulders, relaxed drapes, and high-density ribbed collars. Garments designed to drape with substance and withstand the daily friction of city life.',
    },
    {
      title: 'CULTURAL SUBTEXT & HONEST TENSION',
      desc: 'Exploring the dynamic tension between Indian heritage, brutalist urban architecture, and modern youth expression—grounded in real street textures rather than sanitized runway stereotypes.',
    },
  ];

  return (
    <main data-testid="about-page" className="bg-paper text-ink overflow-hidden">
      {/* ── Breadcrumbs & Kicker Header ── */}
      <section className="px-4 md:px-8 max-w-[1600px] mx-auto pt-8 md:pt-14 pb-6">
        <nav className="text-[10px] tracking-[0.25em] text-smoke mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-ink transition-colors">HOME</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">ABOUT</span>
        </nav>
        <Reveal y={16}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
            <span className="text-[11px] tracking-[0.3em] uppercase text-smoke">
              EDITORIAL MANIFESTO
            </span>
            {/* <span className="text-[11px] tracking-[0.25em] uppercase text-smoke">
              AUTUMN / WINTER 2026
            </span> */}
          </div>
        </Reveal>
      </section>

      {/* ── Hero Section: Headline + Editorial Photography ── */}
      <section className="px-4 md:px-8 max-w-[1600px] mx-auto pb-16 md:pb-24">
        <Reveal y={24}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-4 mb-6 md:mb-8">
            <Link to="/" aria-label="NALAYAK Home" className="inline-block">
              <img
                src="/NALayak%20Compass%20Gothic%20Logo.png"
                alt="NALAYAK STUDIOS"
                className="h-12 sm:h-14 md:h-16 w-auto object-contain"
              />
            </Link>
            <span className="text-[10px] md:text-[11px] tracking-[0.3em] uppercase text-smoke">
              OFFICIAL ATELIER MARQUE · KOLKATA / MUMBAI
            </span>
          </div>
          <h1 className="font-display font-black uppercase tracking-tighter leading-[0.85] text-5xl sm:text-7xl md:text-8xl lg:text-[8.5vw] text-ink my-4 md:my-8">
            WE WERE NEVER<br />MADE TO FIT IN.
          </h1>
        </Reveal>

        {/* Hero Editorial Campaign Visual */}
        <Reveal delay={0.1} y={20}>
          <div className="relative overflow-hidden bg-ink border border-line aspect-[4/3] sm:aspect-[16/10] md:aspect-[21/9]">
            <SafeImg
              id="/editorial/about-hero-streetwear.jpg"
              w={2000}
              alt="Authentic Indian streetwear editorial — contemporary youth in heavyweight boxy streetwear against urban concrete architecture"
              className="absolute inset-0 h-full w-full object-cover object-center opacity-90 transition-transform duration-1000 hover:scale-[1.02]"
              priority={true}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent pointer-events-none" />

            {/* Editorial Caption Bar */}
            <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2 text-paper text-[10px] md:text-[11px] tracking-[0.25em]">
              <span className="uppercase font-medium">
                FIG 01. URBAN ATELIER PERSPECTIVE
              </span>
              <span className="text-paper/70">
                RAW LIGHT · UNAPOLOGETIC STYLING
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Section 1: WHY NALAYAK & Brand Statement ── */}
      <section className="border-t border-line py-20 md:py-32 px-4 md:px-8 bg-paper">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Subtle Typographic Accent */}
          <div className="lg:col-span-5 relative">
            <Reveal y={16}>
              <p className="text-[11px] tracking-[0.3em] text-smoke mb-3">01 — WHY NALAYAK</p>
              <h2 className="font-display font-black uppercase tracking-tight text-3xl sm:text-4xl md:text-5xl leading-[0.95] text-ink">
                THE COURAGE TO BE DISAPPROVED OF.
              </h2>
              <div className="my-6">
                <img
                  src="/nalayak-logo-black.png"
                  alt="NALAYAK"
                  className="h-7 md:h-9 w-auto object-contain"
                />
              </div>
              <div className="mt-8 pt-8 border-t border-line">
                <span className="font-display font-black text-6xl sm:text-8xl text-ink/10 select-none block tracking-tighter">
                  नालायक
                </span>
                <p className="mt-4 text-[11px] tracking-[0.2em] text-smoke uppercase">
                  LIT. &ldquo;UNFIT / UNWORTHY&rdquo; · RECLAIMED AS AN UNCOMPROMISING BADGE OF INDIVIDUALITY.
                </p>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Exact Supporting Copy */}
          <div className="lg:col-span-7 space-y-8 text-base md:text-xl text-ink/90 leading-relaxed font-sans">
            <Reveal delay={0.08} y={16}>
              <p className="font-medium text-lg md:text-2xl text-ink leading-snug">
                NALAYAK is for the ones who never needed everyone&rsquo;s approval.
              </p>
            </Reveal>

            <Reveal delay={0.14} y={16}>
              <p className="text-ink/80">
                We believe what you wear should say something about who you are—not who the world expects you to be.
              </p>
            </Reveal>

            <Reveal delay={0.2} y={16}>
              <p className="text-ink/80">
                Born from India&rsquo;s streets, its contradictions, its chaos and its creativity, NALAYAK brings an unapologetic point of view to contemporary streetwear.
              </p>
            </Reveal>

            <Reveal delay={0.26} y={16}>
              <p className="text-ink/80">
                We don&rsquo;t dress to impress everyone. We dress to express ourselves.
              </p>
            </Reveal>

            {/* Closing Statement Callout */}
            <Reveal delay={0.32} y={16}>
              <div className="mt-10 p-6 md:p-8 border-l-2 border-ink bg-white shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src="/nalayak-icon.png"
                    alt="NALAYAK Star"
                    className="h-4 w-4 object-contain"
                  />
                  <p className="text-[10px] tracking-[0.3em] text-smoke uppercase">ATELIER ETHOS</p>
                </div>
                <p className="font-display font-black tracking-tight text-xl md:text-3xl uppercase text-ink">
                  NOT MADE FOR EVERYONE. MADE FOR YOURSELF.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Section 2: OUR POINT OF VIEW (4 Pillars) ── */}
      <section className="border-t border-line py-20 md:py-32 px-4 md:px-8 bg-paper">
        <div className="max-w-[1600px] mx-auto">
          <Reveal y={16}>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 md:mb-20 pb-6 border-b border-line gap-4">
              <div>
                <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">02 — OUR POINT OF VIEW</p>
                <h2 className="font-display font-black uppercase tracking-tight text-3xl sm:text-4xl md:text-6xl text-ink">
                  FOUR ANCHORS. ZERO COMPROMISES.
                </h2>
              </div>
              <p className="text-xs md:text-sm text-smoke max-w-sm tracking-wide">
                Our philosophical anchors translate directly into how we design, cut, and present every collection.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {pillars.map((pillar, idx) => {
              return (
                <Reveal key={pillar.num} delay={idx * 0.08} y={20}>
                  <div className="h-full border border-line bg-white p-6 md:p-8 flex flex-col justify-between hover:border-ink transition-colors duration-300 group">
                    <div>
                      <div className="flex items-center justify-between pb-6 border-b border-line mb-6">
                        <span className="font-mono text-xs tracking-widest text-smoke font-medium">
                          {pillar.num}
                        </span>
                        <img
                          src="/nalayak-icon.png"
                          alt="NALAYAK"
                          className="h-4 w-4 object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                      <h3 className="font-display font-black uppercase tracking-tight text-xl md:text-2xl text-ink mb-1">
                        {pillar.title}
                      </h3>
                      <p className="text-[11px] tracking-[0.2em] text-smoke uppercase mb-4">
                        {pillar.subtitle}
                      </p>
                      <p className="text-sm text-ink/75 leading-relaxed font-sans">
                        {pillar.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 3: DESIGN PHILOSOPHY & CREATIVE INTENTIONS ── */}
      <section className="border-t border-line py-20 md:py-32 px-4 md:px-8 bg-paper">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Tactile Atelier Image */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <Reveal y={20}>
              <div className="relative overflow-hidden bg-ink border border-line aspect-[4/3] group">
                <SafeImg
                  id="/editorial/about-atelier-craft.jpg"
                  w={1400}
                  alt="Atelier workbench detail — screen printing test proofs, Devanagari typography, and heavyweight textile swatches"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-paper">
                  <p className="text-[10px] tracking-[0.25em] uppercase text-paper/70 mb-1">
                    FIG 02. PROOFING & TYPOGRAPHIC ARCHIVE
                  </p>
                  <p className="text-xs text-paper tracking-wide">
                    Hand-distressed Devanagari test prints, heavy cotton swatches, and drafting tools.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Creative Intentions Breakdown */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <Reveal y={16}>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/nalayak-icon.png"
                  alt="NALAYAK"
                  className="h-4 w-4 object-contain"
                />
                <p className="text-[11px] tracking-[0.3em] text-smoke uppercase">03 — DESIGN PHILOSOPHY</p>
              </div>
              <h2 className="font-display font-black uppercase tracking-tight text-3xl sm:text-4xl md:text-5xl text-ink leading-[0.95] mb-6">
                CREATIVE INTENTIONS, NOT EMPTY CLAIMS.
              </h2>
              <p className="text-sm md:text-base text-ink/75 leading-relaxed mb-10">
                We believe in creative honesty. We do not invent sustainability fairy tales or corporate origins. We articulate deliberate design intentions that you can feel in the weight, cut, and artwork of the garment.
              </p>
            </Reveal>

            <div className="space-y-6">
              {designPractices.map((practice, index) => (
                <Reveal key={practice.title} delay={0.08 * (index + 1)} y={16}>
                  <div className="p-6 border border-line bg-white hover:border-ink transition-colors duration-300">
                    <h4 className="font-display font-extrabold text-sm md:text-base tracking-wide uppercase text-ink mb-2">
                      {practice.title}
                    </h4>
                    <p className="text-xs md:text-sm text-ink/70 leading-relaxed font-sans">
                      {practice.desc}
                    </p>
                    {index === 0 && (
                      <div className="mt-4 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[10px] tracking-[0.2em] text-smoke uppercase font-mono">OFFICIAL INSIGNIA:</span>
                        <img
                          src="/NALayak%20Compass%20Gothic%20Logo.png"
                          alt="NALAYAK Atelier Insignia"
                          className="h-7 md:h-9 w-auto object-contain"
                        />
                      </div>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: Climax Manifesto Callout & Collections CTA ── */}
      <section className="border-t border-line bg-ink text-paper py-20 md:py-32 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto text-center">
          <Reveal y={20}>
            {/* Direct reference to Footer Logo */}
            <div className="flex justify-center mb-8">
              <Link to="/" aria-label="NALAYAK Home" className="inline-block">
                <img
                  src="/nalayak-logo-white.png"
                  alt="NALAYAK"
                  className="block w-[180px] md:w-[240px] h-auto object-contain hover:opacity-90 transition-opacity"
                />
              </Link>
            </div>
            <p className="text-[11px] tracking-[0.35em] text-paper/60 uppercase mb-4">
              NALAYAK STUDIOS · STREETWEAR MANIFESTO
            </p>
            <h2 className="font-display font-black uppercase tracking-tighter text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.9] text-paper mb-8">
              NOT MADE FOR EVERYONE.<br />
              <span className="text-paper/90">MADE FOR YOURSELF.</span>
            </h2>
            <p className="text-sm md:text-base text-paper/70 max-w-xl mx-auto leading-relaxed mb-10">
              Curated drops, raw Devanagari typography, and heavyweight silhouettes built for people who were never interested in fitting in.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/collections"
                data-testid="about-cta-collections"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-paper text-ink px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-paper/90 transition-colors"
              >
                EXPLORE COLLECTIONS <ArrowUpRight size={14} />
              </Link>
              <Link
                to="/new-arrivals"
                data-testid="about-cta-new-arrivals"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-paper/30 text-paper px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-paper hover:text-ink transition-colors"
              >
                NEW ARRIVALS
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

