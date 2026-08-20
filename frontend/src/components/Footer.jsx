import { Link } from 'react-router-dom';
import { Instagram, Twitter, Youtube } from 'lucide-react';
import { footerLinks, site } from '@/data/storeData';

export default function Footer() {
  return (
    <footer className="bg-ink text-paper" data-testid="site-footer">
      <div className="mx-auto max-w-[1600px] px-4 md:px-8 pt-16 md:pt-24 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8 pb-16 border-b border-paper/15">
          <div className="col-span-2">
            <p className="text-[11px] tracking-[0.3em] text-paper/50 mb-4">THE FINE PRINT</p>
            <p className="text-sm text-paper/70 max-w-xs leading-relaxed">
              Clothes for the wrong crowd. Made in India, shipped everywhere, worn unapologetically.
            </p>
            <div className="flex gap-3 mt-6">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" data-testid="social-instagram" aria-label="Instagram" className="p-2 border border-paper/25 hover:bg-paper hover:text-ink transition-colors duration-300">
                <Instagram size={16} strokeWidth={1.5} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" data-testid="social-twitter" aria-label="Twitter" className="p-2 border border-paper/25 hover:bg-paper hover:text-ink transition-colors duration-300">
                <Twitter size={16} strokeWidth={1.5} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" data-testid="social-youtube" aria-label="YouTube" className="p-2 border border-paper/25 hover:bg-paper hover:text-ink transition-colors duration-300">
                <Youtube size={16} strokeWidth={1.5} />
              </a>
            </div>
          </div>
          {Object.entries(footerLinks).map(([col, links]) => (
            <div key={col}>
              <p className="text-[11px] tracking-[0.3em] text-paper/50 mb-4">{col}</p>
              <ul className="space-y-2.5">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      data-testid={`footer-${col.toLowerCase()}-${l.label.toLowerCase().replace(/\s+/g, '-')}`}
                      className="text-sm text-paper/75 hover:text-paper transition-colors duration-300"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="py-12 md:py-16 overflow-hidden">
  <p
    className="font-display font-extrabold uppercase tracking-tight leading-none text-[clamp(4.5rem,8vw,9rem)] text-paper/95 select-none"
    aria-hidden="true"
  >
    NALAYAK
  </p>
</div>

        <div className="flex flex-wrap items-center justify-between gap-6 pt-8 border-t border-paper/15">
          <p className="text-[11px] tracking-[0.15em] text-paper/50">
            © {new Date().getFullYear()} {site.name}. ALL WRONGS RESERVED.
          </p>
          <div className="flex items-center gap-2">
            {['UPI', 'VISA', 'MASTERCARD', 'RUPAY', 'COD'].map((p) => (
              <span key={p} className="border border-paper/25 px-2 py-1 text-[9px] tracking-[0.15em] text-paper/60">{p}</span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[11px] tracking-[0.15em] text-paper/50">
            <span>REGION:</span>
            <select
              data-testid="region-selector"
              className="bg-transparent border border-paper/25 px-2 py-1 text-paper/80 focus:outline-none"
              defaultValue="IN"
            >
              <option value="IN" className="text-ink">INDIA (₹ INR)</option>
              <option value="US" className="text-ink" disabled>GLOBAL — SOON</option>
            </select>
          </div>
        </div>
      </div>
    </footer>
  );
}
