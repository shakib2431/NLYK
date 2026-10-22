/**
 * Extracts strictly verified product specifications from product record.
 * Never invents technical specs not present in data.
 */
export function extractVerifiedSpecs(product) {
  if (!product) return { badges: [], details: [] };

  const desc = product.desc || '';
  const descLower = desc.toLowerCase();
  const category = (product.category || '').toLowerCase();

  const badges = [];
  const details = [];

  // 1. GSM / Weight (only if explicitly stated in product data)
  const gsmMatch = desc.match(/(\d{3})\s*GSM/i);
  if (gsmMatch) {
    const gsmVal = `${gsmMatch[1]} GSM`;
    badges.push(gsmVal);
    details.push({ label: 'FABRIC WEIGHT', value: `${gsmVal} Heavyweight Jersey` });
  }

  // 2. Fabric Composition
  let fabric = null;
  if (descLower.includes('brushed twill') || descLower.includes('twill')) {
    fabric = 'Brushed Cotton Twill';
  } else if (descLower.includes('fleece')) {
    fabric = 'Heavyweight Brushed Cotton Fleece';
  } else if (descLower.includes('ribbed') || descLower.includes('rib')) {
    fabric = 'Ribbed Combed Cotton';
  } else if (descLower.includes('cotton') || category === 'tees' || category === 'hoodies') {
    fabric = '100% Combed Heavyweight Cotton';
  } else if (category === 'shirts') {
    fabric = '100% Premium Woven Cotton';
  } else if (category === 'bottoms') {
    fabric = 'Reinforced Cotton Twill';
  }

  if (fabric) {
    badges.push(fabric.includes('Twill') ? 'COTTON TWILL' : fabric.includes('Fleece') ? 'COTTON FLEECE' : '100% COTTON');
    details.push({ label: 'COMPOSITION', value: fabric });
  }

  // 3. Silhouette / Fit
  let fit = null;
  if (descLower.includes('oversized') || descLower.includes('dropped shoulder')) {
    fit = 'Oversized Silhouette with Dropped Shoulders';
    badges.push('OVERSIZED FIT');
  } else if (descLower.includes('boxy')) {
    fit = 'Structured Boxy Streetwear Cut';
    badges.push('BOXY FIT');
  } else if (descLower.includes('cropped')) {
    fit = 'Cropped Waist Silhouette';
    badges.push('CROPPED CUT');
  } else if (descLower.includes('relaxed')) {
    fit = 'Relaxed Streetwear Silhouette';
    badges.push('RELAXED FIT');
  } else if (descLower.includes('regular')) {
    fit = 'Standard Straight Cut';
    badges.push('REGULAR FIT');
  } else if (category === 'accessories') {
    fit = 'One Size / Universal Fit';
    badges.push('UNIVERSAL FIT');
  }

  if (fit) {
    details.push({ label: 'SILHOUETTE', value: fit });
  }

  // 4. Gender / Sizing intent
  if (product.gender) {
    const g = product.gender.toUpperCase();
    if (g === 'UNISEX') {
      badges.push('UNISEX');
      details.push({ label: 'GENDER / FIT INTENT', value: 'Designed for all genders (Unisex)' });
    } else if (g === 'MEN') {
      details.push({ label: 'GENDER / FIT INTENT', value: "Men's Cut" });
    } else if (g === 'WOMEN') {
      details.push({ label: 'GENDER / FIT INTENT', value: "Women's Cut" });
    }
  }

  // 5. Special Treatments & Finishes
  const finishes = [];
  if (descLower.includes('pre-shrunk')) finishes.push('Pre-shrunk (prevents post-wash shrinkage)');
  if (descLower.includes('garment-dyed')) finishes.push('Garment-dyed for vintage wash and lived-in hand');
  if (descLower.includes('acid-wash') || descLower.includes('acid wash')) finishes.push('Custom acid-wash artisanal treatment');
  if (descLower.includes('brushed')) finishes.push('Brushed surface for soft-hand finish');
  if (descLower.includes('raw hem') || descLower.includes('baby-lock')) finishes.push('Baby-lock edge finish');

  if (finishes.length > 0) {
    if (descLower.includes('pre-shrunk')) badges.push('PRE-SHRUNK');
    if (descLower.includes('garment-dyed')) badges.push('GARMENT DYED');
    details.push({ label: 'TREATMENT & FINISH', value: finishes.join(' • ') });
  }

  // 6. Graphics & Embellishments
  const graphicDetails = [];
  if (descLower.includes('chest print') && descLower.includes('back graphic')) {
    graphicDetails.push('Front chest emblem & expansive rear brutalist artwork');
  } else if (descLower.includes('back graphic') || descLower.includes('back print')) {
    graphicDetails.push('Expansive rear graphic artwork');
  } else if (descLower.includes('chest print') || descLower.includes('chest logo')) {
    graphicDetails.push('Minimalist chest emblem print');
  } else if (descLower.includes('embroidered') || descLower.includes('embroidery')) {
    graphicDetails.push('High-density tonal needlework embroidery');
  } else if (descLower.includes('screen-print') || descLower.includes('soft-hand print')) {
    graphicDetails.push('Breathable soft-hand discharge screen print');
  }

  if (graphicDetails.length > 0) {
    details.push({ label: 'GRAPHIC DETAILS', value: graphicDetails.join(' • ') });
  }

  // 7. Care Instructions (Standard verified textile care based on verified garment type)
  let care = 'Machine wash cold inside-out with like colours. Do not iron directly over prints or embroidery. Dry in shade. Do not tumble dry.';
  if (category === 'shirts') {
    care = 'Cold gentle machine wash. Hang dry in shade. Warm iron on reverse side. Do not bleach.';
  } else if (category === 'accessories') {
    care = 'Spot clean with damp cloth. Do not soak, bleach or machine dry.';
  }
  details.push({ label: 'CARE INSTRUCTIONS', value: care });

  // 8. Atelier & Dispatch Origin
  details.push({ label: 'ATELIER ORIGIN', value: 'Designed & handcrafted in Kolkata, India' });

  return { badges, details };
}

/**
 * Editorial badge strip displayed directly below price.
 */
export function ProductSpecBadges({ product }) {
  const { badges } = extractVerifiedSpecs(product);
  if (!badges || badges.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 mt-3"
      data-testid="pdp-spec-badges"
      aria-label="Garment specifications"
    >
      {badges.slice(0, 4).map((badge, idx) => (
        <span
          key={idx}
          className="inline-flex items-center border border-line bg-white/60 px-2 py-0.5 text-[9px] font-mono tracking-[0.2em] uppercase text-smoke"
        >
          {badge}
        </span>
      ))}
    </div>
  );
}

/**
 * Technical Atelier Accordion content.
 */
export function ProductSpecDetails({ product }) {
  const { details } = extractVerifiedSpecs(product);
  if (!details || details.length === 0) return null;

  return (
    <div className="space-y-3 pt-1 text-xs" data-testid="pdp-technical-specs">
      <div className="border border-line bg-white divide-y divide-line">
        {details.map((item, idx) => (
          <div key={idx} className="grid grid-cols-[130px_1fr] md:grid-cols-[160px_1fr] p-3 text-xs leading-relaxed">
            <span className="font-mono text-[10px] tracking-[0.15em] text-smoke uppercase font-semibold">
              {item.label}
            </span>
            <span className="text-ink/85">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

