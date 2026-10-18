import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Reveal, MaskedLines } from '@/components/Reveal';
import { useStore } from '@/context/StoreContext';
import { membership, formatINR } from '@/data/storeData';
import {
  hasClubAccess,
  getMembershipDisplay,
} from '@/services/membership';
import { useSeo } from '@/hooks/useSeo';

function PaywallModal({ onClose }) {
  const { refreshMember } = useStore();
  const [stage, setStage] = useState('summary');
  const closeRef = useRef(null);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && stage === 'summary') onClose();
    };

    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();

    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, stage]);

  const pay = async () => {
    setStage('processing');

    // Legacy backend plan identifier. The plan is ₹999 one-time lifetime access.
    const plan = 'club-yearly';
    const base = process.env.REACT_APP_BACKEND_URL;

    if (!base) {
      toast.error('Checkout is unavailable. Please try again later.');
      setStage('summary');
      return;
    }

    try {
      const response = await fetch(`${base}/api/razorpay/create-order`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const order = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error(
            'Payments are not configured yet. Please try again later.'
          );
        }

        if (response.status === 401) {
          throw new Error('Please sign in before joining the Club.');
        }

        throw new Error(order.detail || 'Could not create payment order.');
      }

      await new Promise((resolve, reject) => {
        if (window.Razorpay) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = resolve;
        script.onerror = () =>
          reject(new Error('Could not load secure checkout.'));
        document.body.appendChild(script);
      });

      if (!window.Razorpay) {
        throw new Error('Secure checkout is unavailable. Please try again.');
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: 'NALAYAK',
        description: order.description,
        theme: { color: '#0A0A0A' },
        modal: {
          ondismiss: () => setStage('summary'),
        },
        handler: async (paymentResponse) => {
          setStage('processing');

          try {
            const verification = await fetch(`${base}/api/razorpay/verify`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...paymentResponse, plan }),
            });

            const result = await verification.json().catch(() => ({}));

            if (!verification.ok || !result.verified) {
              throw new Error(
                result.detail ||
                  'Payment verification is pending. Please contact support before trying again.'
              );
            }

            const refreshedMember = await refreshMember();

            if (!refreshedMember) {
              throw new Error(
                'Payment was verified, but your membership status could not be refreshed. Please sign in again.'
              );
            }

            setStage('done');
          } catch (error) {
            toast.error(
              error.message || 'Payment verification failed.'
            );
            setStage('summary');
          }
        },
      });

      checkout.open();
    } catch (error) {
      toast.error(error.message || 'Checkout is unavailable. Please try again.');
      setStage('summary');
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Join Nalayak Club"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="club-paywall"
    >
      <div
        className="absolute inset-0 bg-ink/60"
        onClick={stage === 'summary' ? onClose : undefined}
      />

      <motion.div
        className="relative bg-paper w-full sm:max-w-md border border-ink"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between px-6 h-14 border-b border-line">
          <p className="text-[11px] tracking-[0.3em] font-medium">
            NALAYAK CLUB
          </p>

          {stage === 'summary' && (
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              data-testid="paywall-close"
              className="text-smoke hover:text-ink transition-colors"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {stage === 'summary' && (
          <div className="p-6 md:p-8">
            <p className="font-display font-black uppercase tracking-tight text-3xl">
              NALAYAK CLUB
            </p>

            <p className="mt-1 text-[11px] tracking-[0.25em] text-smoke">
              ACCESS IS THE REWARD.
            </p>

            <div className="mt-8 divide-y divide-line border-y border-line text-sm">
              <div className="flex justify-between gap-4 py-3">
                <span className="text-smoke">Membership</span>
                <span className="font-medium text-right">
                  Lifetime Club Membership
                </span>
              </div>

              <div className="flex justify-between gap-4 py-3">
                <span className="text-smoke">Price</span>
                <span className="font-medium" data-testid="paywall-price">
                  {formatINR(999)}
                </span>
              </div>

              <div className="flex justify-between gap-4 py-3">
                <span className="text-smoke">Billing</span>
                <span className="font-medium text-right">
                  ONE-TIME — LIFETIME ACCESS
                </span>
              </div>
            </div>

            <button
              onClick={pay}
              data-testid="paywall-pay-btn"
              className="mt-8 w-full bg-ink text-paper py-4 text-[12px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300"
            >
              JOIN THE CLUB — {formatINR(999)}
            </button>

            <p className="mt-4 text-[10px] tracking-[0.15em] text-smoke text-center">
              ONE PAYMENT. LIFETIME ACCESS. NO RENEWALS.
            </p>
          </div>
        )}

        {stage === 'processing' && (
          <div className="p-16 text-center" data-testid="paywall-processing">
            <p className="text-[11px] tracking-[0.35em] text-smoke animate-pulse">
              PROCESSING
            </p>
          </div>
        )}

        {stage === 'done' && (
          <div className="p-6 md:p-8 text-center" data-testid="paywall-success">
            <p className="text-[11px] tracking-[0.3em] text-smoke mb-3">
              NALAYAK CLUB
            </p>

            <p className="font-display font-black uppercase tracking-tight text-4xl">
              WELCOME TO THE CLUB.
            </p>

            <p className="mt-4 font-display font-bold uppercase tracking-tight text-xl">
              LIFETIME MEMBER
            </p>

            <p className="mt-1 text-[11px] tracking-[0.25em] text-smoke">
              FIRST IN. ALWAYS IN.
            </p>

            <div className="mt-8 space-y-2">
              <Link
                to="/club/drops"
                data-testid="paywall-drops-link"
                className="block w-full bg-ink text-paper py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors"
              >
                VIEW CLUB DROPS
              </Link>

              <Link
                to="/account"
                data-testid="paywall-card-link"
                className="block w-full border border-ink py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink hover:text-paper transition-colors"
              >
                VIEW MY ACCOUNT
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function Club() {
  useSeo('Nalayak Club', 'Access is the reward.');

  const { member } = useStore();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const access = hasClubAccess(member);
  const display = getMembershipDisplay(member);

  return (
    <main data-testid="club-page">
      <section className="bg-ink text-paper">
        <div className="px-4 md:px-8 py-24 md:py-36 max-w-[1600px] mx-auto">
          <Reveal y={12}>
            <p className="text-paper/50 text-[11px] tracking-[0.35em] mb-4">
              NALAYAK CLUB
            </p>
          </Reveal>

          <h1 className="font-display font-black uppercase tracking-tighter leading-[0.85] text-[12vw] md:text-[7vw]">
            <MaskedLines lines={['ACCESS IS', 'THE REWARD.']} delay={0.15} />
          </h1>

          <Reveal delay={0.5}>
            <p className="mt-6 text-paper/75 text-sm md:text-base max-w-lg">
              Early drops, private pieces and everything behind the scenes.
              Not a discount club — a key to the building.
            </p>

            {access && (
              <p
                className="mt-6 text-[11px] tracking-[0.25em] text-paper/60"
                data-testid="club-active-line"
              >
                {display.title} — {display.sub}
              </p>
            )}

            <div className="mt-10 flex flex-wrap gap-3">
              {access ? (
                <Link
                  to="/club/drops"
                  data-testid="club-drops-cta"
                  className="bg-paper text-ink px-8 py-4 text-[11px] tracking-[0.3em] font-medium border border-paper hover:bg-transparent hover:text-paper transition-colors duration-300"
                >
                  VIEW CLUB DROPS
                </Link>
              ) : (
                <button
                  onClick={() => setPaywallOpen(true)}
                  data-testid="join-club-btn"
                  className="bg-paper text-ink px-8 py-4 text-[11px] tracking-[0.3em] font-medium border border-paper hover:bg-transparent hover:text-paper transition-colors duration-300"
                >
                  JOIN THE CLUB
                </button>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <section
        className="px-4 md:px-8 py-20 md:py-28 max-w-[1600px] mx-auto"
        data-testid="club-benefits"
      >
        <Reveal>
          <p className="text-[11px] tracking-[0.3em] text-smoke mb-14">
            WHAT ACCESS MEANS
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-x-16">
          {membership.clubBenefits.map((benefit, index) => (
            <Reveal key={benefit} delay={index * 0.04}>
              <div className="flex items-baseline gap-6 py-5 border-b border-line">
                <span className="font-display font-black text-smoke/40 text-xl tracking-tighter shrink-0">
                  0{index + 1}
                </span>
                <span className="font-display font-bold uppercase tracking-tight text-lg md:text-xl">
                  {benefit}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {!access && (
        <section
          className="px-4 md:px-8 pb-24 md:pb-32 max-w-[1600px] mx-auto"
          data-testid="club-pricing"
        >
          <div className="grid lg:grid-cols-2 gap-px bg-line border border-line">
            <Reveal className="bg-paper p-8 md:p-12">
              <p className="text-[11px] tracking-[0.3em] text-smoke mb-3">
                CLUB MEMBERSHIP
              </p>

              <p className="font-display font-extrabold uppercase tracking-tight text-3xl md:text-4xl">
                NALAYAK CLUB
              </p>

              <p className="mt-2 text-sm text-smoke max-w-sm">
                One payment. Lifetime Club access. No renewals or expiry.
              </p>

              <p className="mt-8 font-display font-black tracking-tighter text-5xl">
                {formatINR(999)}
              </p>

              <p className="mt-1 text-[11px] tracking-[0.25em]">
                ONE-TIME — LIFETIME ACCESS
              </p>

              <button
                onClick={() => setPaywallOpen(true)}
                data-testid="join-club-btn-pricing"
                className="mt-10 bg-ink text-paper px-10 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300"
              >
                JOIN THE CLUB
              </button>
            </Reveal>

            <Reveal delay={0.08} className="bg-paper p-8 md:p-12">
              <p className="text-[11px] tracking-[0.3em] text-smoke mb-3">
                MEMBERSHIP PROMISE
              </p>

              <p className="font-display font-extrabold uppercase tracking-tight text-3xl md:text-4xl">
                NO RENEWALS
              </p>

              <p className="mt-2 text-sm text-smoke max-w-sm">
                Your ₹999 payment is for lifetime access, not a yearly
                subscription.
              </p>

              <p className="mt-8 font-display font-black tracking-tighter text-5xl">
                LIFETIME
              </p>

              <p className="mt-1 text-[11px] tracking-[0.25em]">
                ONE PAYMENT
              </p>

              <p className="mt-8 text-[11px] tracking-[0.2em] text-smoke">
                MEMBERSHIP ACTIVATES AFTER SERVER VERIFICATION.
              </p>
            </Reveal>
          </div>
        </section>
      )}

      <AnimatePresence>
        {paywallOpen && (
          <PaywallModal
            key="club-paywall"
            onClose={() => setPaywallOpen(false)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}