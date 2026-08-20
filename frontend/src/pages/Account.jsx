import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Reveal } from '@/components/Reveal';
import { useStore } from '@/context/StoreContext';
import { membership, membershipConfig, formatINR } from '@/data/storeData';
import { membershipTypeOf, getMembershipDisplay, getStatusProgress, hasClubAccess, getDropState } from '@/services/membership';
import { getProductBySlug } from '@/services/catalog';
import { Timeline } from '@/pages/TrackOrder';
import SafeImg from '@/components/SafeImg';
import { useSeo } from '@/hooks/useSeo';

const TABS = ['PROFILE', 'MEMBERSHIP', 'ORDERS', 'WISHLIST', 'ALERTS', 'ADDRESSES'];

function normalizeIndianPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (String(value || '').trim().startsWith('+') && digits.length >= 10) return `+${digits}`;
  return null;
}

const ALERT_LABEL = {
  'sold-out': 'RESTOCK ALERT',
  'coming-soon': 'DROP ALERT — COMING SOON',
  locked: 'DROP ALERT — CLUB ONLY',
  'club-live': 'DROP ALERT — LIVE FOR CLUB',
  public: 'DROP ALERT — PUBLIC',
};

function AlertsPanel() {
  const { dropAlerts, toggleDropAlert, member } = useStore();
  const items = dropAlerts.map((slug) => getProductBySlug(slug)).filter(Boolean);

  if (items.length === 0) {
    return (
      <div className="py-16 text-center border border-line" data-testid="alerts-empty">
        <p className="font-display font-extrabold uppercase tracking-tight text-2xl">NO ALERTS SET.</p>
        <p className="mt-2 text-smoke text-sm">Hit NOTIFY ME on any coming-soon or sold-out piece. We come to you first.</p>
        <Link to="/club/drops" data-testid="alerts-drops-link" className="inline-block mt-6 border border-ink px-6 py-3 text-[11px] tracking-[0.25em] hover:bg-ink hover:text-paper transition-colors">
          VIEW CLUB DROPS
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-line border-y border-line" data-testid="alerts-list">
      {items.map((p) => {
        const state = getDropState(p, member);
        return (
          <div key={p.slug} className="py-4 flex items-center gap-4" data-testid={`alert-row-${p.slug}`}>
            <Link to={`/product/${p.slug}`} className="h-16 w-12 bg-white border border-line overflow-hidden shrink-0">
              <SafeImg id={p.images[0]} w={200} alt={p.name} className="h-full w-full object-cover" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/product/${p.slug}`} className="text-sm font-medium hover:text-smoke transition-colors">
                {p.name}
              </Link>
              <p className="text-[10px] tracking-[0.2em] text-smoke mt-1">{ALERT_LABEL[state] || 'ALERT'}</p>
            </div>
            <button
              onClick={() => {
                toggleDropAlert(p.slug);
                toast('Alert removed.', { description: p.name });
              }}
              data-testid={`alert-remove-${p.slug}`}
              className="text-[10px] tracking-[0.25em] text-smoke hover:text-ink transition-colors underline underline-offset-4"
            >
              REMOVE
            </button>
          </div>
        );
      })}
    </div>
  );
}
function TicketForm({ order, onClose, onSubmitted }) {
  const [issueType, setIssueType] = useState('wrong_item');
  const [productName, setProductName] = useState(
    order.items?.length === 1 ? order.items[0].name : ''
  );
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const issueTypes = [
    ['wrong_item', 'WRONG ITEM'],
    ['damaged', 'DAMAGED / DEFECTIVE'],
    ['missing_item', 'MISSING ITEM'],
    ['size_issue', 'SIZE ISSUE'],
    ['delivery_issue', 'DELIVERY ISSUE'],
    ['return_refund', 'RETURN / REFUND'],
    ['other', 'OTHER'],
  ];

  const submitTicket = async (e) => {
    e.preventDefault();

    if (!description.trim() || description.trim().length < 10) {
      toast.error('Please describe the issue.', {
        description: 'Give us at least a little detail so we can help.',
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/support/tickets`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_id: order.order_id,
            issue_type: issueType,
            product_name: productName.trim(),
            description: description.trim(),
            images: [],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (
          response.status === 409 &&
          data.detail?.ticket_number
        ) {
          throw new Error(
            `You already have an open ticket for this order: ${data.detail.ticket_number}`
          );
        }

        if (data.detail === 'support_available_after_delivery') {
          throw new Error(
            'Issues can only be raised after an order is delivered.'
          );
        }

        throw new Error(
          data.detail || 'Could not submit your issue.'
        );
      }

      toast.success('ISSUE SUBMITTED.', {
        description: `Ticket ${data.ticket?.ticket_number || ''} has been created.`,
      });

      onSubmitted?.(data.ticket);
      onClose();
    } catch (error) {
      console.error('CREATE SUPPORT TICKET ERROR:', error);

      toast.error('Could not submit issue.', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-5 border border-ink bg-paper p-5 md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.25em] text-smoke">
            ORDER SUPPORT
          </p>

          <h3 className="font-display font-black uppercase tracking-tight text-2xl mt-1">
            REPORT AN ISSUE.
          </h3>

          <p className="text-sm text-smoke mt-2">
            Tell us what went wrong and we'll take it from here.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-[10px] tracking-[0.25em] text-smoke hover:text-ink"
        >
          CLOSE ×
        </button>
      </div>

      <form
        onSubmit={submitTicket}
        className="mt-7 space-y-5"
        data-testid={`support-ticket-form-${order.order_id}`}
      >
        <div>
          <label className="block text-[10px] tracking-[0.25em] text-smoke mb-2">
            ORDER
          </label>

          <div className="border border-line px-4 py-3 text-sm font-medium">
            {order.order_id}
          </div>
        </div>

        <div>
          <label className="block text-[10px] tracking-[0.25em] text-smoke mb-2">
            WHAT'S WRONG?
          </label>

          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
            className="w-full border border-ink bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-ink"
          >
            {issueTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] tracking-[0.25em] text-smoke mb-2">
            PRODUCT
          </label>

          {order.items?.length > 1 ? (
            <select
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full border border-ink bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-ink"
            >
              <option value="">SELECT PRODUCT</option>

              {order.items.map((item, index) => (
                <option
                  key={`${item.name}-${index}`}
                  value={item.name}
                >
                  {item.name}
                  {item.size ? ` — SIZE ${item.size}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="border border-line px-4 py-3 text-sm">
              {productName || 'ORDER ITEM'}
            </div>
          )}
        </div>

        <div>
          <label className="block text-[10px] tracking-[0.25em] text-smoke mb-2">
            TELL US WHAT HAPPENED
          </label>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            rows={6}
            maxLength={2000}
            className="w-full border border-ink bg-transparent px-4 py-3 text-sm leading-relaxed placeholder:text-smoke/70 focus:outline-none focus:ring-1 focus:ring-ink resize-none"
          />

          <p className="text-[10px] text-smoke mt-2 tracking-wide">
            {description.length}/2000
          </p>
        </div>

        <div className="border border-line p-4">
          <p className="text-[10px] tracking-[0.25em] text-smoke">
            PHOTOS
          </p>

          <p className="text-xs text-smoke mt-1">
            Photo upload is coming next. Your written issue will still be
            submitted normally.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-ink text-paper px-7 py-4 text-[11px] tracking-[0.25em] font-medium hover:bg-ink/85 transition-colors disabled:opacity-50"
          >
            {submitting ? 'SUBMITTING…' : 'SUBMIT ISSUE'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="border border-ink px-7 py-4 text-[11px] tracking-[0.25em] hover:bg-ink hover:text-paper transition-colors"
          >
            CANCEL
          </button>
        </div>
      </form>
    </div>
  );
}

function OrderRow({ o }) {
 const [open, setOpen] = useState(false);
const [reportingIssue, setReportingIssue] = useState(false);
const [ticket, setTicket] = useState(null);

useEffect(() => {
  fetch(
    `${process.env.REACT_APP_BACKEND_URL}/api/support/tickets`,
    {
      credentials: 'include',
    }
  )
    .then((r) => r.json())
    .then((data) => {
      const myTicket = (data.tickets || []).find(
        (t) => t.order_id === o.order_id
      );

      if (myTicket) {
        setTicket(myTicket);
      }
    })
    .catch(() => {});
}, [o.order_id]);

  const delivered =
    String(o.status || '').toLowerCase() === 'delivered';

  return (
    <div className="py-5" data-testid={`order-row-${o.order_id}`}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        data-testid={`order-toggle-${o.order_id}`}
        className="w-full grid sm:grid-cols-[1fr_auto] gap-3 text-left group"
      >
        <div>
          <p className="font-display font-bold tracking-tight text-lg flex items-center gap-2">
            {o.order_id}

            <ChevronDown
              size={14}
              className={`text-smoke transition-transform duration-300 ${
                open ? 'rotate-180' : ''
              }`}
            />
          </p>

          <p className="text-[11px] text-smoke tracking-wide mt-1">
            {new Date(o.created_at)
              .toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
              .toUpperCase()}
            {' · '}
            {o.items.reduce((s, i) => s + (i.qty || 1), 0)} ITEM
            {o.items.length !== 1 ? 'S' : ''}
          </p>

          <p className="text-[12px] text-ink/70 mt-2">
            {o.items
              .map((i) => `${i.name} (${i.size})`)
              .join(', ')}
          </p>
        </div>

        <div className="sm:text-right">
          <p className="font-semibold">
            ₹{(o.total || 0).toLocaleString('en-IN')}
          </p>

          <p className="text-[10px] tracking-[0.25em] text-smoke mt-1">
            {(o.status || 'placed').toUpperCase()}
          </p>
        </div>
      </button>

      {open && (
        <div
          className="mt-2 pb-2"
          data-testid={`order-timeline-${o.order_id}`}
        >
          <Timeline order={o} />

          <div className="flex flex-wrap items-center gap-5 mt-6">
            <Link
              to={`/track/${o.order_id}`}
              data-testid={`order-track-${o.order_id}`}
              className="text-[11px] tracking-[0.25em] border-b border-ink pb-0.5 hover:text-smoke hover:border-smoke transition-colors"
            >
              FULL TRACKING PAGE →
            </Link>

            {delivered && !ticket && (
              <button
                type="button"
                onClick={() => setReportingIssue(!reportingIssue)}
                data-testid={`report-issue-${o.order_id}`}
                className="text-[11px] tracking-[0.25em] border-b border-ink pb-0.5 hover:text-smoke hover:border-smoke transition-colors"
              >
                {reportingIssue
                  ? 'CANCEL ISSUE'
                  : 'REPORT AN ISSUE →'}
              </button>
            )}
          </div>

          {reportingIssue && !ticket && (
            <TicketForm
              order={o}
              onClose={() => setReportingIssue(false)}
              onSubmitted={(createdTicket) => {
                setTicket(createdTicket);
                setReportingIssue(false);
              }}
            />
          )}

         {ticket && (
  <div
    className="mt-5 border border-ink p-6"
    data-testid={`ticket-success-${o.order_id}`}
  >
    <p className="text-[10px] tracking-[0.25em] text-smoke">
      SUPPORT TICKET
    </p>

    <p className="font-display font-black uppercase tracking-tight text-2xl mt-1">
      {ticket.status === 'resolved'
        ? 'ISSUE RESOLVED.'
        : ticket.status === 'closed'
        ? 'TICKET CLOSED.'
        : 'ISSUE IN PROGRESS.'}
    </p>

    <p className="text-sm text-smoke mt-2">
      We're reviewing your issue and will keep this ticket updated.
    </p>

    <div className="mt-5 grid sm:grid-cols-2 gap-px bg-line border border-line">
      <div className="bg-paper p-4">
        <p className="text-[10px] tracking-[0.2em] text-smoke">
          TICKET
        </p>

        <p className="font-semibold mt-1">
          {ticket.ticket_number}
        </p>
      </div>

      <div className="bg-paper p-4">
        <p className="text-[10px] tracking-[0.2em] text-smoke">
          STATUS
        </p>

        <p className="font-semibold mt-1">
          {(ticket.status || 'open')
            .replace(/-/g, ' ')
            .toUpperCase()}
        </p>
      </div>
    </div>
    

    {ticket.admin_note && (
      <div className="mt-5 border-t border-line pt-5">
        <p className="text-[10px] tracking-[0.2em] text-smoke">
          UPDATE FROM NALAYAK
        </p>

        <p className="mt-2 text-sm leading-relaxed">
          {ticket.admin_note}
        </p>
      </div>
    )}
  </div>
)}
        </div>
      )}
    </div>
  );
}

function MemberFaces({ email }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/irl/mine?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => {});
  }, [email]);

  if (items.length === 0) return null;

  return (
    <div className="mt-8" data-testid="member-faces">
      <p className="text-[10px] tracking-[0.25em] text-smoke mb-3">FEATURED IN NALAYAK IRL</p>
      <div className="flex flex-wrap gap-3">
        {items.map((u) => (
          <img
            key={u.id}
            src={`${process.env.REACT_APP_BACKEND_URL}/api/irl/file/${u.id}`}
            alt="Your fit featured in Nalayak IRL"
            className="h-28 w-20 object-cover border border-line"
            loading="lazy"
          />
        ))}
      </div>
      <p className="text-[11px] text-smoke mt-3 tracking-wide">Badge of honour. The homepage is wearing you.</p>
    </div>
  );
}

function OrdersPanel() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/orders`, {
      method: 'GET',
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .catch(() => setOrders([]));
  }, []);
  if (orders === null) {
    return <p className="py-16 text-center text-[11px] tracking-[0.3em] text-smoke animate-pulse">LOADING ORDERS</p>;
  }
  if (orders.length === 0) {
    return (
      <div className="py-16 text-center border border-line" data-testid="orders-empty">
        <p className="font-display font-extrabold uppercase tracking-tight text-2xl">NO ORDERS YET.</p>
        <p className="mt-2 text-smoke text-sm">Your taste is ready. Your bag is waiting.</p>
        <Link to="/new-arrivals" className="inline-block mt-6 border border-ink px-6 py-3 text-[11px] tracking-[0.25em] hover:bg-ink hover:text-paper transition-colors">
          FIX THAT
        </Link>
      </div>
    );
  }
  return (
    <div className="divide-y divide-line border-y border-line" data-testid="orders-list">
      {orders.map((o) => (
        <OrderRow key={o.order_id} o={o} />
      ))}
    </div>
  );
}

function MemberPanel({ member }) {
  const type = membershipTypeOf(member);
  const panelDisplay = getMembershipDisplay(member);
  const sp = getStatusProgress(member);
  const perks = [
    ...membership.freeBenefits.map(([t]) => t),
    ...(hasClubAccess(member) ? membership.clubBenefits : []),
  ];
  return (
    <div className="space-y-10" data-testid="membership-panel">
      <div className="grid md:grid-cols-2 gap-px bg-line border border-line">
        <div className="bg-paper p-8">
          <p className="text-[10px] tracking-[0.25em] text-smoke mb-2">MEMBERSHIP</p>
          <p className="font-display font-black uppercase tracking-tight text-4xl leading-[0.95]" data-testid="panel-membership-title">
            {panelDisplay.title}
          </p>
          {panelDisplay.sub && (
            <p className="text-[11px] text-smoke mt-2 tracking-wide">{panelDisplay.sub}</p>
          )}
          {type === 'free' && (
            <>
              <Link
                to="/club"
                data-testid="panel-join-club-btn"
                className="inline-block mt-6 bg-ink text-paper px-6 py-3.5 text-[11px] tracking-[0.25em] font-medium hover:bg-ink/85 transition-colors"
              >
                JOIN THE CLUB — {formatINR(membershipConfig.foundingMemberPrice)} ONE-TIME
              </Link>
              <p className="text-[10px] tracking-[0.2em] text-smoke mt-3">
                FOUNDING 500 — {membershipConfig.foundingMemberClaimed} OF {membershipConfig.foundingMemberLimit} CLAIMED
              </p>
            </>
          )}
          {member.isFoundingMember && (
            <>
              <p className="mt-6 font-display font-bold uppercase tracking-tight text-lg">FIRST IN. ALWAYS IN.</p>
              <Link
                to="/membership/founding"
                data-testid="view-founding-card-link"
                className="inline-block mt-3 text-[11px] tracking-[0.25em] border-b border-ink pb-0.5 hover:text-smoke hover:border-smoke transition-colors"
              >
                VIEW FOUNDING CARD →
              </Link>
            </>
          )}
        </div>
        <div className="bg-paper p-8">
          <p className="text-[10px] tracking-[0.25em] text-smoke mb-2">EARNED STATUS</p>
          <p className="font-display font-black uppercase tracking-tight text-4xl" data-testid="panel-level">{sp.current.name}</p>
          <p className="text-[11px] text-smoke mt-1 tracking-wide">{sp.current.copy}</p>
          <p className="font-display font-extrabold uppercase tracking-tight text-xl mt-6">
            {sp.next ? `${sp.pct}% TO ${sp.next.name}` : 'HIGHEST LEVEL'}
          </p>
          <div className="mt-4 h-[3px] bg-line w-full">
            <div className="h-full bg-ink" style={{ width: `${sp.pct}%` }} />
          </div>
          <p className="text-[11px] text-smoke mt-3 tracking-wide">
            {sp.next ? `${sp.ordersToNext} QUALIFYING ORDERS TO ${sp.next.name} — EARNED, NOT BOUGHT.` : 'NOWHERE HIGHER TO GO.'}
          </p>
          {sp.next && (
            <p className="text-[11px] tracking-[0.2em] mt-4">NEXT BENEFIT — {sp.next.unlocks.toUpperCase()}</p>
          )}
          <p className="text-[11px] text-smoke tracking-wide mt-1">MEMBER SINCE {member.since}</p>
        </div>
      </div>

      <div>
        <p className="text-[11px] tracking-[0.25em] text-smoke mb-4">YOUR BENEFITS</p>
        <ul className="divide-y divide-line border-y border-line">
          {perks.map((perk) => (
            <li key={perk} className="py-4 text-sm flex justify-between items-center gap-4">
              {perk}
              <span className="text-[10px] tracking-[0.2em] text-smoke shrink-0">ACTIVE</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-[11px] tracking-[0.25em] text-smoke mb-4">MEMBER OFFERS</p>
        <div className="grid md:grid-cols-2 gap-px bg-line border border-line">
          {membership.offers.map((o) => (
            <Link key={o.title} to={o.to} data-testid={`offer-${o.title.slice(0, 12).toLowerCase().replace(/[^a-z]+/g, '-')}`} className="bg-paper p-6 group">
              <p className="font-display font-bold uppercase tracking-tight text-base group-hover:text-smoke transition-colors">{o.title}</p>
              <p className="text-sm text-smoke mt-1">{o.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] tracking-[0.25em] text-smoke mb-4">RECENT ACTIVITY</p>
        <ul className="divide-y divide-line border-y border-line">
          {membership.activity.map(([when, what]) => (
            <li key={what} className="py-3 flex justify-between gap-4 text-sm">
              <span>{what}</span>
              <span className="text-[10px] tracking-[0.2em] text-smoke shrink-0">{when}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Account() {
  useSeo('Account', 'Your Nalayak account.');
  const { wishlistProducts, member, joinMember } = useStore();
  const display = getMembershipDisplay(member);

  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('PROFILE');
  const [form, setForm] = useState({ name: '', phone: '' });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/auth/me`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error('Not authenticated.');
        }

        const data = await response.json();

        if (!data.authenticated || !data.member) {
          throw new Error('Invalid session.');
        }

        const memberData = data.member;

        const u = {
          id: memberData.id,
          name: memberData.name || 'NALAYAK',
          phone: memberData.phone,
          email: '',
          verified: true,
          memberId: memberData.id,
          status: memberData.status,
          membershipType: memberData.membership_type,
          joinedAt: memberData.joined_at,
        };

        setUser(u);
        joinMember();
      } catch (error) {
        console.log('NO ACTIVE NALAYAK SESSION');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [joinMember]);

  const sendOtp = async (e) => {
    e.preventDefault();
  
    const name = form.name.trim();
    const phone = normalizeIndianPhone(form.phone);
  
    if (!name) {
      toast.error('Name is required.');
      return;
    }
  
    if (!phone) {
      toast.error('Enter a valid 10-digit Indian phone number.');
      return;
    }
  
    setSendingOtp(true);
  
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/auth/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone,
          }),
        }
      );
  
      const data = await response.json();
  
      if (!response.ok || !data.success) {
        throw new Error(data.detail || data.message || 'Failed to send OTP.');
      }
  
      setForm((current) => ({
        ...current,
        phone,
      }));
  
      setOtpSent(true);
  
      toast.success('OTP sent.', {
        description: `Check ${phone} for your Nalayak verification code.`,
      });
    } catch (error) {
      console.error('SEND OTP ERROR:', error);
  
      toast.error('Could not send OTP.', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
  
    const phone = normalizeIndianPhone(form.phone);
    const token = otp.replace(/\D/g, '');
  
    if (!phone) {
      toast.error('Enter your phone number again.');
      return;
    }
  
    if (token.length !== 6) {
      toast.error('Enter the 6-digit OTP.');
      return;
    }
  
    setVerifyingOtp(true);
  
    try {
       const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/auth/verify-otp`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone,
            code: token,
            name: form.name.trim(),
          }),
        }
      );
  
      const data = await response.json();
  
      if (!response.ok || !data.success || !data.verified) {
        throw new Error(data.detail || 'Invalid or expired OTP.');
      }
  
       if (!data.member) {
        throw new Error('Login succeeded but no member was returned.');
      }

      const memberData = data.member;

      const u = {
        id: memberData.id,
        name: memberData.name || form.name.trim() || 'NALAYAK',
        phone: memberData.phone || data.phone || phone,
        email: '',
        verified: true,
        memberId: memberData.id,
        status: memberData.status,
        membershipType: memberData.membership_type,
        joinedAt: memberData.joined_at,
      };

      setUser(u);
      joinMember();

      toast.success(
        `Welcome to the wrong crowd, ${u.name.split(' ')[0]}.`
      );
    } catch (error) {
      console.error('VERIFY OTP ERROR:', error);
  
      toast.error('OTP verification failed.', {
        description: error.message || 'Invalid or expired OTP.',
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const signOut = async () => {
    try {
      await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/auth/logout`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
    } catch (error) {
      console.error('LOGOUT ERROR:', error);
    }

    setUser(null);
    setOtp('');
    setOtpSent(false);
    setForm({ name: '', phone: '' });

    toast('Logged out. The clothes will remember you.');
  };

  if (loading) {
    return (
      <main className="px-4 md:px-8 max-w-[480px] mx-auto py-16 md:py-28">
        <p className="text-[11px] tracking-[0.3em] text-smoke text-center animate-pulse">LOADING ACCOUNT</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="px-4 md:px-8 max-w-[480px] mx-auto py-16 md:py-28" data-testid="account-signin">
        <Reveal y={16}>
          <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">MEMBERS-ISH</p>
          <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-5xl">
            {otpSent ? 'VERIFY.' : 'SIGN IN.'}
          </h1>

          {!otpSent ? (
            <>
              <p className="mt-3 text-smoke text-sm">
                Your phone is your key. We’ll send a one-time code — no password, no nonsense.
              </p>

              <form onSubmit={sendOtp} className="mt-10 space-y-4" data-testid="signin-form">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="NAME"
                  autoComplete="name"
                  data-testid="signin-name-input"
                  className="w-full border border-ink bg-transparent px-5 py-4 text-sm tracking-wide placeholder:text-smoke/70 focus:outline-none focus:ring-1 focus:ring-ink"
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="PHONE NUMBER"
                  autoComplete="tel"
                  maxLength={14}
                  data-testid="signin-phone-input"
                  className="w-full border border-ink bg-transparent px-5 py-4 text-sm tracking-wide placeholder:text-smoke/70 focus:outline-none focus:ring-1 focus:ring-ink"
                />
                <p className="text-[10px] text-smoke tracking-wide">
                  INDIA: 10 digits is enough. We’ll add +91.
                </p>
                <button
                  type="submit"
                  disabled={sendingOtp}
                  data-testid="signin-send-otp-btn"
                  className="w-full bg-ink text-paper py-4 text-[12px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300 disabled:opacity-50"
                >
                  {sendingOtp ? 'SENDING OTP…' : 'SEND OTP'}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="mt-3 text-smoke text-sm">
                Enter the 6-digit code sent to <span className="text-ink font-medium">{form.phone}</span>.
              </p>
              <form onSubmit={verifyOtp} className="mt-10 space-y-4" data-testid="otp-form">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-DIGIT OTP"
                  maxLength={6}
                  autoFocus
                  data-testid="otp-input"
                  className="w-full border border-ink bg-transparent px-5 py-4 text-center text-lg tracking-[0.5em] placeholder:text-smoke/70 focus:outline-none focus:ring-1 focus:ring-ink"
                />
                <button
                  type="submit"
                  disabled={verifyingOtp}
                  data-testid="otp-verify-btn"
                  className="w-full bg-ink text-paper py-4 text-[12px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300 disabled:opacity-50"
                >
                  {verifyingOtp ? 'VERIFYING…' : 'VERIFY & ENTER'}
                </button>
                <button
                  type="button"
                  onClick={() => { setOtp(''); setOtpSent(false); }}
                  className="w-full py-3 text-[10px] tracking-[0.25em] text-smoke hover:text-ink transition-colors"
                >
                  CHANGE NUMBER
                </button>
              </form>
            </>
          )}
        </Reveal>
      </main>
    );
  }

  return (
    <main className="px-4 md:px-8 max-w-[1200px] mx-auto py-10 md:py-16" data-testid="account-page">
      <Reveal y={16}>
        <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">ACCOUNT</p>
        <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-5xl md:text-7xl">
          WELCOME BACK.
        </h1>
        <p className="mt-3 text-smoke text-sm">The wrong crowd saved you a seat, {user.name.split(' ')[0]}.</p>
      </Reveal>

      <div className="mt-10 grid sm:grid-cols-3 gap-px bg-line border border-line" data-testid="account-dashboard">
        <div className="bg-paper p-6">
          <p className="text-[10px] tracking-[0.25em] text-smoke mb-2">MEMBERSHIP</p>
          {!member ? (
            <>
              <p className="font-display font-extrabold uppercase tracking-tight text-xl">NOT A MEMBER — YET</p>
              <Link to="/membership" data-testid="dash-join-link" className="inline-block mt-2 text-[11px] tracking-[0.2em] border-b border-ink pb-0.5 hover:text-smoke hover:border-smoke transition-colors">
                JOIN FREE →
              </Link>
            </>
          ) : (
            <>
              <p className="font-display font-extrabold uppercase tracking-tight text-xl leading-tight">{display.title}</p>
              {display.sub && <p className="text-[11px] text-smoke mt-1 tracking-wide">{display.sub}</p>}
              {membershipTypeOf(member) === 'free' && (
                <Link to="/club" data-testid="dash-club-link" className="inline-block mt-2 text-[11px] tracking-[0.2em] border-b border-ink pb-0.5 hover:text-smoke hover:border-smoke transition-colors">
                  JOIN NALAYAK CLUB →
                </Link>
              )}
            </>
          )}
        </div>
        <div className="bg-paper p-6">
          <p className="text-[10px] tracking-[0.25em] text-smoke mb-2">EARLY ACCESS</p>
          <p className="font-display font-extrabold uppercase tracking-tight text-xl">
            {member && membershipTypeOf(member) !== 'free' ? 'UNLOCKED' : 'LOCKED'}
          </p>
          <p className="text-[11px] text-smoke mt-1 tracking-wide">
            {member && membershipTypeOf(member) !== 'free' ? 'AW26 PREVIEW — LIVE NOW' : 'CLUB MEMBERS ONLY'}
          </p>
        </div>
        <div className="bg-paper p-6">
          <p className="text-[10px] tracking-[0.25em] text-smoke mb-2">WISHLIST</p>
          <p className="font-display font-extrabold uppercase tracking-tight text-xl">{wishlistProducts.length} SAVED</p>
          <Link to="/wishlist" className="inline-block mt-2 text-[11px] tracking-[0.2em] border-b border-ink pb-0.5 hover:text-smoke hover:border-smoke transition-colors">
            VIEW →
          </Link>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-2 border-b border-line pb-px" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            data-testid={`account-tab-${t.toLowerCase()}`}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-[11px] tracking-[0.25em] font-medium transition-colors duration-300 ${tab === t ? 'bg-ink text-paper' : 'hover:bg-line'}`}
          >
            {t}
          </button>
        ))}
        <button
          data-testid="account-logout-btn"
          onClick={signOut}
          className="ml-auto px-5 py-3 text-[11px] tracking-[0.25em] text-smoke hover:text-ink transition-colors"
        >
          LOG OUT
        </button>
      </div>

      <div className="mt-10" data-testid="account-panel">
        {tab === 'PROFILE' && (
          <div className="max-w-md space-y-4">
            <div className="border border-line p-5">
              <p className="text-[10px] tracking-[0.25em] text-smoke mb-1">NAME</p>
              <p className="text-sm font-medium">{user.name}</p>
            </div>
            <div className="border border-line p-5">
              <p className="text-[10px] tracking-[0.25em] text-smoke mb-1">EMAIL</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <MemberFaces email={user.email} />
          </div>
        )}
        {tab === 'MEMBERSHIP' && (
          member ? (
            <MemberPanel member={member} />
          ) : (
            <div className="py-16 text-center border border-line" data-testid="membership-join-panel">
              <p className="font-display font-extrabold uppercase tracking-tight text-2xl">NOT A REWARDS PROGRAM. A MEMBERSHIP.</p>
              <p className="mt-2 text-smoke text-sm">Early drops, private pieces, member pricing. Free to join. Impossible to fake.</p>
              <button
                onClick={() => {
                  joinMember();
                  toast.success("YOU'RE IN.", { description: 'Welcome to Nalayak Members.' });
                }}
                data-testid="account-join-member-btn"
                className="mt-6 bg-ink text-paper px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors"
              >
                BECOME A MEMBER
              </button>
            </div>
          )
        )}
        {tab === 'ORDERS' && <OrdersPanel />}
        {tab === 'WISHLIST' && (
          <div>
            <p className="text-sm text-smoke mb-6">{wishlistProducts.length} saved piece{wishlistProducts.length !== 1 ? 's' : ''}.</p>
            <Link to="/wishlist" data-testid="account-wishlist-link" className="inline-block border border-ink px-6 py-3 text-[11px] tracking-[0.25em] hover:bg-ink hover:text-paper transition-colors">
              VIEW WISHLIST
            </Link>
          </div>
        )}
        {tab === 'ALERTS' && <AlertsPanel />}
        {tab === 'ADDRESSES' && (
          <div className="py-16 text-center border border-line" data-testid="addresses-empty">
            <p className="font-display font-extrabold uppercase tracking-tight text-2xl">NO SAVED ADDRESSES.</p>
            <p className="mt-2 text-smoke text-sm">Address book unlocks with checkout. We don't know where you live. Yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}