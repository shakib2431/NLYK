
import { useEffect, useState } from 'react';
import { sendWelcomeEmail } from '@/services/email';
import { X, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { useStore } from '@/context/StoreContext';
import { supabase } from '@/services/supabase';

export default function WelcomePopup() {
  const { member, joinMember } = useStore();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('nalayak_welcomed') === '1') return;

    const timer = setTimeout(() => setOpen(true), 6000);

    return () => clearTimeout(timer);
  }, []);

  const close = () => {
    localStorage.setItem('nalayak_welcomed', '1');
    setOpen(false);
  };

  const join = async (event) => {
    event.preventDefault();

    if (submitting) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    if (birthday && birthday > today) {
      toast.error('Birthday cannot be in the future.');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('welcome_signups')
        .insert({
          email: normalizedEmail,
          birthday: birthday || null,
          marketing_consent: marketingConsent,
          consent_recorded_at: marketingConsent
            ? new Date().toISOString()
            : null,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This email has already signed up.');
        } else {
          console.error('Welcome signup failed:', error);
          toast.error('We could not save your details. Please try again.');
        }
        return;
      }

      // Only create a membership if the visitor doesn't already have one.
// Existing founding and Club memberships remain unchanged.
if (!member) {
  await joinMember();
}

// Send the welcome email directly to the address entered in the popup.
try {
  const response = await fetch(
    `${process.env.REACT_APP_BACKEND_URL}/api/email/welcome`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: normalizedEmail,
        name: '',
        kind: 'member',
      }),
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('[NALAYAK EMAIL] Welcome email failed:', result);
  } else {
    console.info('[NALAYAK EMAIL] Welcome email result:', result.status);
  }
} catch (emailError) {
  // Signup should remain successful even if email delivery fails.
  console.error('[NALAYAK EMAIL] Welcome email request failed:', emailError);
}

      toast.success("YOU'RE IN.", {
        description: 'Your details have been saved successfully.',
      });

      close();
    } catch (error) {
      console.error('Welcome signup failed:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid="welcome-popup-overlay"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
            data-testid="welcome-popup"
            className="relative grid max-h-[92vh] w-full max-w-5xl grid-cols-1 overflow-y-auto rounded-sm bg-paper text-ink shadow-2xl md:max-h-[min(760px,90vh)] md:grid-cols-2 md:overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close welcome popup"
              data-testid="welcome-close"
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center border border-ink/15 bg-paper/95 transition hover:bg-ink hover:text-paper"
            >
              <X size={19} strokeWidth={1.5} />
            </button>

            {/* Left: NALAYAK campaign image */}
            <div className="relative min-h-[220px] bg-ink sm:min-h-[300px] md:min-h-[560px]">
              <img
                src="/welcome.png"
                alt="NALAYAK streetwear campaign"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            </div>

            {/* Right: real, interactive signup form */}
            <div className="flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-10 md:px-12 md:py-12">
              <p className="mb-5 text-center text-[10px] font-medium tracking-[0.3em] text-smoke">
                NALAYAK MEMBERS
              </p>

              <h2
                id="welcome-title"
                className="text-center font-display text-3xl font-extrabold uppercase leading-[0.98] tracking-tight sm:text-4xl"
              >
                Welcome to the wrong crowd.
              </h2>

              <p className="mx-auto mt-4 max-w-sm text-center text-sm leading-relaxed text-smoke">
                For the ones who were never made to fit in.
              </p>

              <form onSubmit={join} className="mt-7 space-y-3">
                <label htmlFor="welcome-email" className="sr-only">
                  Email address
                </label>

                <input
                  id="welcome-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email*"
                  className="w-full border border-ink/25 bg-transparent px-4 py-3.5 text-sm outline-none transition placeholder:text-smoke focus:border-ink"
                />

                <label htmlFor="welcome-birthday" className="sr-only">
                  Birthday (optional)
                </label>

                <input
                  id="welcome-birthday"
                  name="birthday"
                  type="date"
                  autoComplete="bday"
                  max={new Date().toISOString().slice(0, 10)}
                  value={birthday}
                  onChange={(event) => setBirthday(event.target.value)}
                  className="w-full border border-ink/25 bg-transparent px-4 py-3.5 text-sm outline-none transition focus:border-ink"
                />

                <label className="flex cursor-pointer items-start gap-3 py-1 text-xs leading-relaxed text-smoke">
                  <input
                    type="checkbox"
                    name="marketingConsent"
                    checked={marketingConsent}
                    onChange={(event) =>
                      setMarketingConsent(event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 accent-black"
                  />

                  <span>
                    Keep me updated on new drops, collections and more.
                    <span className="mt-1 block text-[10px]">
                      Optional. You can leave this unchecked.
                    </span>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="welcome-join-free"
                  className="group flex w-full items-center justify-center gap-3 bg-ink px-5 py-4 text-xs font-semibold tracking-[0.25em] text-paper transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'PLEASE WAIT...' : 'JOIN THE CROWD'}

                  {!submitting && (
                    <ArrowRight
                      size={17}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-[9px] tracking-[0.2em] text-smoke">
                MEMBERSHIP IS FREE. NO DISCOUNT GIMMICKS.
              </p>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
