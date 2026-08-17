import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { useStore } from '@/context/StoreContext';

export default function WelcomePopup() {
  const { member, joinMember } = useStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('nalayak_welcomed')) return;
    const t = setTimeout(() => setOpen(true), 1800);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    localStorage.setItem('nalayak_welcomed', '1');
    setOpen(false);
  };

  const join = () => {
    joinMember();
    toast.success("YOU'RE IN.", { description: 'Nalayak Member — free, always.' });
    close();
  };

  return (
    <AnimatePresence>
      {open && !member && (
        <motion.div
          role="dialog"
          aria-label="Join Nalayak Members"
          className="fixed bottom-4 left-4 right-4 sm:right-auto sm:w-[380px] z-50 bg-paper border border-ink p-6 md:p-8"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          data-testid="welcome-popup"
        >
          <button
            onClick={close}
            aria-label="Close"
            data-testid="welcome-close"
            className="absolute top-3 right-3 text-smoke hover:text-ink transition-colors"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
          <p className="text-[10px] tracking-[0.3em] text-smoke mb-2">NALAYAK MEMBERS</p>
          <p className="font-display font-extrabold uppercase tracking-tight text-2xl leading-tight">
            JOIN THE WRONG CROWD.
          </p>
          <p className="mt-2 text-sm text-smoke leading-relaxed">
            Membership is free. The good stuff comes with it.
          </p>
          <div className="mt-6 space-y-2">
            <button
              onClick={join}
              data-testid="welcome-join-free"
              className="w-full bg-ink text-paper py-3.5 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300"
            >
              JOIN NALAYAK — FREE
            </button>
            <Link
              to="/membership"
              onClick={close}
              data-testid="welcome-explore-club"
              className="block w-full text-center border border-ink py-3.5 text-[11px] tracking-[0.3em] font-medium hover:bg-ink hover:text-paper transition-colors duration-300"
            >
              EXPLORE THE CLUB
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
