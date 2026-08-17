import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import SafeImg from '@/components/SafeImg';
import { Reveal } from '@/components/Reveal';
import { customDesign } from '@/data/storeData';
import { useSeo } from '@/hooks/useSeo';

const EMPTY = {
  name: '', email: '', phone: '', garment: '', description: '',
  vibes: [], colours: [], size: '', budget: '',
};

const inputCls =
  'w-full border border-ink bg-transparent px-5 py-4 text-sm tracking-wide placeholder:text-smoke/70 focus:outline-none focus:ring-1 focus:ring-ink';

function Field({ label, error, children, testId }) {
  return (
    <div data-testid={testId}>
      <p className="text-[11px] tracking-[0.25em] font-medium mb-3">{label}</p>
      {children}
      {error && <p role="alert" className="mt-2 text-[11px] tracking-[0.15em] text-red-700">{error}</p>}
    </div>
  );
}

function Pills({ options, selected, onToggle, multi = true, testPrefix }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = multi ? selected.includes(o) : selected === o;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={active}
            data-testid={`${testPrefix}-${o.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            onClick={() => onToggle(o)}
            className={`border px-5 py-3 text-[11px] tracking-[0.2em] transition-colors duration-200 ${active ? 'bg-ink text-paper border-ink' : 'border-line hover:border-ink'}`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export default function CustomDesign() {
  useSeo('Custom Design', 'Your idea. Our craft.');
  const [step, setStep] = useState('form');
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [refNo, setRefNo] = useState('');
  const fileInput = useRef(null);
  const formRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleMulti = (k, v) =>
    setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));

  const addFiles = (list) => {
    Array.from(list).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) =>
        setFiles((prev) => [...prev, { name: file.name, preview: e.target.result }]);
      reader.readAsDataURL(file);
    });
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'WE NEED A NAME.';
    if (!form.email.includes('@')) e.email = 'A REAL EMAIL, PLEASE.';
    if (!form.garment) e.garment = 'PICK A GARMENT.';
    if (form.description.trim().length < 10) e.description = 'GIVE US AT LEAST A SENTENCE.';
    if (!form.size) e.size = 'PICK A SIZE.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const review = () => {
    if (!validate()) {
      toast.error('A few things are missing.', { description: 'Check the marked fields.' });
      return;
    }
    setStep('summary');
    window.scrollTo(0, 0);
  };

  const submit = async () => {
    let ref = `NL-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/custom-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, images: files.map((f) => f.name) }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ref) ref = data.ref;
        if (data.emailed) {
          toast.success('Confirmation email sent.', { description: form.email });
        }
      }
    } catch { /* offline — keep mock ref */ }
    setRefNo(ref);
    try {
      const prev = JSON.parse(localStorage.getItem('nalayak_custom_requests') || '[]');
      localStorage.setItem(
        'nalayak_custom_requests',
        JSON.stringify([...prev, { ref, ...form, images: files.map((f) => f.name), at: new Date().toISOString() }])
      );
    } catch { /* storage full — mock anyway */ }
    setStep('success');
    window.scrollTo(0, 0);
  };

  if (step === 'success') {
    return (
      <main className="px-4 md:px-8 py-32 md:py-44 max-w-[900px] mx-auto text-center" data-testid="custom-success">
        <p className="text-[11px] tracking-[0.35em] text-smoke mb-4">REQUEST {refNo}</p>
        <h1 className="font-display font-black uppercase tracking-tighter leading-[0.85] text-[12vw] md:text-[6vw]">
          REQUEST RECEIVED.
        </h1>
        <p className="mt-6 text-smoke text-sm md:text-base max-w-md mx-auto">
          Your idea is now with the Nalayak team. We'll review it and get back to you with the next step.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/" data-testid="custom-back-home-btn" className="bg-ink text-paper px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors">
            BACK TO NALAYAK
          </Link>
          <Link to="/account" data-testid="custom-view-account-btn" className="border border-ink px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink hover:text-paper transition-colors">
            VIEW YOUR ACCOUNT
          </Link>
        </div>
      </main>
    );
  }

  if (step === 'summary') {
    const rows = [
      ['GARMENT', form.garment],
      ['SIZE', form.size],
      ['VIBE', form.vibes.join(', ') || '—'],
      ['COLOURS', form.colours.join(', ') || '—'],
      ['BUDGET', form.budget || 'OPEN'],
      ['IDEA', form.description],
    ];
    return (
      <main className="px-4 md:px-8 py-16 md:py-24 max-w-[900px] mx-auto" data-testid="custom-summary">
        <Reveal y={16}>
          <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">LAST LOOK</p>
          <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-5xl md:text-7xl mb-12">YOUR REQUEST</h1>
        </Reveal>
        <div className="divide-y divide-line border-y border-line">
          {rows.map(([k, v]) => (
            <div key={k} className="grid md:grid-cols-[200px_1fr] gap-2 py-5">
              <span className="text-[11px] tracking-[0.25em] text-smoke">{k}</span>
              <span className="text-sm leading-relaxed">{v}</span>
            </div>
          ))}
          <div className="grid md:grid-cols-[200px_1fr] gap-2 py-5">
            <span className="text-[11px] tracking-[0.25em] text-smoke">REFERENCE IMAGES</span>
            <div className="flex flex-wrap gap-3">
              {files.length === 0 && <span className="text-sm text-smoke">None attached</span>}
              {files.map((f) => (
                <img key={f.name} src={f.preview} alt={f.name} className="h-20 w-16 object-cover border border-line" />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <button onClick={submit} data-testid="custom-submit-btn" className="bg-ink text-paper px-10 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors">
            SUBMIT REQUEST
          </button>
          <button onClick={() => setStep('form')} data-testid="custom-edit-btn" className="border border-ink px-10 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink hover:text-paper transition-colors">
            EDIT REQUEST
          </button>
        </div>
      </main>
    );
  }

  return (
    <main data-testid="custom-design-page">
      <section className="grid md:grid-cols-2 border-b border-line">
        <div className="flex flex-col justify-center px-6 md:px-16 py-16 md:py-28 order-2 md:order-1">
          <Reveal>
            <p className="text-[11px] tracking-[0.3em] text-smoke mb-4">CUSTOM DESIGN</p>
            <h1 className="font-display font-black uppercase tracking-tighter leading-[0.85] text-[13vw] md:text-[5.5vw]">
              MAKE IT YOURS.
            </h1>
            <p className="mt-6 text-sm md:text-base text-ink/70 max-w-md leading-relaxed">
              Have an idea that doesn't exist yet? Tell us what you're thinking. Our team will take it from there.
            </p>
            <p className="mt-4 text-[11px] tracking-[0.25em] text-smoke">YOUR IDEA. OUR CRAFT. NOT OFF THE SHELF.</p>
            <button
              onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
              data-testid="start-request-btn"
              className="mt-8 bg-ink text-paper px-10 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300"
            >
              START A REQUEST
            </button>
          </Reveal>
        </div>
        <div className="relative overflow-hidden min-h-[320px] md:min-h-[560px] order-1 md:order-2">
          <SafeImg id={customDesign.heroImage} w={1400} alt="Nalayak custom studio" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </section>

      <section ref={formRef} className="px-4 md:px-8 py-20 md:py-28 max-w-[900px] mx-auto" data-testid="custom-form-section">
        <div className="space-y-16">
          <Reveal>
            <div>
              <p className="font-display font-black text-smoke/40 text-4xl tracking-tighter mb-6">01</p>
              <h2 className="font-display font-extrabold uppercase tracking-tight text-2xl md:text-3xl mb-8">WHO ARE YOU</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="NAME" error={errors.name} testId="field-name">
                  <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="YOUR NAME" aria-label="Name" data-testid="custom-name-input" className={inputCls} />
                </Field>
                <Field label="EMAIL" error={errors.email} testId="field-email">
                  <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="YOU@EMAIL.COM" aria-label="Email" data-testid="custom-email-input" className={inputCls} />
                </Field>
                <Field label="PHONE" testId="field-phone">
                  <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="OPTIONAL" aria-label="Phone" data-testid="custom-phone-input" className={inputCls} />
                </Field>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div>
              <p className="font-display font-black text-smoke/40 text-4xl tracking-tighter mb-6">02</p>
              <h2 className="font-display font-extrabold uppercase tracking-tight text-2xl md:text-3xl mb-8">THE PIECE</h2>
              <div className="space-y-8">
                <Field label="WHAT ARE YOU LOOKING TO CREATE?" error={errors.garment} testId="field-garment">
                  <Pills options={customDesign.garments} selected={form.garment} multi={false} onToggle={(v) => set('garment', v)} testPrefix="garment" />
                </Field>
                <Field label="SIZE" error={errors.size} testId="field-size">
                  <Pills options={customDesign.sizes} selected={form.size} multi={false} onToggle={(v) => set('size', v)} testPrefix="size" />
                </Field>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div>
              <p className="font-display font-black text-smoke/40 text-4xl tracking-tighter mb-6">03</p>
              <h2 className="font-display font-extrabold uppercase tracking-tight text-2xl md:text-3xl mb-8">THE IDEA</h2>
              <Field label="DESCRIBE YOUR IDEA" error={errors.description} testId="field-description">
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={6}
                  placeholder="BE SPECIFIC. WE READ EVERY WORD."
                  aria-label="Describe your idea"
                  data-testid="custom-description-input"
                  className={inputCls}
                />
              </Field>
            </div>
          </Reveal>

          <Reveal>
            <div>
              <p className="font-display font-black text-smoke/40 text-4xl tracking-tighter mb-6">04</p>
              <h2 className="font-display font-extrabold uppercase tracking-tight text-2xl md:text-3xl mb-8">THE VIBE</h2>
              <Field label="WHAT'S THE VIBE?" testId="field-vibe">
                <Pills options={customDesign.vibes} selected={form.vibes} onToggle={(v) => toggleMulti('vibes', v)} testPrefix="vibe" />
              </Field>
            </div>
          </Reveal>

          <Reveal>
            <div>
              <p className="font-display font-black text-smoke/40 text-4xl tracking-tighter mb-6">05</p>
              <h2 className="font-display font-extrabold uppercase tracking-tight text-2xl md:text-3xl mb-8">COLOURS & BUDGET</h2>
              <div className="space-y-8">
                <Field label="PREFERRED COLOURS" testId="field-colours">
                  <div className="flex flex-wrap gap-3">
                    {customDesign.colours.map((c) => {
                      const active = form.colours.includes(c.name);
                      return (
                        <button
                          key={c.name}
                          type="button"
                          aria-pressed={active}
                          data-testid={`colour-${c.name.toLowerCase().replace(/\s+/g, '-')}`}
                          onClick={() => toggleMulti('colours', c.name)}
                          className={`flex items-center gap-2 border px-4 py-2.5 text-[11px] tracking-[0.2em] transition-colors duration-200 ${active ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'}`}
                        >
                          <span className="h-3.5 w-3.5 border border-current" style={{ backgroundColor: c.hex }} />
                          {c.name.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="BUDGET RANGE — OPTIONAL" testId="field-budget">
                  <Pills options={customDesign.budgets} selected={form.budget} multi={false} onToggle={(v) => set('budget', form.budget === v ? '' : v)} testPrefix="budget" />
                </Field>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div>
              <p className="font-display font-black text-smoke/40 text-4xl tracking-tighter mb-6">06</p>
              <h2 className="font-display font-extrabold uppercase tracking-tight text-2xl md:text-3xl mb-8">INSPIRATION</h2>
              <div
                onClick={() => fileInput.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInput.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Upload inspiration images"
                data-testid="upload-dropzone"
                className="border border-dashed border-smoke/60 px-6 py-14 text-center cursor-pointer hover:border-ink transition-colors duration-300"
              >
                <Upload size={22} strokeWidth={1.5} className="mx-auto text-smoke" />
                <p className="mt-4 text-[11px] tracking-[0.25em] font-medium">UPLOAD INSPIRATION</p>
                <p className="mt-2 text-[11px] text-smoke tracking-wide">Screenshots, sketches, moodboards. Images only.</p>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  data-testid="upload-input"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                />
              </div>
              {files.length > 0 && (
                <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 gap-3" data-testid="upload-preview-list">
                  {files.map((f, i) => (
                    <div key={`${f.name}-${i}`} className="relative group border border-line">
                      <img src={f.preview} alt={f.name} className="h-28 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label={`Remove ${f.name}`}
                        data-testid={`upload-remove-${i}`}
                        className="absolute top-1.5 right-1.5 bg-ink text-paper p-1 opacity-90 hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                      <p className="px-2 py-1.5 text-[10px] tracking-wide text-smoke truncate">{f.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Reveal>

          <Reveal>
            <div className="pt-4 border-t border-ink">
              <button onClick={review} data-testid="custom-review-btn" className="bg-ink text-paper px-12 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300">
                REVIEW REQUEST
              </button>
              <p className="mt-4 text-[11px] tracking-[0.2em] text-smoke">CUSTOM PIECES ARE FINAL SALE. OBVIOUSLY.</p>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
