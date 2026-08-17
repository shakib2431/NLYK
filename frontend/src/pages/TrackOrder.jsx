import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SafeImg from '@/components/SafeImg';
import { Reveal } from '@/components/Reveal';
import { formatINR } from '@/data/storeData';
import { useSeo } from '@/hooks/useSeo';

const STEPS = ['PLACED', 'SHIPPED', 'DELIVERED'];

function FitUpload({ order }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [state, setState] = useState('idle');

  const pick = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) return;
    setState('uploading');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/irl/upload?order_id=${encodeURIComponent(order.order_id)}&name=${encodeURIComponent(order.name || '')}`,
        { method: 'POST', body: fd }
      );
      if (!res.ok) throw new Error('upload_failed');
      setState('done');
    } catch {
      setState('idle');
    }
  };

  if (state === 'done') {
    return (
      <div className="mt-14 border border-ink p-8 md:p-10 text-center" data-testid="fit-upload-done">
        <p className="font-display font-extrabold uppercase tracking-tight text-2xl">RECEIVED.</p>
        <p className="mt-2 text-smoke text-sm">We feature the good ones in NALAYAK IRL. No pressure.</p>
      </div>
    );
  }

  return (
    <div className="mt-14 border border-line p-6 md:p-10" data-testid="fit-upload">
      <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">DELIVERED. NOW SHOW US.</p>
      <h2 className="font-display font-extrabold uppercase tracking-tight text-2xl md:text-3xl">SHARE YOUR FIT</h2>
      <p className="mt-2 text-sm text-smoke max-w-md">Upload a fit pic. The good ones land in NALAYAK IRL on the homepage.</p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label
          className="border border-dashed border-smoke/60 px-6 py-8 text-center cursor-pointer hover:border-ink transition-colors text-[11px] tracking-[0.25em] font-medium"
          data-testid="fit-upload-dropzone"
        >
          {preview ? 'SWAP PHOTO' : 'CHOOSE PHOTO'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            data-testid="fit-upload-input"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </label>
        {preview && (
          <img src={preview} alt="Fit pic preview" className="h-32 w-24 object-cover border border-line" data-testid="fit-upload-preview" />
        )}
        {file && (
          <button
            onClick={submit}
            disabled={state === 'uploading'}
            data-testid="fit-upload-submit"
            className="bg-ink text-paper px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors disabled:opacity-50"
          >
            {state === 'uploading' ? 'UPLOADING' : 'SEND IT'}
          </button>
        )}
      </div>
    </div>
  );
}

export function Timeline({ order }) {
  const idx = Math.max(0, STEPS.indexOf((order.status || 'placed').toUpperCase()));
  const stamps = {
    PLACED: order.created_at,
    SHIPPED: order.shipped_at,
    DELIVERED: order.delivered_at,
  };
  return (
    <div className="mt-12" data-testid="order-timeline">
      <div className="flex items-center">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className={`h-3 w-3 border ${i <= idx ? 'bg-ink border-ink' : 'border-smoke bg-paper'}`} />
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px bg-line relative">
                <div
                  className="absolute inset-y-0 left-0 bg-ink transition-all duration-700"
                  style={{ width: i < idx ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3">
        {STEPS.map((step, i) => (
          <div key={step} className={i === 1 ? 'text-center' : i === 2 ? 'text-right' : ''}>
            <p className={`text-[11px] tracking-[0.25em] font-medium ${i <= idx ? 'text-ink' : 'text-smoke/60'}`}>{step}</p>
            <p className="text-[10px] text-smoke mt-1 tracking-wide">
              {stamps[step]
                ? new Date(stamps[step]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase()
                : i === idx + 1 ? 'NEXT' : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrackOrder() {
  useSeo('Track Order', 'Track your Nalayak order.');
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [order, setOrder] = useState(undefined);

  useEffect(() => {
    if (!orderId) return;
    setOrder(undefined);
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/orders/${encodeURIComponent(orderId.trim().toUpperCase())}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [orderId]);

  if (!orderId) {
    return (
      <main className="px-4 md:px-8 max-w-[560px] mx-auto py-16 md:py-28" data-testid="track-lookup">
        <Reveal y={16}>
          <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">ORDERS</p>
          <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-5xl md:text-6xl">TRACK ORDER</h1>
          <p className="mt-3 text-smoke text-sm">Your order number is in your receipt email. Starts with NLO-.</p>
          <form
            className="mt-10 flex"
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) navigate(`/track/${input.trim().toUpperCase()}`);
            }}
            data-testid="track-form"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="NLO-0000"
              aria-label="Order number"
              data-testid="track-input"
              className="flex-1 border border-ink bg-transparent px-5 py-4 text-sm tracking-[0.15em] uppercase placeholder:text-smoke/70 focus:outline-none focus:ring-1 focus:ring-ink"
            />
            <button type="submit" data-testid="track-submit-btn" className="bg-ink text-paper px-8 py-4 text-[11px] tracking-[0.3em] font-medium border border-ink border-l-0 hover:bg-ink/85 transition-colors">
              TRACK
            </button>
          </form>
        </Reveal>
      </main>
    );
  }

  if (order === undefined) {
    return (
      <main className="px-4 md:px-8 py-32 text-center">
        <p className="text-[11px] tracking-[0.35em] text-smoke animate-pulse">LOCATING YOUR ORDER</p>
      </main>
    );
  }

  if (order === null) {
    return (
      <main className="px-4 md:px-8 py-32 text-center" data-testid="track-not-found">
        <p className="font-display font-extrabold uppercase tracking-tight text-4xl">NO SUCH ORDER.</p>
        <p className="mt-3 text-smoke text-sm">Check the number in your receipt email. Typos happen to the best of us.</p>
        <Link to="/track" data-testid="track-again-btn" className="inline-block mt-8 border border-ink px-8 py-4 text-[11px] tracking-[0.3em] hover:bg-ink hover:text-paper transition-colors">
          TRY AGAIN
        </Link>
      </main>
    );
  }

  return (
    <main className="px-4 md:px-8 max-w-[900px] mx-auto py-12 md:py-20" data-testid="track-page">
      <Reveal y={16}>
        <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">ORDER {order.order_id}</p>
        <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-5xl md:text-6xl">
          {(order.status || 'placed').toUpperCase() === 'DELIVERED' ? "IT'S THERE." : (order.status || '').toUpperCase() === 'SHIPPED' ? "IT'S MOVING." : 'IN THE STUDIO.'}
        </h1>
        <p className="mt-3 text-smoke text-sm">
          Placed {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </Reveal>

      <Timeline order={order} />

      {(order.status || '').toLowerCase() === 'delivered' && <FitUpload order={order} />}

      <div className="mt-14 divide-y divide-line border-y border-line" data-testid="track-items">
        {order.items.map((i, n) => (
          <div key={n} className="py-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{i.name}</p>
              <p className="text-[11px] text-smoke mt-1 tracking-wide">{i.color} / {i.size} × {i.qty}</p>
            </div>
            <span className="text-sm font-semibold">{formatINR(i.price * i.qty)}</span>
          </div>
        ))}
        <div className="py-4 flex justify-between text-sm">
          <span className="text-smoke">Shipping</span>
          <span className="font-medium">{order.shipping === 0 ? 'FREE' : formatINR(order.shipping)}</span>
        </div>
        <div className="py-4 flex justify-between font-semibold">
          <span>Total</span>
          <span data-testid="track-total">{formatINR(order.total)}</span>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/account" data-testid="track-account-link" className="border border-ink px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink hover:text-paper transition-colors">
          VIEW YOUR ACCOUNT
        </Link>
        <Link to="/new-arrivals" className="px-8 py-4 text-[11px] tracking-[0.3em] font-medium text-smoke hover:text-ink transition-colors">
          KEEP SHOPPING
        </Link>
      </div>
    </main>
  );
}
