import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Share2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Reveal } from '@/components/Reveal';
import { useStore } from '@/context/StoreContext';
import { formatMemberNo } from '@/services/membership';
import { useSeo } from '@/hooks/useSeo';

function CardFace({ member }) {
  return (
    <div
      className="relative aspect-[3/4] w-full max-w-sm bg-ink text-paper overflow-hidden"
      data-testid="founding-card"
    >
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #F7F7F5 0 1px, transparent 1px 9px)' }}
        aria-hidden="true"
      />
      <div className="absolute inset-4 border border-paper/25" aria-hidden="true" />
      <div className="relative h-full flex flex-col justify-between p-8 md:p-10">
        <div className="flex items-start justify-between">
          <p className="font-display font-extrabold tracking-tight text-2xl">NALAYAK</p>
          <p className="text-[9px] tracking-[0.3em] text-paper/60 text-right leading-relaxed">
            NALAYAK<br />CLUB
          </p>
        </div>
        <div>
          <p className="text-[10px] tracking-[0.35em] text-paper/60 mb-3">FOUNDING MEMBER</p>
          <p className="font-display font-black tracking-tighter leading-none text-6xl md:text-7xl" data-testid="card-founding-number">
            {formatMemberNo(member.foundingNumber)}
          </p>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] tracking-[0.3em] text-paper/60">MEMBER SINCE</p>
            <p className="text-sm font-medium tracking-[0.15em] mt-1">{member.since}</p>
          </div>
          <p className="text-[9px] tracking-[0.3em] text-paper/60">FIRST IN. ALWAYS IN.</p>
        </div>
      </div>
    </div>
  );
}

export default function FoundingCard() {
  useSeo('Founding Card', 'Your Nalayak Founding Member card.');
  const { member } = useStore();
  const cardRef = useRef(null);

  if (!member?.isFoundingMember) {
    return (
      <main className="px-4 md:px-8 py-32 text-center" data-testid="founding-card-locked">
        <p className="text-[11px] tracking-[0.35em] text-smoke mb-4">FOUNDING 500</p>
        <h1 className="font-display font-black uppercase tracking-tighter leading-[0.85] text-[12vw] md:text-[6vw]">
          THIS CARD IS EARNED FIRST.
        </h1>
        <p className="mt-6 text-smoke text-sm max-w-md mx-auto">
          Founding cards belong to the first 500 Club members. There are still seats.
        </p>
        <Link to="/club" data-testid="locked-join-club-btn" className="inline-block mt-10 bg-ink text-paper px-10 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors">
          JOIN THE CLUB
        </Link>
      </main>
    );
  }

  const buildCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1440;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, 1080, 1440);
    ctx.strokeStyle = 'rgba(247,247,245,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, 984, 1344);
    ctx.fillStyle = '#F7F7F5';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '800 88px "Cabinet Grotesk", sans-serif';
    ctx.fillText('NALAYAK', 110, 200);
    ctx.font = '500 30px Switzer, sans-serif';
    ctx.fillStyle = 'rgba(247,247,245,0.6)';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
    ctx.fillText('FOUNDING MEMBER', 110, 780);
    ctx.font = '900 220px "Cabinet Grotesk", sans-serif';
    ctx.fillStyle = '#F7F7F5';
    ctx.fillText(formatMemberNo(member.foundingNumber), 100, 1030);
    ctx.font = '500 34px Switzer, sans-serif';
    ctx.fillStyle = 'rgba(247,247,245,0.75)';
    ctx.fillText(`MEMBER SINCE ${member.since}`, 110, 1300);
    ctx.textAlign = 'right';
    ctx.fillText('FIRST IN. ALWAYS IN.', 970, 1300);
    return canvas;
  };

  const share = async () => {
    const title = 'NALAYAK — Founding Member';
    const text = `Founding Member ${formatMemberNo(member.foundingNumber)} of Nalayak Club. First in. Always in.`;
    const url = `${window.location.origin}/membership`;
    buildCanvas().toBlob(async (blob) => {
      const file = blob && new File([blob], 'nalayak-founding-card.png', { type: 'image/png' });
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title, text }); } catch { /* dismissed */ }
      } else if (navigator.share) {
        try { await navigator.share({ title, text, url }); } catch { /* dismissed */ }
      } else {
        try {
          await navigator.clipboard.writeText(`${text} ${url}`);
          toast.success('Link copied.', { description: 'Flex responsibly.' });
        } catch {
          toast.error('Sharing not supported on this browser.');
        }
      }
    }, 'image/png');
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = buildCanvas().toDataURL('image/png');
    a.download = `nalayak-founding-${String(member.foundingNumber).padStart(4, '0')}.png`;
    a.click();
    toast.success('Card saved.', { description: 'Founding Member PNG downloaded.' });
  };

  return (
    <main className="px-4 md:px-8 max-w-[1200px] mx-auto py-12 md:py-20" data-testid="founding-card-page">
      <Reveal y={16}>
        <p className="text-[11px] tracking-[0.3em] text-smoke mb-2">NALAYAK CLUB — FOUNDING 500</p>
        <h1 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-5xl md:text-7xl">YOUR CARD.</h1>
        <p className="mt-3 text-smoke text-sm">Permanent. Numbered. Yours.</p>
      </Reveal>

      <div className="mt-14 grid md:grid-cols-[auto_1fr] gap-12 items-start">
        <Reveal>
          <div ref={cardRef}>
            <CardFace member={member} />
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="max-w-sm">
            <p className="text-[11px] tracking-[0.25em] text-smoke mb-4">FOUNDING MEMBER {formatMemberNo(member.foundingNumber)}</p>
            <p className="text-sm text-ink/70 leading-relaxed">
              This number is yours permanently — issued once, never reused. When the database goes live, it becomes the official record.
            </p>
            <div className="mt-8 space-y-2">
              <button onClick={share} data-testid="share-card-btn" className="w-full flex items-center justify-center gap-2 bg-ink text-paper py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300">
                <Share2 size={14} strokeWidth={1.5} /> SHARE MY CARD
              </button>
              <button onClick={download} data-testid="download-card-btn" className="w-full flex items-center justify-center gap-2 border border-ink py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink hover:text-paper transition-colors duration-300">
                <Download size={14} strokeWidth={1.5} /> DOWNLOAD / SAVE
              </button>
            </div>
            <p className="mt-6 text-[10px] tracking-[0.2em] text-smoke">FOUNDING STATUS: PERMANENT — INDEPENDENT OF CLUB RENEWALS.</p>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
