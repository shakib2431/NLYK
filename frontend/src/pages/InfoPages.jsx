import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, MapPin, Clock, ArrowRight, Check } from 'lucide-react';
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
  useSeo('Contact', 'Talk to Nalayak — Direct line to the Kolkata studio.');
  const [topic, setTopic] = useState('orders');
  const [form, setForm] = useState({
    name: '',
    email: '',
    orderNo: '',
    customGarment: '',
    quantity: '',
    budget: '',
    subInquiryType: '',
    instagramUrl: '',
    msg: '',
  });
  const [sending, setSending] = useState(false);
  const [submittedRef, setSubmittedRef] = useState(null);
  const [submittedTopic, setSubmittedTopic] = useState('');

  const topics = [
    { id: 'orders', label: 'ORDERS & SHIPPING', hint: 'Tracking, delivery, exchanges & support' },
    { id: 'custom', label: 'CUSTOM / BESPOKE', hint: '1-of-1 pieces, bulk orders & commissions' },
    { id: 'general', label: 'GENERAL / EDITORIAL', hint: 'Collabs, press, creators & feedback' },
  ];

  const submit = async (e) => {
    e.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.msg.trim();
    const orderNo = form.orderNo.trim();
    const customGarment = form.customGarment.trim();
    const quantity = form.quantity.trim();
    const budget = form.budget.trim();
    const subInquiryType = form.subInquiryType.trim();
    const instagramUrl = form.instagramUrl.trim();

    if (!name) {
      toast.error('Name required', { description: 'Please enter your full name.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      toast.error('Invalid email', { description: 'Please enter a valid email address.' });
      return;
    }

    if (topic === 'custom' && (!customGarment || customGarment.length < 2)) {
      toast.error('Garment idea required', {
        description: 'Please describe the customization type or garment idea.',
      });
      return;
    }

    if (topic === 'general' && instagramUrl) {
      const socialPattern = /^(https?:\/\/[^\s]+|(?:www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?|@[a-zA-Z0-9._]+|[a-zA-Z0-9._]+)$/i;
      if (!socialPattern.test(instagramUrl)) {
        toast.error('Invalid link or handle', {
          description: 'Please provide a valid website URL or Instagram @handle.',
        });
        return;
      }
    }

    if (message.length < 5) {
      toast.error('Message too short', { description: 'Please provide at least 5 characters for your message.' });
      return;
    }

    const apiBase = process.env.REACT_APP_BACKEND_URL;
    if (!apiBase) {
      toast.error('Configuration error', { description: 'Backend service URL is not configured.' });
      return;
    }

    setSending(true);

    try {
      const response = await fetch(`${apiBase}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          topic,
          message,
          order_number: topic === 'orders' ? orderNo : '',
          custom_garment: topic === 'custom' ? customGarment : '',
          quantity: topic === 'custom' ? quantity : '',
          budget: topic === 'custom' ? budget : '',
          sub_inquiry_type: topic === 'general' ? subInquiryType : '',
          instagram_url: topic === 'general' ? instagramUrl : '',
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        let errorMsg = 'Failed to transmit message. Please try again.';
        if (response.status === 429 || data?.detail === 'too_many_requests') {
          errorMsg = 'Too many requests. Please wait a few minutes before sending another message.';
        } else if (data?.detail === 'custom_garment_required') {
          errorMsg = 'Customization type or garment idea is required for bespoke inquiries.';
        } else if (data?.detail === 'invalid_social_url') {
          errorMsg = 'The provided Instagram or portfolio link is invalid.';
        } else if (data?.detail === 'invalid_email') {
          errorMsg = 'The email address provided is invalid.';
        } else if (data?.detail) {
          errorMsg = typeof data.detail === 'string' ? data.detail : errorMsg;
        }

        toast.error('Dispatch failed', { description: errorMsg });
        // Preserve entered form data on error
        setSending(false);
        return;
      }

      // Backend confirmed receipt & storage
      setSubmittedRef(data.ref);
      setSubmittedTopic(topic);
      setForm({
        name: '',
        email: '',
        orderNo: '',
        customGarment: '',
        quantity: '',
        budget: '',
        subInquiryType: '',
        instagramUrl: '',
        msg: '',
      });
      toast.success('DISPATCH RECEIVED.', {
        description: `Reference ${data.ref} — logged at the Kolkata studio desk.`,
      });
    } catch (err) {
      console.error('Contact transmission error:', err);
      toast.error('Transmission error', {
        description: 'Unable to connect to the studio server. Please check your connection.',
      });
      // Preserve form data on error
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="px-4 md:px-8 max-w-[1400px] mx-auto py-10 md:py-20" data-testid="contact-page">
      {/* Breadcrumb Navigation */}
      <nav className="text-[10px] tracking-[0.25em] text-smoke mb-8" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-ink transition-colors">HOME</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">CONTACT</span>
      </nav>

      {/* Hero Header */}
      <Reveal y={16}>
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-ink/15 pb-8 mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block w-2 h-2 bg-ink" />
              <p className="text-[11px] tracking-[0.35em] text-smoke uppercase">
                COMMUNICATIONS // DIRECT LINE
              </p>
            </div>
            <h1 className="font-display font-black uppercase tracking-tighter leading-[0.88] text-4xl sm:text-6xl md:text-7xl">
              TALK TO THE<br />WRONG CROWD.
            </h1>
          </div>
          <div className="max-w-md">
            <p className="text-sm md:text-base text-smoke leading-relaxed">
              No chatbot deflection labyrinths. Real humans in our Kolkata studio reading every single message.
            </p>
          </div>
        </div>
      </Reveal>

      {/* Main Grid: Info Sidebar & Dynamic Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Left Column: Studio Channels & Direct Access */}
        <aside className="lg:col-span-5 space-y-6">
          {/* Quick Channels Card */}
          <div className="border border-ink bg-ink text-paper p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <span className="font-display font-black text-8xl text-paper">N</span>
            </div>

            <p className="text-[10px] tracking-[0.3em] text-paper/60 uppercase mb-4">
              DIRECT DESK DISPATCH
            </p>

            <div className="space-y-5">
              <div className="border-b border-paper/15 pb-4">
                <p className="text-[11px] tracking-[0.2em] text-paper/70">ORDERS & DISPATCH</p>
                <a
                  href="mailto:orders@nalayak.in"
                  className="font-display font-bold text-lg md:text-xl text-paper hover:underline decoration-1 underline-offset-4 flex items-center justify-between mt-1 group"
                >
                  <span>orders@nalayak.in</span>
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </a>
                <p className="text-xs text-paper/60 mt-1">Average response &lt; 4 hours during studio shifts</p>
              </div>

              <div className="border-b border-paper/15 pb-4">
                <p className="text-[11px] tracking-[0.2em] text-paper/70">GENERAL & COLLABORATIONS</p>
                <a
                  href="mailto:hello@nalayak.in"
                  className="font-display font-bold text-lg md:text-xl text-paper hover:underline decoration-1 underline-offset-4 flex items-center justify-between mt-1 group"
                >
                  <span>hello@nalayak.in</span>
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </a>
                <p className="text-xs text-paper/60 mt-1">Press, lookbooks, wholesale and creator queries</p>
              </div>

              <div>
                <p className="text-[11px] tracking-[0.2em] text-paper/70">BESPOKE / CUSTOM COMMISSIONS</p>
                <a
                  href="mailto:custom@nalayak.in"
                  className="font-display font-bold text-lg md:text-xl text-paper hover:underline decoration-1 underline-offset-4 flex items-center justify-between mt-1 group"
                >
                  <span>custom@nalayak.in</span>
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </a>
                <p className="text-xs text-paper/60 mt-1">Or submit through our dedicated <Link to="/custom-design" className="underline text-paper">custom portal</Link></p>
              </div>
            </div>
          </div>

          {/* Studio Location & Shift Hours */}
          <div className="border border-line bg-white p-6 md:p-8 space-y-4">
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-ink mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] tracking-[0.25em] text-smoke uppercase">ATELIER & HQ</p>
                <p className="font-semibold text-sm text-ink mt-0.5">Kolkata, West Bengal, India</p>
                <p className="text-xs text-smoke mt-1">Pattern cutting, design, and fulfillment under one roof.</p>
              </div>
            </div>

            <div className="border-t border-line pt-4 flex items-start gap-3">
              <Clock size={18} className="text-ink mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] tracking-[0.25em] text-smoke uppercase">STUDIO HOURS</p>
                <p className="font-semibold text-sm text-ink mt-0.5">Monday – Saturday · 11:00 AM – 8:00 PM IST</p>
                <p className="text-xs text-smoke mt-1">Sundays reserved for creative chaos.</p>
              </div>
            </div>
          </div>

          {/* Quick Help Link */}
          <div className="bg-line/40 border border-line p-5 flex items-center justify-between text-xs">
            <span className="text-smoke">Looking for existing order tracking?</span>
            <Link
              to="/track"
              className="font-semibold tracking-[0.15em] text-ink hover:underline uppercase inline-flex items-center gap-1"
            >
              TRACK ORDER →
            </Link>
          </div>
        </aside>

        {/* Right Column: High-Fashion Form or Confirmed Success */}
        <section className="lg:col-span-7 bg-white border border-line p-6 sm:p-8 md:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
          {submittedRef ? (
            <div className="border border-ink bg-paper p-8 sm:p-12 text-center" data-testid="contact-success-state">
              <div className="w-12 h-12 bg-ink text-paper mx-auto flex items-center justify-center mb-6">
                <Check size={24} />
              </div>
              <p className="text-[11px] tracking-[0.3em] text-smoke uppercase mb-2">
                TRANSMISSION LOGGED // ATELIER DESK
              </p>
              <h2 className="font-display font-black uppercase tracking-tighter text-3xl sm:text-4xl text-ink mb-3">
                DISPATCH CONFIRMED.
              </h2>
              <div className="inline-block border border-ink bg-white px-6 py-3 my-4">
                <p className="text-[10px] tracking-[0.25em] text-smoke uppercase">REFERENCE NUMBER</p>
                <p className="font-display font-black text-2xl md:text-3xl tracking-wider text-ink mt-0.5" data-testid="contact-ref-id">
                  {submittedRef}
                </p>
              </div>
              <p className="text-xs text-smoke uppercase tracking-wider mb-2">
                INQUIRY TOPIC: <span className="text-ink font-semibold">{submittedTopic.toUpperCase()}</span>
              </p>
              <p className="text-sm text-smoke max-w-md mx-auto leading-relaxed mt-2">
                Your inquiry has been stored in our studio system. A human from the wrong crowd will review your details and reply within 24 hours.
              </p>
              <div className="mt-8 pt-6 border-t border-line">
                <button
                  type="button"
                  onClick={() => setSubmittedRef(null)}
                  className="bg-ink text-paper px-8 py-4 text-[11px] tracking-[0.3em] font-bold uppercase hover:bg-ink/85 transition-colors duration-300"
                >
                  SEND ANOTHER NOTE
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="text-[10px] tracking-[0.3em] text-smoke uppercase mb-2">
                  DISPATCH NOTE
                </p>
                <h2 className="font-display font-extrabold uppercase tracking-tight text-2xl sm:text-3xl text-ink">
                  SEND A MESSAGE
                </h2>
                <p className="mt-1 text-sm text-smoke">
                  Select an inquiry type below to route your note directly to the right desk.
                </p>
              </div>

              {/* Inquiry Topic Tabs */}
              <div className="mb-8">
                <label className="block text-[10px] tracking-[0.25em] text-smoke uppercase mb-3">
                  SELECT TOPIC
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {topics.map((t) => {
                    const active = topic === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={sending}
                        onClick={() => setTopic(t.id)}
                        className={`text-left p-3 border transition-all duration-200 ${
                          active
                            ? 'border-ink bg-ink text-paper shadow-sm'
                            : 'border-line bg-paper/50 text-ink hover:border-ink/50'
                        } ${sending ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <p className="text-[11px] font-bold tracking-[0.15em] uppercase">{t.label}</p>
                        <p className={`text-[10px] mt-0.5 leading-snug ${active ? 'text-paper/70' : 'text-smoke'}`}>
                          {t.hint}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Form */}
              <form onSubmit={submit} className="space-y-5" data-testid="contact-form">
                {/* Common Fields: Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] tracking-[0.25em] text-smoke uppercase mb-1.5">
                      YOUR NAME <span className="text-ink">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={sending}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Kabir Sen"
                      data-testid="contact-name-input"
                      className="w-full border border-line bg-paper px-4 py-3.5 text-sm text-ink placeholder:text-smoke/50 focus:outline-none focus:border-ink transition-colors disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] tracking-[0.25em] text-smoke uppercase mb-1.5">
                      EMAIL ADDRESS <span className="text-ink">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      disabled={sending}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="e.g. kabir@gmail.com"
                      data-testid="contact-email-input"
                      className="w-full border border-line bg-paper px-4 py-3.5 text-sm text-ink placeholder:text-smoke/50 focus:outline-none focus:border-ink transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* TAB 1: Orders & Shipping Fields */}
                {topic === 'orders' && (
                  <div>
                    <label className="block text-[10px] tracking-[0.25em] text-smoke uppercase mb-1.5">
                      ORDER NUMBER <span className="text-smoke/60">(OPTIONAL BUT ENCOURAGED)</span>
                    </label>
                    <input
                      type="text"
                      disabled={sending}
                      value={form.orderNo}
                      onChange={(e) => setForm({ ...form, orderNo: e.target.value })}
                      placeholder="e.g. NLO-1042"
                      data-testid="contact-order-number-input"
                      className="w-full border border-line bg-paper px-4 py-3.5 text-sm text-ink placeholder:text-smoke/50 focus:outline-none focus:border-ink transition-colors disabled:opacity-50"
                    />
                  </div>
                )}

                {/* TAB 2: Custom / Bespoke Fields */}
                {topic === 'custom' && (
                  <>
                    <div>
                      <label className="block text-[10px] tracking-[0.25em] text-smoke uppercase mb-1.5">
                        CUSTOMIZATION TYPE / GARMENT IDEA <span className="text-ink">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={sending}
                        value={form.customGarment}
                        onChange={(e) => setForm({ ...form, customGarment: e.target.value })}
                        placeholder="e.g. Heavyweight hoodie embroidery, 1-of-1 distressed denim jacket"
                        data-testid="contact-custom-garment-input"
                        className="w-full border border-line bg-paper px-4 py-3.5 text-sm text-ink placeholder:text-smoke/50 focus:outline-none focus:border-ink transition-colors disabled:opacity-50"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] tracking-[0.25em] text-smoke uppercase mb-1.5">
                          QUANTITY <span className="text-smoke/60">(OPTIONAL)</span>
                        </label>
                        <input
                          type="text"
                          disabled={sending}
                          value={form.quantity}
                          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                          placeholder="e.g. 1 piece (sample), 25 pieces (bulk)"
                          data-testid="contact-quantity-input"
                          className="w-full border border-line bg-paper px-4 py-3.5 text-sm text-ink placeholder:text-smoke/50 focus:outline-none focus:border-ink transition-colors disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] tracking-[0.25em] text-smoke uppercase mb-1.5">
                          BUDGET RANGE <span className="text-smoke/60">(OPTIONAL)</span>
                        </label>
                        <input
                          type="text"
                          disabled={sending}
                          value={form.budget}
                          onChange={(e) => setForm({ ...form, budget: e.target.value })}
                          placeholder="e.g. ₹2,500 – ₹5,000, Flexible"
                          data-testid="contact-budget-input"
                          className="w-full border border-line bg-paper px-4 py-3.5 text-sm text-ink placeholder:text-smoke/50 focus:outline-none focus:border-ink transition-colors disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* TAB 3: General / Editorial Fields */}
                {topic === 'general' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] tracking-[0.25em] text-smoke uppercase mb-1.5">
                        INQUIRY TYPE <span className="text-smoke/60">(OPTIONAL)</span>
                      </label>
                      <select
                        disabled={sending}
                        value={form.subInquiryType}
                        onChange={(e) => setForm({ ...form, subInquiryType: e.target.value })}
                        data-testid="contact-sub-inquiry-select"
                        className="w-full border border-line bg-paper px-4 py-3.5 text-sm text-ink focus:outline-none focus:border-ink transition-colors disabled:opacity-50"
                      >
                        <option value="">Select Category...</option>
                        <option value="Collaboration">Creator Collaboration</option>
                        <option value="Press">Press & Media</option>
                        <option value="Wholesale">Wholesale & Stockist</option>
                        <option value="Feedback">Brand Feedback</option>
                        <option value="Other">Other Query</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] tracking-[0.25em] text-smoke uppercase mb-1.5">
                        INSTAGRAM / PORTFOLIO <span className="text-smoke/60">(OPTIONAL)</span>
                      </label>
                      <input
                        type="text"
                        disabled={sending}
                        value={form.instagramUrl}
                        onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })}
                        placeholder="e.g. @yourhandle or https://..."
                        data-testid="contact-instagram-input"
                        className="w-full border border-line bg-paper px-4 py-3.5 text-sm text-ink placeholder:text-smoke/50 focus:outline-none focus:border-ink transition-colors disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}

                {/* Dynamic Message Textarea */}
                <div>
                  <label className="block text-[10px] tracking-[0.25em] text-smoke uppercase mb-1.5">
                    {topic === 'orders'
                      ? 'MESSAGE / ISSUE DETAILS'
                      : topic === 'custom'
                      ? 'DESIGN BRIEF & VISION'
                      : 'PROPOSAL / MESSAGE'}{' '}
                    <span className="text-ink">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    disabled={sending}
                    value={form.msg}
                    onChange={(e) => setForm({ ...form, msg: e.target.value })}
                    placeholder={
                      topic === 'orders'
                        ? 'Tell us about your delivery, tracking, exchange or order issue…'
                        : topic === 'custom'
                        ? 'Describe your concept, vibe, artwork placement, colors, or deadlines…'
                        : 'Tell us about your proposal, portfolio, vision, or query…'
                    }
                    data-testid="contact-message-input"
                    className="w-full border border-line bg-paper px-4 py-3.5 text-sm text-ink placeholder:text-smoke/50 focus:outline-none focus:border-ink transition-colors resize-y leading-relaxed disabled:opacity-50"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <button
                    type="submit"
                    disabled={sending}
                    data-testid="contact-submit-btn"
                    className="inline-flex items-center justify-center gap-2 bg-ink text-paper px-8 py-4 text-[11px] tracking-[0.3em] font-bold uppercase hover:bg-ink/85 disabled:opacity-50 transition-all duration-300 group"
                  >
                    <span>{sending ? 'DISPATCHING...' : 'TRANSMIT MESSAGE'}</span>
                    <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </button>

                  <span className="text-[11px] text-smoke">
                    PRIVACY PROTECTED · NO SPAM
                  </span>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
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
