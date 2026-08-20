import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Reveal } from '@/components/Reveal';
import { getProducts } from '@/services/catalog';
import { formatReleaseLabel } from '@/services/membership';
import { useSeo } from '@/hooks/useSeo';

const API = () => process.env.REACT_APP_BACKEND_URL;
const getDropImage = (image) => {
  if (!image) return '';

  // Full external image URL.
  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  // Local/public image.
  if (image.startsWith('/')) {
    return image;
  }

  // Current product image IDs are resolved by the backend.
  return image;
};

async function adminFetch(path, key, options = {}) {
  const res = await fetch(`${API()}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key, ...(options.headers || {}) },
  });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error('failed');
  return res.json();
}

const ORDER_NEXT = { placed: 'shipped', shipped: 'delivered' };
const REQ_NEXT = { received: 'in-progress', 'in-progress': 'completed' };

function StatusButton({ label, onClick, testId }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="border border-ink px-4 py-2 text-[10px] tracking-[0.2em] font-medium hover:bg-ink hover:text-paper transition-colors"
    >
      {label}
    </button>
  );
}

export default function Admin() {
  useSeo('Admin', 'Internal.');
  const [key, setKey] = useState(() => localStorage.getItem('nalayak_admin') || '');
  const [input, setInput] = useState('');
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState(null);
  const [requests, setRequests] = useState(null);
  const [irl, setIrl] = useState(null);
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState(false);

const load = async (k) => {
  try {
    // Orders are currently backed by Supabase and are working.
    const o = await adminFetch('/api/admin/orders', k);

    setOrders(o.orders || []);
    localStorage.setItem('nalayak_admin', k);
    setKey(k);
    setError(false);

    // These two currently depend on local MongoDB.
    // Don't let them prevent admin login.
    try {
      const r = await adminFetch('/api/admin/custom-requests', k);
      setRequests(r.requests || []);
    } catch {
      setRequests([]);
    }

    try {
      const i = await adminFetch('/api/admin/irl', k);
      setIrl(i.items || []);
    } catch {
      setIrl([]);
    }
    try {
  const t = await adminFetch('/api/admin/support/tickets', k);
  setTickets(t.tickets || []);
} catch {
  setTickets([]);
}
  } catch {
    setError(true);
    if (!k) return;
    localStorage.removeItem('nalayak_admin');
    setKey('');
  }
};

  useEffect(() => {
    if (key) load(key);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
  fetch(
    `${process.env.REACT_APP_BACKEND_URL}/api/support/tickets`,
    {
      credentials: 'include',
    }
  )
    .then(async (res) => {
      if (!res.ok) {
        throw new Error('Failed to load support tickets');
      }

      return res.json();
    })
    .then((data) => {
      setTickets(data.tickets || []);
    })
    .catch((error) => {
      console.error('SUPPORT TICKETS ERROR:', error);
      setTickets([]);
    });
}, []);

  const act = async (fn, msg) => {
    try {
      await fn();
      toast.success(msg);
      await load(key);
    } catch {
      toast.error('Action failed.');
    }
  };

  if (!key) {
    return (
      <main className="px-4 md:px-8 max-w-[420px] mx-auto py-24 md:py-36" data-testid="admin-gate">
        <Reveal y={16}>
          <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">INTERNAL</p>
          <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-4xl md:text-5xl">STAFF ONLY.</h1>
          <form
            className="mt-10"
            onSubmit={(e) => {
              e.preventDefault();
              load(input.trim());
            }}
            data-testid="admin-gate-form"
          >
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ACCESS KEY"
              aria-label="Admin access key"
              data-testid="admin-key-input"
              className="w-full border border-ink bg-transparent px-5 py-4 text-sm tracking-[0.15em] placeholder:text-smoke/70 focus:outline-none focus:ring-1 focus:ring-ink"
            />
            {error && <p role="alert" className="mt-2 text-[11px] tracking-[0.15em] text-red-700">WRONG KEY.</p>}
            <button type="submit" data-testid="admin-enter-btn" className="mt-3 w-full bg-ink text-paper py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors">
              ENTER
            </button>
          </form>
        </Reveal>
      </main>
    );
  }

  return (
    <main className="px-4 md:px-8 max-w-[1200px] mx-auto py-10 md:py-16" data-testid="admin-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">INTERNAL</p>
          <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-4xl md:text-6xl">THE BACK ROOM</h1>
        </div>
        <button
          onClick={() => { localStorage.removeItem('nalayak_admin'); setKey(''); }}
          data-testid="admin-logout-btn"
          className="text-[11px] tracking-[0.25em] text-smoke hover:text-ink transition-colors"
        >
          LOG OUT
        </button>
      </div>

      <div className="mt-10 flex gap-2 border-b border-line pb-px" role="tablist">
        {['orders', 'custom', 'support', 'irl', 'drops'].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            data-testid={`admin-tab-${t}`}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-[11px] tracking-[0.25em] font-medium transition-colors ${tab === t ? 'bg-ink text-paper' : 'hover:bg-line'}`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === 'orders' && (
          <div className="divide-y divide-line border-y border-line" data-testid="admin-orders">
            {(orders || []).length === 0 && <p className="py-10 text-smoke text-sm">No orders yet.</p>}
            {(orders || []).map((o) => (
              <div key={o.order_id} className="py-4 grid md:grid-cols-[1fr_auto_auto] gap-3 items-center" data-testid={`admin-order-${o.order_id}`}>
                <div>
                  <p className="font-display font-bold tracking-tight">{o.order_id} <span className="text-smoke font-sans font-normal text-xs">— {o.email}</span></p>
                  <p className="text-[11px] text-smoke mt-0.5">{o.items?.map((i) => `${i.name} (${i.size})`).join(', ')} · ₹{(o.total || 0).toLocaleString('en-IN')}</p>
                </div>
                <span className="text-[10px] tracking-[0.25em] text-smoke">{(o.status || 'placed').toUpperCase()}</span>
                {ORDER_NEXT[o.status || 'placed'] ? (
                  <StatusButton
                    label={`MARK ${ORDER_NEXT[o.status || 'placed'].toUpperCase()}`}
                    testId={`admin-ship-${o.order_id}`}
                    onClick={() => act(() => adminFetch(`/api/orders/${o.order_id}/status`, key, { method: 'POST', body: JSON.stringify({ status: ORDER_NEXT[o.status || 'placed'] }) }), `${o.order_id} → ${ORDER_NEXT[o.status || 'placed']}. Customer emailed.`)}
                  />
                ) : (
                  <span className="text-[10px] tracking-[0.25em] text-smoke">DONE</span>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'custom' && (
          <div className="divide-y divide-line border-y border-line" data-testid="admin-custom">
            {(requests || []).length === 0 && <p className="py-10 text-smoke text-sm">No requests yet.</p>}
            {(requests || []).map((r) => (
              <div key={r.ref} className="py-4 grid md:grid-cols-[1fr_auto_auto] gap-3 items-center" data-testid={`admin-req-${r.ref}`}>
                <div>
                  <p className="font-display font-bold tracking-tight">{r.ref} <span className="text-smoke font-sans font-normal text-xs">— {r.name} · {r.email}</span></p>
                  <p className="text-[11px] text-smoke mt-0.5">{r.garment} · {r.size} · {(r.description || '').slice(0, 80)}</p>
                </div>
                <span className="text-[10px] tracking-[0.25em] text-smoke">{(r.status || 'received').toUpperCase()}</span>
                {REQ_NEXT[r.status || 'received'] ? (
                  <StatusButton
                    label={`MARK ${REQ_NEXT[r.status || 'received'].replace('-', ' ').toUpperCase()}`}
                    testId={`admin-advance-${r.ref}`}
                    onClick={() => act(() => adminFetch(`/api/custom-requests/${r.ref}/status`, key, { method: 'POST', body: JSON.stringify({ status: REQ_NEXT[r.status || 'received'] }) }), `${r.ref} → ${REQ_NEXT[r.status || 'received']}. Customer emailed.`)}
                  />
                ) : (
                  <span className="text-[10px] tracking-[0.25em] text-smoke">DONE</span>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'support' && (
  <div
    className="divide-y divide-line border-y border-line"
    data-testid="admin-support"
  >
    {(tickets || []).length === 0 && (
      <p className="py-10 text-smoke text-sm">
        No support tickets.
      </p>
    )}

    {(tickets || []).map((ticket) => (
      <div
        key={ticket.ticket_number}
        className="py-6"
        data-testid={`admin-ticket-${ticket.ticket_number}`}
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">

          {/* TICKET DETAILS */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="font-display font-bold tracking-tight text-lg">
                {ticket.ticket_number}
              </p>

              <span className="text-[10px] tracking-[0.25em] text-smoke">
                {(ticket.status || 'open').toUpperCase()}
              </span>
            </div>

            <div className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <p className="text-[10px] tracking-[0.2em] text-smoke mb-1">
                  ORDER
                </p>
                <p>{ticket.order_id || '—'}</p>
              </div>

              <div>
                <p className="text-[10px] tracking-[0.2em] text-smoke mb-1">
                  ISSUE
                </p>
                <p>{ticket.issue_type || '—'}</p>
              </div>

              <div>
                <p className="text-[10px] tracking-[0.2em] text-smoke mb-1">
                  PRODUCT
                </p>
                <p>{ticket.product_name || '—'}</p>
              </div>

              <div>
                <p className="text-[10px] tracking-[0.2em] text-smoke mb-1">
                  CREATED
                </p>
                <p>
                  {ticket.created_at
                    ? new Date(ticket.created_at).toLocaleString('en-IN')
                    : '—'}
                </p>
              </div>
            </div>

            <div className="mt-5 border-l-2 border-ink pl-4">
              <p className="text-[10px] tracking-[0.2em] text-smoke mb-2">
                CUSTOMER MESSAGE
              </p>
              <p className="text-sm leading-relaxed text-ink/75">
                {ticket.description}
              </p>
            </div>

            {/* CUSTOMER IMAGES */}
            {Array.isArray(ticket.images) && ticket.images.length > 0 && (
              <div className="mt-5">
                <p className="text-[10px] tracking-[0.2em] text-smoke mb-3">
                  ATTACHMENTS
                </p>

                <div className="flex flex-wrap gap-3">
                  {ticket.images.map((image, index) => (
                    <a
                      key={index}
                      href={image}
                      target="_blank"
                      rel="noreferrer"
                      className="block border border-line"
                    >
                      <img
                        src={image}
                        alt={`Ticket attachment ${index + 1}`}
                        className="w-24 h-24 object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* EXISTING ADMIN NOTE */}
            {ticket.admin_note && (
              <div className="mt-5">
                <p className="text-[10px] tracking-[0.2em] text-smoke mb-2">
                  ADMIN NOTE
                </p>
                <p className="text-sm text-ink/70">
                  {ticket.admin_note}
                </p>
              </div>
            )}
          </div>

          {/* ADMIN ACTIONS */}
          <div className="w-full md:w-[260px] border border-line p-4">
            <p className="text-[10px] tracking-[0.25em] text-smoke mb-4">
              UPDATE TICKET
            </p>

            <select
              defaultValue={ticket.status || 'open'}
              id={`ticket-status-${ticket.ticket_number}`}
              className="w-full border border-line bg-transparent px-3 py-3 text-sm outline-none"
            >
              <option value="open">OPEN</option>
<option value="in-review">IN REVIEW</option>
<option value="waiting-customer">WAITING FOR CUSTOMER</option>
<option value="resolved">RESOLVED</option>
<option value="closed">CLOSED</option>
            </select>

            <textarea
              id={`ticket-note-${ticket.ticket_number}`}
              defaultValue={ticket.admin_note || ''}
              placeholder="Internal note / response..."
              rows={4}
              className="mt-3 w-full border border-line bg-transparent px-3 py-3 text-sm outline-none resize-none"
            />

            <button
              onClick={() => {
                const status = document.getElementById(
                  `ticket-status-${ticket.ticket_number}`
                ).value;

                const admin_note = document.getElementById(
                  `ticket-note-${ticket.ticket_number}`
                ).value;

                act(
                  () =>
                    adminFetch(
                      `/api/admin/support/tickets/${encodeURIComponent(ticket.ticket_number)}/status`,
                      key,
                      {
                        method: 'POST',
                        body: JSON.stringify({
                          status,
                          admin_note,
                        }),
                      }
                    ),
                  `${ticket.ticket_number} updated.`
                );
              }}
              className="mt-3 w-full bg-ink text-paper py-3 text-[10px] tracking-[0.2em] font-medium hover:bg-ink/85 transition-colors"
            >
              SAVE UPDATE
            </button>
          </div>
        </div>
      </div>
    ))}
  </div>
)}

        {tab === 'irl' && (
          <div data-testid="admin-irl">
            {(irl || []).length === 0 && <p className="py-10 text-smoke text-sm">No uploads yet.</p>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(irl || []).map((u) => (
                <div key={u.id} className="border border-line" data-testid={`admin-irl-${u.id}`}>
                  <div className="aspect-square bg-white overflow-hidden">
                    <img src={`${API()}/api/admin/irl-file/${u.id}?auth=${encodeURIComponent(key)}`} alt={u.original_filename || 'IRL upload'} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] tracking-[0.2em] text-smoke">{u.status.toUpperCase()} {u.order_id ? `· ${u.order_id}` : ''}</p>
                    <div className="mt-2 flex gap-2">
                      {u.status !== 'approved' && (
                        <StatusButton label="APPROVE" testId={`admin-approve-${u.id}`} onClick={() => act(() => adminFetch(`/api/admin/irl/${u.id}/status`, key, { method: 'POST', body: JSON.stringify({ status: 'approved' }) }), 'Approved — live in NALAYAK IRL.')} />
                      )}
                      {u.status !== 'rejected' && (
                        <StatusButton label="REJECT" testId={`admin-reject-${u.id}`} onClick={() => act(() => adminFetch(`/api/admin/irl/${u.id}/status`, key, { method: 'POST', body: JSON.stringify({ status: 'rejected' }) }), 'Rejected.')} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'drops' && (
          <div className="divide-y divide-line border-y border-line" data-testid="admin-drops">
            {getProducts()
              .filter((p) => p.clubOnly || p.clubEarlyAccess || p.clubReleaseAt)
              .map((p) => (
                <div key={p.slug} className="py-4 grid md:grid-cols-[1fr_auto_auto] gap-3 items-center" data-testid={`admin-drop-${p.slug}`}>
                  <div>
                    <p className="font-display font-bold tracking-tight">{p.name}</p>
                    <p className="text-[11px] text-smoke mt-0.5">
                      CLUB {p.clubReleaseAt ? formatReleaseLabel(p.clubReleaseAt) : 'ONLY'} · PUBLIC {p.publicReleaseAt ? formatReleaseLabel(p.publicReleaseAt) : 'NEVER'}
                    </p>
                  </div>
                  <span />
                  <StatusButton
                    label="SEND DROP ALERTS"
                    testId={`admin-golive-${p.slug}`}
                    onClick={async () => {
                      try {
                      const d = await adminFetch(
  '/api/drops/go-live',
  key,
  {
    method: 'POST',
    body: JSON.stringify({
      slug: p.slug,
      name: p.name,
      image: getDropImage(p.images?.[0]),
    }),
  }
);
                        toast.success(`${d.sent} member${d.sent === 1 ? '' : 's'} emailed.`, { description: p.name });
                      } catch {
                        toast.error('Blast failed.');
                      }
                    }}
                  />
                </div>
              ))}
            <p className="py-4 text-[10px] tracking-[0.2em] text-smoke">Sends the "IT'S LIVE" email to everyone registered for that piece. Each member is emailed once.</p>
          </div>
        )}
      </div>
    </main>
  );
}
