import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import SafeImg from '@/components/SafeImg';

export const megaMenuData = {
  COLLECTIONS: {
    label: 'COLLECTIONS',
    viewAllLink: '/collections',
    viewAllText: 'VIEW ALL COLLECTIONS',
    items: [
      {
        title: 'THE CHAOS EDIT',
        subtitle: 'AW26 // 240 GSM DROP',
        image: '/collections/the-chaos-edit.jpg',
        to: '/collections/the-chaos-edit',
      },
      {
        title: 'AFTER HOURS',
        subtitle: 'MIDNIGHT STEALTH FLEECE',
        image: '/collections/after-hours.jpg',
        to: '/collections/after-hours',
      },
      {
        title: 'EVERYDAY NALAYAK',
        subtitle: 'DAILY ESSENTIALS UNIFORM',
        image: '/collections/everyday-nalayak.jpg',
        to: '/collections/everyday-nalayak',
      },
      {
        title: 'LIMITED DROPS',
        subtitle: 'ARCHIVE SPECIMEN RUNS',
        image: '/collections/limited-drops.jpg',
        to: '/collections/limited-drops',
      },
      {
        title: 'THE WRONG CROWD',
        subtitle: 'EDITORIAL CAMPAIGN',
        image: '/hero/hero-chaos-edit.jpg',
        to: '/collections',
      },
      {
        title: 'ATELIER CRAFT',
        subtitle: 'STUDIO STORY // MADE IN INDIA',
        image: '/editorial/about-atelier-craft.jpg',
        to: '/about',
      },
    ],
  },
  'NEW IN': {
    label: 'NEW IN',
    viewAllLink: '/new-arrivals',
    viewAllText: 'SHOP ALL NEW ARRIVALS',
    items: [
      {
        title: 'AW26 ARRIVALS',
        subtitle: 'FRESH STREETWEAR RUN',
        image: '/hero/hero-after-hours.jpg',
        to: '/new-arrivals',
      },
      {
        title: 'GRAPHIC TEES',
        subtitle: '240 GSM DROP-SHOULDER',
        image: '/products/devanagari-chaos-tee-front.jpg',
        to: '/tees',
      },
      {
        title: 'STEALTH HOODIES',
        subtitle: '450 GSM BOX-CUT FLEECE',
        image: '/products/after-hours-stealth-hoodie-front.jpg',
        to: '/hoodies',
      },
      {
        title: 'TACTICAL BOTTOMS',
        subtitle: 'UTILITY CARGOS & DENIM',
        image: '/female-jeans-chain.png',
        to: '/bottoms',
      },
      {
        title: 'ACCESSORIES',
        subtitle: 'HEADWEAR, HARDWARE & TOTES',
        image: '/products/nalayak-chain-front.png',
        to: '/accessories',
      },
      {
        title: 'JOIN THE CLUB',
        subtitle: 'MEMBER EXCLUSIVE ACCESS',
        image: '/hero/hero-everyday-nalayak.jpg',
        to: '/club',
      },
    ],
  },
  CATEGORIES: {
    label: 'CATEGORIES',
    viewAllLink: '/shop',
    viewAllText: 'EXPLORE FULL CATALOGUE',
    items: [
      {
        title: 'TEES',
        subtitle: '240 GSM COMBED COTTON',
        image: '/products/devanagari-chaos-tee-front.jpg',
        to: '/tees',
      },
      {
        title: 'SHIRTS',
        subtitle: 'HEAVYWEIGHT TWILL & RELAXED',
        image: 'photo-1596755094514-f87e34085b2c',
        to: '/shirts',
      },
      {
        title: 'HOODIES',
        subtitle: '450 GSM BRUSHED FLEECE',
        image: '/products/after-hours-stealth-hoodie-front.jpg',
        to: '/hoodies',
      },
      {
        title: 'BOTTOMS',
        subtitle: 'WIDE-LEG CARGOS & DENIM',
        image: '/female-jeans-chain.png',
        to: '/bottoms',
      },
      {
        title: 'ACCESSORIES',
        subtitle: 'HARDWARE, CAPS & BAGS',
        image: '/products/nalayak-chain-front.png',
        to: '/accessories',
      },
      {
        title: 'CUSTOM DESIGN',
        subtitle: 'BESPOKE 1-OF-1 ATELIER',
        image: '/editorial/about-hero-streetwear.jpg',
        to: '/custom-design',
      },
    ],
  },
  MEN: {
    label: 'MEN',
    viewAllLink: '/men',
    viewAllText: 'EXPLORE MEN’S STREETWEAR',
    items: [
      {
        title: 'BOXY TEES',
        subtitle: 'DROP-SHOULDER CUTS',
        image: '/products/devanagari-chaos-tee-front.jpg',
        to: '/tees',
      },
      {
        title: 'OVERSIZED HOODIES',
        subtitle: '450 GSM STEALTH FLEECE',
        image: '/products/after-hours-stealth-hoodie-front.jpg',
        to: '/hoodies',
      },
      {
        title: 'TACTICAL CARGOS',
        subtitle: 'BELLOWS UTILITY PANTS',
        image: '/female-jeans-chain.png',
        to: '/bottoms',
      },
      {
        title: 'AFTER HOURS DROP',
        subtitle: '03:00 AM CAPSULE',
        image: '/collections/after-hours.jpg',
        to: '/collections/after-hours',
      },
      {
        title: 'HARDWARE & HEADWEAR',
        subtitle: 'CHAINS, CAPS & SUNNIES',
        image: '/products/nalayak-chain-front.png',
        to: '/accessories',
      },
    ],
  },
  WOMEN: {
    label: 'WOMEN',
    viewAllLink: '/women',
    viewAllText: 'EXPLORE WOMEN’S STREETWEAR',
    items: [
      {
        title: 'HER CHAOS BABY TEE',
        subtitle: 'RIBBED CROPPED FIT',
        image: '/her-chaos-crop-tee-white.png',
        to: '/women',
      },
      {
        title: 'BOYFRIEND HOODIES',
        subtitle: 'RELAXED UNISEX DRAPING',
        image: '/products/after-hours-stealth-hoodie-front.jpg',
        to: '/hoodies',
      },
      {
        title: 'WIDE-LEG BOTTOMS',
        subtitle: 'HIGH-WAIST DENIM & CARGOS',
        image: '/female-jeans-chain.png',
        to: '/bottoms',
      },
      {
        title: 'THE CHAOS EDIT',
        subtitle: 'STATEMENT PIECES',
        image: '/collections/the-chaos-edit.jpg',
        to: '/collections/the-chaos-edit',
      },
      {
        title: 'TOTES & ACCESSORIES',
        subtitle: 'HEAVY CANVAS & HARDWARE',
        image: '/products/nalayak-chain-front.png',
        to: '/accessories',
      },
    ],
  },
};

export default function MegaMenu({ activeMenu, onClose, onMouseEnter, onMouseLeave }) {
  const menu = megaMenuData[activeMenu];
  if (!menu) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={activeMenu}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="absolute top-full left-0 right-0 bg-white border-b border-line shadow-[0_30px_70px_rgba(0,0,0,0.18)] z-50 overflow-hidden"
        style={{ backgroundColor: '#FFFFFF' }}
        data-testid={`mega-menu-drawer-${activeMenu.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="mx-auto max-w-[1600px] px-6 md:px-8 pt-5 pb-7">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-line">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ink" />
              <span className="text-[10px] tracking-[0.25em] font-mono text-smoke uppercase">
                {menu.label} // NALAYAK ATELIER
              </span>
            </div>
            <Link
              to={menu.viewAllLink}
              onClick={onClose}
              className="text-[10px] tracking-[0.2em] font-bold uppercase text-ink hover:text-smoke transition-colors flex items-center gap-1 group/all"
            >
              <span>{menu.viewAllText}</span>
              <ArrowRight size={12} className="transition-transform group-hover/all:translate-x-0.5" />
            </Link>
          </div>

          {/* Cards Track */}
          <div
            className={`grid gap-3.5 xl:gap-4.5 ${
              menu.items.length === 6 ? 'grid-cols-6' : 'grid-cols-5'
            }`}
          >
            {menu.items.map((item) => (
              <Link
                key={item.title}
                to={item.to}
                onClick={onClose}
                className="group block"
                data-testid={`mega-menu-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              >
                {/* Rounded Card Visual */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100 border border-black/10 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:border-ink/50">
                  <SafeImg
                    id={item.image}
                    w={600}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Typography Below Card */}
                <div className="pt-3 text-center">
                  <h4 className="text-[12px] xl:text-[13px] font-bold tracking-wider uppercase text-ink group-hover:text-smoke transition-colors leading-snug">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-[9.5px] tracking-[0.15em] font-mono text-smoke uppercase truncate">
                    {item.subtitle}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

