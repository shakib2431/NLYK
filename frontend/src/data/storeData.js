// ─────────────────────────────────────────────────────────────
// NALAYAK — CENTRAL CONTENT & MOCK DATA LAYER
// Swap this file (or the services that read it) with Supabase later.
// ─────────────────────────────────────────────────────────────

export const img = (id, w = 1200) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;

export const FALLBACK_IMG =
  'photo-1523381210434-271e8be1f52b';

export const site = {
  name: 'NALAYAK',
  announcement: 'FREE SHIPPING ON ORDERS ABOVE ₹999 — NO COUPON, NO BEGGING',
  instagram: '@NALAYAK',
  currency: '₹',
};

export const nav = [
  { label: 'NEW IN', to: '/new-arrivals' },
  { label: 'MEN', to: '/men' },
  { label: 'WOMEN', to: '/women' },
  { label: 'TEES', to: '/tees' },
  { label: 'HOODIES', to: '/hoodies' },
  { label: 'BOTTOMS', to: '/bottoms' },
  { label: 'ACCESSORIES', to: '/accessories' },
  { label: 'COLLECTIONS', to: '/collections' },
  { label: 'CUSTOM', to: '/custom-design' },
];

export const hero = {
  desktop: 'photo-1515886657613-9f3515b0c78f',
  mobile: 'photo-1509631179647-0177331693ae',
  kicker: 'AW26 — THE WRONG CROWD',
  lines: ['NOT FOR', 'EVERYONE.'],
  copy: 'Clothes for people who were never interested in fitting in.',
  primary: { label: 'SHOP NEW ARRIVALS', to: '/new-arrivals' },
  secondary: { label: 'EXPLORE COLLECTIONS', to: '/collections' },
};

export const marqueeItems = [
  'NOT FOR EVERYONE',
  'FREE SHIPPING OVER ₹999',
  'NEW DROP EVERY MONTH',
  'MADE IN INDIA',
  'NO BORING CLOTHES',
  'WEAR IT WRONG',
];

export const manifesto = [
  {
    n: '01',
    title: "WE'RE NOT FOR EVERYONE",
    copy: 'If your relatives approve of your outfit, try again.',
  },
  {
    n: '02',
    title: 'MADE IN INDIA, WORN EVERYWHERE',
    copy: 'Designed in Kolkata. Loud in every timezone.',
  },
  {
    n: '03',
    title: "QUALITY ISN'T A PERSONALITY",
    copy: 'Great fabric is the baseline. The attitude is the product.',
  },
];

export const campaign = {
  bg: 'photo-1445205170230-053b83016050',
  headline: 'WELCOME TO THE WRONG CROWD.',
  copy: 'For people who were never particularly interested in fitting in.',
  cta: { label: 'EXPLORE THE COLLECTION', to: '/collections/the-chaos-edit' },
};

export const story = {
  image: 'photo-1441986300917-64674bd600d8',
  headline: "WE DON'T MAKE CLOTHES FOR EVERYONE.",
  paragraphs: [
    'NALAYAK exists for the people who never quite fit the mould.',
    'The ones who question the rules. The ones who make their own. The ones who would rather be remembered than approved.',
    'We make clothes for them.',
  ],
  cta: { label: 'OUR STORY', to: '/about' },
};

export const newsletter = {
  headline: "DON'T BE NORMAL.",
  copy: "Get first access to new drops, limited pieces and things we probably shouldn't release.",
  cta: 'JOIN THE WRONG CROWD',
};

export const irlImages = [
  'photo-1531891437562-4301cf35b7e4',
  'photo-1524504388940-b1c1722653e1',
  'photo-1517841905240-472988babdf9',
  'photo-1492707892479-7bc8d5a4ee93',
  'photo-1469334031218-e382a71b716b',
  'photo-1483985988355-763728e1935b',
];

export const categoryTiles = [
  { label: 'TEES', to: '/tees', image: 'photo-1523381210434-271e8be1f52b' },
  { label: 'SHIRTS', to: '/shirts', image: 'photo-1596755094514-f87e34085b2c' },
  { label: 'HOODIES', to: '/hoodies', image: 'photo-1556821840-3a63f95609a7' },
  { label: 'BOTTOMS', to: '/bottoms', image: 'photo-1542272604-787c3835535d' },
  { label: 'ACCESSORIES', to: '/accessories', image: 'photo-1511499767150-a48a237f0083' },
];

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const SHOE_SIZES = ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'];

const JET = { name: 'Jet', hex: '#111111' };
const CHALK = { name: 'Chalk', hex: '#F4F1EA' };
const ASH = { name: 'Ash', hex: '#8C8C8C' };
const OLIVE = { name: 'Olive', hex: '#4A5340' };
const MAROON = { name: 'Maroon', hex: '#5C2E2E' };
const PAPER = { name: 'Paper', hex: '#FFFFFF' };

const daysFromNow = (d) => new Date(Date.now() + d * 864e5).toISOString();
const daysAgo = (d) => daysFromNow(-d);

export const products = [
  {
    id: 'p01', slug: 'nalayak-standard-tee', name: 'NALAYAK STANDARD TEE',
    price: 999, compareAt: 1299, category: 'tees', gender: 'unisex',
    desc: 'The tee that started the disrespect. Heavyweight 240 GSM cotton, boxy fit, zero apologies. Pre-shrunk so your size stays your size.',
    images: ['photo-1521572163474-6864f9cf17ab', 'photo-1562157873-818bc0726f68'],
    sizes: APPAREL_SIZES, colors: [JET, CHALK, ASH], badge: 'BEST SELLER',
    stock: 34, newArrival: true, bestSeller: true, featured: true,
  },
  {
    id: 'p02', slug: 'wrong-crowd-tee', name: 'WRONG CROWD TEE',
    price: 1199, compareAt: null, category: 'tees', gender: 'unisex',
    desc: 'Membership has its privileges. Chest print, relaxed fit, and a back graphic your mother will ask about.',
    images: ['photo-1618354691373-d851c5c3a990', 'photo-1583743814966-8936f5b7be1a'],
    sizes: APPAREL_SIZES, colors: [CHALK, JET], badge: 'NEW',
    stock: 21, newArrival: true, bestSeller: true, featured: false,
  },
  {
    id: 'p03', slug: 'no-approval-oversized-tee', name: 'NO APPROVAL OVERSIZED TEE',
    price: 1299, compareAt: 1599, category: 'tees', gender: 'men',
    desc: 'Dropped shoulders, dropped standards. An oversized fit for people who stopped asking for permission years ago.',
    images: ['photo-1602810318383-e386cc2a3ccf', 'photo-1523381210434-271e8be1f52b'],
    sizes: APPAREL_SIZES, colors: [JET, OLIVE, PAPER], badge: null,
    stock: 18, newArrival: true, bestSeller: false, featured: false,
  },
  {
    id: 'p04', slug: 'chaos-club-tee', name: 'CHAOS CLUB TEE',
    price: 1199, compareAt: null, category: 'tees', gender: 'unisex',
    desc: 'First rule of Chaos Club: tell everyone. Garment-dyed, slightly faded, fully unbothered.',
    images: ['photo-1503341504253-dff4815485f1', 'photo-1576566588028-4147f3842f27'],
    sizes: APPAREL_SIZES, colors: [ASH, JET], badge: null,
    stock: 27, newArrival: false, bestSeller: true, featured: true,
  },
  {
    id: 'p05', slug: 'basically-famous-tee', name: 'BASICALLY FAMOUS TEE',
    price: 1099, compareAt: null, category: 'tees', gender: 'men',
    desc: 'For the main character in a film nobody funded. Soft-hand print, regular fit, unreasonable confidence included.',
    images: ['photo-1488161628813-04466f872be2', 'photo-1507003211169-0a1dd7228f2d'],
    sizes: APPAREL_SIZES, colors: [PAPER, JET], badge: null,
    stock: 15, newArrival: true, bestSeller: false, featured: false,
  },
  {
    id: 'p06', slug: 'frequency-tee', name: 'FREQUENCY TEE',
    price: 999, compareAt: null, category: 'tees', gender: 'unisex',
    desc: 'Tune in, opt out. A tonal graphic tee for people whose vibe is legally distinct from everyone else’s.',
    images: ['photo-1552374196-1ab2a1c593e8', 'photo-1500648767791-00dcc994a43e'],
    sizes: APPAREL_SIZES, colors: [JET, MAROON], badge: null,
    stock: 40, newArrival: false, bestSeller: false, featured: false,
  },
  {
    id: 'p07', slug: 'after-hours-tee', name: 'AFTER HOURS TEE',
    price: 1149, compareAt: null, category: 'tees', gender: 'women',
    desc: 'Cut for the hours that don’t make it to the group chat. Cropped boxy fit, midnight-grade cotton.',
    images: ['photo-1529139574466-a303027c1d8b', 'photo-1515886657613-9f3515b0c78f'],
    sizes: APPAREL_SIZES, colors: [JET, PAPER], badge: 'NEW',
    stock: 22, newArrival: true, bestSeller: false, featured: false,
  },
  {
  id: 'p08', slug: 'her-chaos-crop-tee', name: 'HER CHAOS CROP TEE',
  price: 999, compareAt: 1199, category: 'tees', gender: 'women',
  desc: 'Cropped, not tamed. A sharper silhouette with the same terrible decision-making built in.',
  images: ['photo-1503342217505-b0a15ec3261c', 'photo-1554568218-0f1715e72254'],
  sizes: APPAREL_SIZES,
  colors: [PAPER, JET, MAROON],

  colorImages: {
    Paper: '/her-chaos-crop-tee-white.png',
  },

  badge: null,
  stock: 25, newArrival: true, bestSeller: true, featured: false,
},
  {
    id: 'p09', slug: 'off-record-overshirt', name: 'OFF RECORD OVERSHIRT',
    price: 1899, compareAt: null, category: 'shirts', gender: 'men',
    desc: 'Nothing you said while wearing this can be used against you. Brushed twill, boxy cut, two chest pockets for secrets.',
    images: ['photo-1596755094514-f87e34085b2c', 'photo-1520975954732-35dd22299614'],
    sizes: APPAREL_SIZES, colors: [OLIVE, JET], badge: null,
    stock: 12, newArrival: false, bestSeller: false, featured: true,
  },
  {
    id: 'p10', slug: 'quiet-riot-shirt', name: 'QUIET RIOT SHIRT',
    price: 1699, compareAt: 1999, category: 'shirts', gender: 'men',
    desc: 'Rebellion, but make it business casual. A camp-collar shirt that behaves in meetings and nowhere else.',
    images: ['photo-1591047139829-d91aecb6caea', 'photo-1508296695146-257a814070b4'],
    sizes: APPAREL_SIZES, colors: [JET, CHALK], badge: null,
    stock: 9, newArrival: false, bestSeller: false, featured: false,
  },
  {
    id: 'p11', slug: 'night-shift-shirt', name: 'NIGHT SHIFT SHIRT',
    price: 1799, compareAt: null, category: 'shirts', gender: 'unisex',
    desc: 'For the 9pm to 4am economy. Fluid drape, dark tones, zero interest in your 9am standup.',
    images: ['photo-1485230895905-ec40ba36b9bc', 'photo-1532332248682-206cc786359f'],
    sizes: APPAREL_SIZES, colors: [JET], badge: 'NEW',
    stock: 14, newArrival: true, bestSeller: false, featured: false,
  },
  {
    id: 'p12', slug: 'summer-of-chaos-shirt', name: 'SUMMER OF CHAOS SHIRT',
    price: 1599, compareAt: null, category: 'shirts', gender: 'women',
    desc: 'Breathable, unbothered, slightly wrinkled on purpose. The shirt equivalent of leaving the party without saying bye.',
    images: ['photo-1594633312681-425c7b97ccd1', 'photo-1487222477894-8943e31ef7b2'],
    sizes: APPAREL_SIZES, colors: [CHALK, PAPER], badge: null,
    stock: 16, newArrival: false, bestSeller: false, featured: false,
  },
  {
    id: 'p13', slug: 'anti-normal-hoodie', name: 'ANTI-NORMAL HOODIE',
    price: 2499, compareAt: null, category: 'hoodies', gender: 'unisex',
    desc: '400 GSM brushed fleece with a hood big enough to hide from small talk. The uniform of the unapologetic.',
    images: ['photo-1556821840-3a63f95609a7', 'photo-1548123378-bde4eca81d2d'],
    sizes: APPAREL_SIZES, colors: [JET, ASH], badge: 'BEST SELLER',
    stock: 30, newArrival: false, bestSeller: true, featured: true,
  },
  {
    id: 'p14', slug: 'bad-decisions-hoodie', name: 'BAD DECISIONS HOODIE',
    price: 2599, compareAt: 2999, category: 'hoodies', gender: 'unisex',
    desc: 'Warm enough for the walk home you should not be taking. Puff print back graphic, kangaroo pocket, no judgement.',
    images: ['photo-1620799140408-edc6dcb6d633', 'photo-1550614000-4895a10e1bfd'],
    sizes: APPAREL_SIZES, colors: [MAROON, JET], badge: null,
    stock: 11, newArrival: true, bestSeller: false, featured: false,
  },
  {
    id: 'p15', slug: 'wrong-crowd-hoodie', name: 'WRONG CROWD HOODIE',
    price: 2399, compareAt: null, category: 'hoodies', gender: 'unisex',
    desc: 'Heavyweight fleece, embroidered logo, and a fit roomy enough for you and your reputation.',
    images: ['photo-1576775068668-c147f14c36f7', 'photo-1552374196-1ab2a1c593e8'],
    sizes: APPAREL_SIZES, colors: [JET, OLIVE], badge: null,
    stock: 19, newArrival: false, bestSeller: true, featured: false,
  },
  {
    id: 'p16', slug: 'after-dark-hoodie', name: 'AFTER DARK HOODIE',
    price: 2699, compareAt: null, category: 'hoodies', gender: 'women',
    desc: 'Blackout fleece for blackout plans. Cropped-oversized hybrid fit. Limited run — when it’s gone, it’s a rumour.',
    images: ['photo-1638638977172-9f7169a77930', 'photo-1567226028173-20eb319d0bac'],
    sizes: APPAREL_SIZES, colors: [JET], badge: 'LIMITED',
    stock: 6, newArrival: true, bestSeller: false, featured: false,
  },
  {
    id: 'p17', slug: 'off-duty-cargo', name: 'OFF DUTY CARGO',
    price: 2199, compareAt: null, category: 'bottoms', gender: 'men',
    desc: 'Six pockets, zero responsibilities. Ripstop cotton with an adjustable hem for dramatic exits.',
    images: ['photo-1624378439575-d8705ad7ae80', 'photo-1542272604-787c3835535d'],
    sizes: APPAREL_SIZES, colors: [OLIVE, JET], badge: null,
    stock: 20, newArrival: true, bestSeller: false, featured: true,
  },
  {
    id: 'p18', slug: 'wrong-place-trousers', name: 'WRONG PLACE TROUSERS',
    price: 1999, compareAt: 2299, category: 'bottoms', gender: 'men',
    desc: 'Tailored enough for the wedding, loose enough to leave early. Pleated front, side adjusters, main-character drape.',
    images: ['photo-1594938298603-c8148c4dae35', 'photo-1473966968600-fa801b869a1a'],
    sizes: APPAREL_SIZES, colors: [JET, CHALK], badge: null,
    stock: 13, newArrival: false, bestSeller: false, featured: false,
  },
  {
    id: 'p19', slug: 'denim-but-nalayak', name: 'DENIM, BUT MAKE IT NALAYAK',
    price: 2299, compareAt: null, category: 'bottoms', gender: 'women',
    desc: 'Rigid 13oz denim, straight leg, attitude included. Breaks in like a good grudge — slowly and permanently.',
    images: ['photo-1541099649105-f69ad21f3246', 'photo-1434389677669-e08b4cac3105'],
    sizes: APPAREL_SIZES, colors: [ASH, JET], badge: null,
    stock: 17, newArrival: false, bestSeller: true, featured: false,
  },
  {
    id: 'p20', slug: 'daily-chaos-joggers', name: 'DAILY CHAOS JOGGERS',
    price: 1799, compareAt: null, category: 'bottoms', gender: 'unisex',
    desc: 'For errands, escapes and everything in between. Loopback cotton, tapered leg, drawstring waist for flexible morals.',
    images: ['photo-1552902865-b72c031ac5ea', 'photo-1584865288642-42078afe6942'],
    sizes: APPAREL_SIZES, colors: [ASH, JET], badge: null,
    stock: 23, newArrival: false, bestSeller: false, featured: false,
  },
  {
    id: 'p21', slug: 'side-eye-cap', name: 'SIDE EYE CAP',
    price: 799, compareAt: null, category: 'accessories', gender: 'unisex',
    desc: 'Six panels of quiet judgement. Embroidered wordmark, adjustable strap, structured brim for maximum shade.',
    images: ['photo-1588850561407-ed78c282e89b', 'photo-1521369909029-2afed882baee'],
    sizes: ['OS'], colors: [JET, CHALK], badge: null,
    stock: 45, newArrival: true, bestSeller: false, featured: false,
  },
  {
    id: 'p22', slug: 'wrong-crowd-tote', name: 'WRONG CROWD TOTE',
    price: 999, compareAt: null, category: 'accessories', gender: 'unisex',
    desc: 'Carries groceries, books, and your entire personality. 16oz canvas, reinforced handles, screen-printed both sides.',
    images: ['photo-1553062407-98eeb64c6a62', 'photo-1504198458649-3128b932f49e'],
    sizes: ['OS'], colors: [CHALK, JET], badge: null,
    stock: 38, newArrival: false, bestSeller: true, featured: false,
  },
  {
    id: 'p23', slug: 'low-profile-sunnies', name: 'LOW PROFILE SUNNIES',
    price: 1499, compareAt: null, category: 'accessories', gender: 'unisex',
    desc: 'UV400 protection and plausible deniability. Acetate frames for avoiding eye contact in style.',
    images: ['photo-1511499767150-a48a237f0083', 'photo-1469334031218-e382a71b716b'],
    sizes: ['OS'], colors: [JET], badge: 'SOLD OUT',
    stock: 0, newArrival: false, bestSeller: false, featured: false,
  },
  {
    id: 'p24', slug: 'daily-chaos-sneakers', name: 'DAILY CHAOS SNEAKERS',
    price: 3499, compareAt: 3999, category: 'accessories', gender: 'unisex',
    desc: 'Cupsole sneakers built for 20,000 steps of questionable routing. Leather upper, gum sole, scuffs improve them.',
    images: ['photo-1552346154-21d32810aba3', 'photo-1543163521-1bf539c55dd2'],
    sizes: SHOE_SIZES, colors: [PAPER, JET], badge: null,
    stock: 10, newArrival: false, bestSeller: false, featured: true,
    has3D: true,
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MaterialsVariantsShoe/glTF-Binary/MaterialsVariantsShoe.glb',
    posterImage: 'photo-1552346154-21d32810aba3',
  },
  {
  id: 'p29',
  slug: 'nalayak-chain',
  name: 'NALAYAK CHAIN',
  price: 899,
  compareAt: null,
  category: 'accessories',
  gender: 'women',
  desc: 'Not jewelry. A problem attached to your jeans. Heavy-link metal chain made for wearing things slightly wrong.',
  images: ['/female-jeans-chain.png'],
  sizes: ['OS'],
  colors: [JET],
  badge: 'NEW',
  stock: 25,
  newArrival: true,
  bestSeller: false,
  featured: true,
},
  {
    id: 'p25', slug: 'midnight-cargo-tee', name: 'MIDNIGHT CARGO TEE',
    price: 1299, compareAt: null, category: 'tees', gender: 'unisex',
    desc: 'A club-first heavyweight tee with utility pocketing. Black on black, because subtlety is a choice we occasionally make.',
    images: ['photo-1507003211169-0a1dd7228f2d', 'photo-1488161628813-04466f872be2'],
    sizes: APPAREL_SIZES, colors: [JET], badge: 'CLUB',
    stock: 15, newArrival: false, bestSeller: false, featured: false,
    clubEarlyAccess: true,
    clubReleaseAt: daysAgo(1),
    publicReleaseAt: daysFromNow(4),
  },
  {
    id: 'p26', slug: 'the-500-hoodie', name: 'THE 500 HOODIE',
    price: 2999, compareAt: null, category: 'hoodies', gender: 'unisex',
    desc: 'Made for the first 500 and nobody else. Numbered internal label, 450 GSM fleece, never restocked.',
    images: ['photo-1550614000-4895a10e1bfd', 'photo-1576775068668-c147f14c36f7'],
    sizes: APPAREL_SIZES, colors: [JET, CHALK], badge: 'CLUB ONLY',
    stock: 8, newArrival: false, bestSeller: false, featured: false,
    clubOnly: true,
    clubReleaseAt: daysAgo(2),
    publicReleaseAt: null,
  },
  {
    id: 'p27', slug: 'static-noise-overshirt', name: 'STATIC NOISE OVERSHIRT',
    price: 2199, compareAt: null, category: 'shirts', gender: 'unisex',
    desc: 'Textured heavyweight overshirt. Club sees it Thursday. Everyone else squints until Friday.',
    images: ['photo-1591047139829-d91aecb6caea', 'photo-1485230895905-ec40ba36b9bc'],
    sizes: APPAREL_SIZES, colors: [ASH, JET], badge: 'CLUB',
    stock: 12, newArrival: false, bestSeller: false, featured: false,
    clubEarlyAccess: true,
    clubReleaseAt: daysFromNow(3),
    publicReleaseAt: daysFromNow(7),
  },
  {
    id: 'p28', slug: 'off-script-denim', name: 'OFF SCRIPT DENIM',
    price: 2499, compareAt: null, category: 'bottoms', gender: 'unisex',
    desc: 'The early-access denim that already went public. Rigid, straight, slightly confrontational.',
    images: ['photo-1541099649105-f69ad21f3246', 'photo-1434389677669-e08b4cac3105'],
    sizes: APPAREL_SIZES, colors: [ASH, JET], badge: null,
    stock: 20, newArrival: false, bestSeller: false, featured: false,
    clubEarlyAccess: true,
    clubReleaseAt: daysAgo(6),
    publicReleaseAt: daysAgo(2),
  },
];

export const collections = [
  {
    slug: 'the-chaos-edit', title: 'THE CHAOS EDIT',
    desc: 'Prints, volume, and a complete disregard for subtlety.',
    image: 'photo-1556905055-8f358a7a47b2',
    products: ['chaos-club-tee', 'bad-decisions-hoodie', 'anti-normal-hoodie', 'wrong-crowd-tee', 'basically-famous-tee', 'off-duty-cargo'],
  },
  {
    slug: 'after-hours', title: 'AFTER HOURS',
    desc: 'For the plans that start after midnight.',
    image: 'photo-1638638977172-9f7169a77930',
    products: ['after-dark-hoodie', 'after-hours-tee', 'night-shift-shirt', 'low-profile-sunnies'],
  },
  {
    slug: 'everyday-nalayak', title: 'EVERYDAY NALAYAK',
    desc: 'The daily uniform of the unapologetic.',
    image: 'photo-1441984904996-e0b6ba687e04',
    products: ['nalayak-standard-tee', 'frequency-tee', 'daily-chaos-joggers', 'wrong-crowd-tote', 'denim-but-nalayak', 'summer-of-chaos-shirt'],
  },
  {
    slug: 'limited-drops', title: 'LIMITED DROPS',
    desc: 'Small runs. Big regret if you miss them.',
    image: 'photo-1576775068668-c147f14c36f7',
    products: ['no-approval-oversized-tee', 'quiet-riot-shirt', 'wrong-place-trousers', 'her-chaos-crop-tee'],
  },
];

export const footerLinks = {
  SHOP: [
    { label: 'New Arrivals', to: '/new-arrivals' },
    { label: 'Men', to: '/men' },
    { label: 'Women', to: '/women' },
    { label: 'Tees', to: '/tees' },
    { label: 'Hoodies', to: '/hoodies' },
    { label: 'Bottoms', to: '/bottoms' },
    { label: 'Accessories', to: '/accessories' },
    { label: 'Collections', to: '/collections' },
  ],
  HELP: [
    { label: 'Contact', to: '/contact' },
    { label: 'Shipping', to: '/shipping' },
    { label: 'Returns', to: '/returns' },
    { label: 'Size Guide', to: '/size-guide' },
    { label: 'FAQ', to: '/faq' },
    { label: 'Track Order', to: '/track' },
  ],
  NALAYAK: [
    { label: 'Our Story', to: '/about' },
    { label: 'Members', to: '/membership' },
    { label: 'Custom Design', to: '/custom-design' },
    { label: 'Instagram', to: '/about' },
    { label: 'Terms', to: '/faq' },
    { label: 'Privacy', to: '/faq' },
  ],
};

export const listings = {
  'new-arrivals': { title: 'NEW ARRIVALS', kicker: 'JUST LANDED', desc: 'Fresh pieces. Questionable decisions.', filter: (p) => p.newArrival },
  men: { title: 'MEN', kicker: 'SHOP MEN', desc: 'Everything, engineered for trouble.', filter: (p) => p.gender === 'men' || p.gender === 'unisex' },
  women: { title: 'WOMEN', kicker: 'SHOP WOMEN', desc: 'Cut sharper. Worn louder.', filter: (p) => p.gender === 'women' || p.gender === 'unisex' },
  tees: { title: 'TEES', kicker: 'SHOP TEES', desc: 'Heavyweight cotton. Heavyweight opinions.', filter: (p) => p.category === 'tees' },
  shirts: { title: 'SHIRTS', kicker: 'SHOP SHIRTS', desc: 'Buttoned up. Never behaved.', filter: (p) => p.category === 'shirts' },
  hoodies: { title: 'HOODIES', kicker: 'SHOP HOODIES', desc: 'Fleece thick enough to hide in.', filter: (p) => p.category === 'hoodies' },
  bottoms: { title: 'BOTTOMS', kicker: 'SHOP BOTTOMS', desc: 'From the waist down, fully unserious.', filter: (p) => p.category === 'bottoms' },
  accessories: { title: 'ACCESSORIES', kicker: 'SHOP ACCESSORIES', desc: 'The finishing touches of a bad influence.', filter: (p) => p.category === 'accessories' },
};

export const formatINR = (n) =>
  `${site.currency}${Number(n).toLocaleString('en-IN')}`;

export const FREE_SHIPPING_THRESHOLD = 999;

export const membership = {
  heroImage: 'photo-1509631179647-0177331693ae',
  positioning: 'NOT A REWARDS PROGRAM. A MEMBERSHIP.',
  subline: 'For the ones who were never interested in fitting in.',
  benefits: [
    ['EARLY ACCESS', 'Shop selected drops before everyone else.'],
    ['PRIVATE DROPS', 'Access limited pieces created exclusively for members.'],
    ['MEMBER PRICING', 'Receive selected member-only offers.'],
    ['FIRST LOOKS', 'Be the first to see upcoming collections.'],
    ['SPECIAL EXPERIENCES', 'Occasional invitations, surprises and offline experiences.'],
  ],
  levels: [
    {
      name: 'NALAYAK', tag: 'Entry membership.',
      perks: ['Member pricing on selected pieces', 'First looks at upcoming collections'],
    },
    {
      name: 'INSIDER', tag: 'For returning members.',
      perks: ['Early access to selected drops', 'Member-only offers', 'Priority on restocks'],
    },
    {
      name: 'ICON', tag: 'For the people who have made Nalayak part of their uniform.',
      perks: ['Private drops', 'Special experiences and invitations', 'Pieces held before they sell out'],
    },
  ],
  offers: [
    { title: 'MEMBER PRICING — THE CHAOS EDIT', desc: 'Selected pieces, quieter prices. This week only.', to: '/collections/the-chaos-edit' },
    { title: 'EARLY ACCESS — AW26 PREVIEW', desc: 'The next drop opens to members 48 hours early.', to: '/new-arrivals' },
  ],
  activity: [
    ['AUG 2026', 'Membership activated'],
    ['AUG 2026', 'First look — AW26 preview unlocked'],
    ['SEP 2026', 'Early access — private drop window'],
  ],
  freeBenefits: [
    ['FIRST LOOKS', "See what's coming."],
    ['RESTOCK ACCESS', 'Know when the pieces return.'],
    ['WISHLIST', "Keep the ones you can't stop thinking about."],
    ['MEMBER STATUS', 'Earn your way from Nalayak to Icon.'],
  ],
  clubBenefits: [
    'EARLY DROP ACCESS',
    'PRIVATE DROPS',
    'MEMBER-ONLY PIECES',
    'PRIORITY RESTOCKS',
    'SELECTED MEMBER PRICING',
    'SPECIAL EXPERIENCES',
  ],
  comparison: [
    ['Account', true, true, true],
    ['Wishlist', true, true, true],
    ['First looks', true, true, true],
    ['Restock notifications', true, true, true],
    ['Early access', false, true, true],
    ['Private drops', false, true, true],
    ['Member-only pieces', false, true, true],
    ['Priority restocks', false, true, true],
    ['Special experiences', false, true, true],
    ['Founding status', false, false, true],
  ],
};

export const membershipConfig = {
  foundingActive: true,
  foundingMemberLimit: 500,
  foundingMemberPrice: 999,
  foundingMemberClaimed: 13,
  clubYearlyPrice: 999,
  clubCurrency: 'INR',
  clubBillingPeriod: 'year',
};

export const statusLevels = [
  { name: 'NALAYAK', minOrders: 0, copy: "You're just getting started.", unlocks: 'First looks at every collection' },
  { name: 'INSIDER', minOrders: 3, copy: "You're becoming part of the uniform.", unlocks: 'Early access to selected drops' },
  { name: 'ICON', minOrders: 6, copy: "You've made Nalayak part of yours.", unlocks: 'Private drops and special experiences' },
];

export const customDesign = {
  heroImage: 'photo-1556905055-8f358a7a47b2',
  garments: ['T-SHIRT', 'HOODIE', 'SHIRT', 'BOTTOMS', 'OTHER'],
  vibes: ['MINIMAL', 'GRAPHIC', 'OVERSIZED', 'STREET', 'EXPERIMENTAL', 'OTHER'],
  colours: [
    { name: 'Jet', hex: '#111111' },
    { name: 'Chalk', hex: '#F4F1EA' },
    { name: 'Ash', hex: '#8C8C8C' },
    { name: 'Olive', hex: '#4A5340' },
    { name: 'Maroon', hex: '#5C2E2E' },
    { name: 'Paper', hex: '#FFFFFF' },
  ],
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'OTHER'],
  budgets: ['UNDER ₹3,000', '₹3,000 — ₹6,000', '₹6,000 — ₹10,000', 'WHATEVER IT TAKES'],
};
