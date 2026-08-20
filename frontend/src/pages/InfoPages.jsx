import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import SafeImg from '@/components/SafeImg';
import { Reveal } from '@/components/Reveal';
import { useSeo } from '@/hooks/useSeo';

function PageShell({ kicker, title, children, testId }) {
  return (
    <main className="px-4 md:px-8 max-w-[900px] mx-auto py-12 md:py-20" data-testid={testId}>
      <Reveal y={16}>
        <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">{kicker}</p>
        <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-4xl md:text-6xl mb-10">{title}</h1>
      </Reveal>
      <div className="text-sm md:text-base leading-relaxed text-ink/80 space-y-5">{children}</div>
    </main>
  );
}

function Faq({ q, a, testId }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line">
      <button onClick={() => setOpen(!open)} data-testid={testId} className="w-full flex items-center justify-between py-5 text-left font-medium text-sm md:text-base">
        {q}
        <ChevronDown size={16} className={`shrink-0 ml-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-5 text-sm text-ink/70 leading-relaxed">{a}</p>}
    </div>
  );
}

export function About() {
  useSeo('Our Story', 'Why Nalayak exists.');
  return (
    <main data-testid="about-page">
      <section className="grid md:grid-cols-2 border-b border-line min-h-[70vh]">
        <div className="relative overflow-hidden min-h-[360px]">
          <SafeImg
            id="photo-1441984904996-e0b6ba687e04"
            w={1400}
            alt="Inside the Nalayak studio — racks of the current drop"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-col justify-center px-6 md:px-16 py-16 md:py-24">
          <Reveal>
            <p className="text-[11px] tracking-[0.3em] text-smoke mb-4">THE BRAND</p>
            <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-4xl md:text-6xl">
              WE DON'T MAKE CLOTHES FOR EVERYONE.
            </h1>
            <p className="mt-6 text-sm md:text-base text-ink/70 leading-relaxed max-w-md">
              NALAYAK started the way most bad decisions do — with complete conviction and zero outside approval. We looked at Indian fashion and saw two options: play it safe, or play it imported. We chose neither.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="px-4 md:px-8 py-20 md:py-28 max-w-[900px] mx-auto">
        <Reveal>
          <p className="text-[11px] tracking-[0.3em] text-smoke mb-3">THE STORY</p>
          <h2 className="font-display font-extrabold uppercase tracking-tight leading-[0.9] text-3xl md:text-5xl mb-10">
            BORN IN kolkata. RAISED BY THE WRONG CROWD.
          </h2>
          <div className="space-y-5 text-sm md:text-base leading-relaxed text-ink/80">
            <p>
              We make heavyweight, well-built clothes in kolkata for the people who never quite fit the mould. The ones who question the rules. The ones who make their own. The ones who would rather be remembered than approved.
            </p>
            <p>
              Every drop is small on purpose. Every graphic earns its place. Fabric is sourced like we have to wear it ourselves — because we do. If your relatives approve of your outfit, we've failed — and so, respectfully, have you.
            </p>
            <p className="font-semibold text-ink">Not for everyone. On purpose.</p>
          </div>
        </Reveal>
      </section>
    </main>
  );
}

export function Contact() {
  useSeo('Contact', 'Talk to Nalayak.');
  const [form, setForm] = useState({ name: '', email: '', msg: '' });
  const submit = (e) => {
    e.preventDefault();
    toast.success('Received. We reply fast — usually.', { description: 'Expect a response within 24 hours.' });
    setForm({ name: '', email: '', msg: '' });
  };
  return (
    <PageShell kicker="TALK TO US" title="CONTACT" testId="contact-page">
      <p>Complaints, compliments, conspiracy theories — all welcome at <span className="font-medium text-ink">hello@nalayak.in</span>. Or use the form. We actually read these.</p>
      <form onSubmit={submit} className="space-y-4 pt-4" data-testid="contact-form">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="NAME" data-testid="contact-name-input" className="w-full border border-ink bg-transparent px-5 py-4 text-sm placeholder:text-smoke/70 focus:outline-none focus:ring-1 focus:ring-ink" />
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="EMAIL" data-testid="contact-email-input" className="w-full border border-ink bg-transparent px-5 py-4 text-sm placeholder:text-smoke/70 focus:outline-none focus:ring-1 focus:ring-ink" />
        <textarea value={form.msg} onChange={(e) => setForm({ ...form, msg: e.target.value })} placeholder="WHAT'S THE PROBLEM" rows={5} data-testid="contact-message-input" className="w-full border border-ink bg-transparent px-5 py-4 text-sm placeholder:text-smoke/70 focus:outline-none focus:ring-1 focus:ring-ink" />
        <button type="submit" data-testid="contact-submit-btn" className="bg-ink text-paper px-10 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300">
          SEND IT
        </button>
      </form>
    </PageShell>
  );
}

export function SizeGuide() {
  useSeo('Size Guide', 'Nalayak size guide.');
  const rows = [
    ['XS', '36"', '26"', '25.5"'],
    ['S', '38"', '28"', '26"'],
    ['M', '40"', '30"', '26.5"'],
    ['L', '42"', '32"', '27"'],
    ['XL', '44"', '34"', '27.5"'],
  ];
  return (
    <PageShell kicker="FIT CHECK" title="SIZE GUIDE" testId="size-guide-page">
      <p>Our fits run relaxed. If you like it closer, size down. If you like drama, size up. Measurements below are garment measurements, not body.</p>
      <div className="overflow-x-auto pt-4">
        <table className="w-full text-sm border border-line" data-testid="size-table">
          <thead>
            <tr className="bg-ink text-paper text-[11px] tracking-[0.2em]">
              <th className="px-4 py-3 text-left">SIZE</th>
              <th className="px-4 py-3 text-left">CHEST</th>
              <th className="px-4 py-3 text-left">WAIST</th>
              <th className="px-4 py-3 text-left">LENGTH</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]} className="border-t border-line">
                {r.map((c, i) => (
                  <td key={i} className={`px-4 py-3 ${i === 0 ? 'font-semibold' : ''}`}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

export function Shipping() {
  useSeo('Shipping', 'Nalayak shipping policy.');
  return (
    <PageShell kicker="LOGISTICS" title="SHIPPING" testId="shipping-page">
      <p><span className="font-medium text-ink">Free shipping</span> on all orders above ₹999. Below that, a flat ₹99 — someone has to pay the courier, and we'd rather it be you on small orders.</p>
      <p>Orders dispatch within 48 hours from our Kolkata studio. Metro cities receive orders in 2–4 working days; everywhere else in India, 4–7 working days.</p>
      <p>Tracking hits your inbox the moment your order ships. If it hasn't moved in 5 days, write to us and we'll start making calls.</p>
      <p>International shipping is coming. The wrong crowd is global; our logistics are catching up.</p>
    </PageShell>
  );
}

export function Returns() {
  useSeo('Returns', 'Nalayak returns policy.');
  return (
    <PageShell kicker="NO DRAMA" title="RETURNS" testId="returns-page">
      <p>You get <span className="font-medium text-ink">7 days</span> from delivery to change your mind. Items must be unused, unwashed, and tagged — if it smells like the party, it's yours.</p>
      <p>Refunds land in 5–7 working days after we receive the piece. Exchanges for size are free, subject to stock.</p>
      <p>Limited drops and sale pieces are final sale. We warned you in the product description. We always warn you.</p>
      <p>To start a return, write to <span className="font-medium text-ink">returns@nalayak.in</span> with your order number. No interrogation, we promise.</p>
    </PageShell>
  );
}

export function FaqPage() {
  useSeo('FAQ', 'Frequently asked questions.');
  const faqs = [
    ['Are your clothes actually good quality?', 'Offensively so. 240–400 GSM fabrics, reinforced stitching, prints that survive both washes and opinions. Quality is the baseline; the attitude is the product.'],
    ['When do new drops happen?', 'Roughly once a month, in small runs. Join the newsletter or find out from someone better dressed than you.'],
    ['Do you restock sold-out pieces?', 'Rarely. Limited means limited. If you loved it and hesitated, consider this a character-building moment.'],
    ['Where do you ship?', 'All over India right now. International shipping is in the works.'],
    ['What does Nalayak even mean?', 'Look it up. Then buy the tee anyway.'],
    ['Can I return a limited drop?', 'No. Limited drops are final sale. Commitment issues are not a return reason.'],
  ];
  return (
    <PageShell kicker="ANSWERS" title="FAQ" testId="faq-page">
      <div className="border-t border-line">
        {faqs.map(([q, a], i) => (
          <Faq key={q} q={q} a={a} testId={`faq-item-${i}`} />
        ))}
      </div>
    </PageShell>
  );
}
