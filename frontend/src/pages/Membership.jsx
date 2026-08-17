import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import SafeImg from '@/components/SafeImg';
import { Reveal, MaskedLines } from '@/components/Reveal';
import { useStore } from '@/context/StoreContext';
import { membership, membershipConfig } from '@/data/storeData';
import { formatMemberNo, membershipTypeOf, hasClubAccess } from '@/services/membership';
import { useSeo } from '@/hooks/useSeo';

export default function Membership() {
  useSeo('Members', 'Start with belonging. Access is the reward.');
  const { member, joinMember } = useStore();
  const type = member ? membershipTypeOf(member) : null;
  const { foundingMemberLimit, foundingMemberPrice, foundingMemberClaimed, clubYearlyPrice } = membershipConfig;
  const claimedPct = (foundingMemberClaimed / foundingMemberLimit) * 100;

  const joinFree = () => {
    joinMember();
    toast.success("YOU'RE IN.", { description: 'Nalayak Member — free, always.' });
    document.getElementById('levels')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main data-testid="membership-page">
      <section className="relative h-[85vh] min-h-[520px] overflow-hidden bg-ink">
        <SafeImg
          id={membership.heroImage} w={2000} alt="Nalayak Members campaign"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-end pb-16 md:pb-24 px-4 md:px-8 max-w-[1600px] mx-auto">
          <Reveal y={12}>
            <p className="text-paper/70 text-[11px] tracking-[0.35em] mb-4">NALAYAK MEMBERS</p>
          </Reveal>
          <h1 className="font-display font-black uppercase text-paper tracking-tighter leading-[0.85] text-[13vw] md:text-[7.5vw]">
            <MaskedLines lines={["YOU'RE IN THE", 'WRONG CROWD.']} delay={0.15} />
          </h1>
          <Reveal delay={0.5}>
            <p className="mt-5 text-paper/85 text-sm md:text-base max-w-md">
              Membership is free. The good stuff comes with it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {member ? (
                <Link
                  to="/account"
                  data-testid="membership-status-btn"
                  className="bg-paper text-ink px-8 py-4 text-[11px] tracking-[0.3em] font-medium border border-paper hover:bg-transparent hover:text-paper transition-colors duration-300"
                >
                  YOU'RE IN — VIEW MEMBERSHIP
                </Link>
              ) : (
                <button
                  onClick={joinFree}
                  data-testid="join-free-btn"
                  className="bg-paper text-ink px-8 py-4 text-[11px] tracking-[0.3em] font-medium border border-paper hover:bg-transparent hover:text-paper transition-colors duration-300"
                >
                  JOIN FREE
                </button>
              )}
              <button
                onClick={() => document.getElementById('club')?.scrollIntoView({ behavior: 'smooth' })}
                data-testid="explore-club-btn"
                className="border border-paper text-paper px-8 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-paper hover:text-ink transition-colors duration-300"
              >
                EXPLORE THE CLUB
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 md:px-8 py-20 md:py-28 max-w-[1600px] mx-auto border-b border-line" data-testid="free-membership-section">
        <Reveal>
          <p className="text-[11px] tracking-[0.3em] text-smoke mb-3">FREE MEMBERSHIP</p>
          <h2 className="font-display font-black uppercase tracking-tighter leading-[0.9] text-4xl md:text-6xl">
            START WITH BELONGING.
          </h2>
          <p className="mt-4 text-smoke text-sm md:text-base">Every Nalayak account starts here.</p>
        </Reveal>
        <div className="mt-14 divide-y divide-line border-y border-line">
          {membership.freeBenefits.map(([title, desc], i) => (
            <Reveal key={title} delay={i * 0.05}>
              <div className="grid md:grid-cols-[100px_1fr_1fr] gap-3 md:gap-8 py-8 md:py-10 items-baseline">
                <span className="font-display font-black text-smoke/40 text-3xl md:text-4xl tracking-tighter">0{i + 1}</span>
                <h3 className="font-display font-extrabold uppercase tracking-tight text-2xl md:text-3xl">{title}</h3>
                <p className="text-sm text-smoke leading-relaxed max-w-sm">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="levels" className="px-4 md:px-8 py-20 md:py-28 max-w-[1600px] mx-auto" data-testid="membership-levels">
        <Reveal>
          <p className="text-[11px] tracking-[0.3em] text-smoke mb-3">THREE LEVELS</p>
          <h2 className="font-display font-extrabold uppercase tracking-tight leading-[0.9] text-4xl md:text-6xl mb-3">
            EARNED, NOT BOUGHT
          </h2>
          <p className="text-smoke text-sm md:text-base mb-14">Club access can be bought. Status can't.</p>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-px bg-line border border-line">
          {membership.levels.map((level, i) => {
            const isCurrent = member && member.level === level.name;
            return (
              <Reveal key={level.name} delay={i * 0.08} className={`bg-paper p-8 md:p-12 ${isCurrent ? 'outline outline-2 outline-ink -outline-offset-2' : ''}`}>
                <div className="flex items-baseline justify-between">
                  <p className="font-display font-black text-smoke/40 text-4xl tracking-tighter">0{i + 1}</p>
                  {isCurrent && (
                    <span className="text-[10px] tracking-[0.25em] bg-ink text-paper px-2 py-1" data-testid="current-level-badge">
                      YOUR LEVEL
                    </span>
                  )}
                </div>
                <h3 className="mt-8 font-display font-extrabold uppercase tracking-tight text-3xl md:text-4xl">{level.name}</h3>
                <p className="mt-2 text-sm text-smoke">{level.tag}</p>
                <ul className="mt-8 space-y-3">
                  {level.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-3 text-sm">
                      <Check size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section id="club" className="bg-ink text-paper" data-testid="club-section">
        <div className="px-4 md:px-8 py-24 md:py-36 max-w-[1600px] mx-auto">
          <Reveal>
            <p className="text-paper/50 text-[11px] tracking-[0.35em] mb-4">NALAYAK CLUB</p>
            <h2 className="font-display font-black uppercase tracking-tighter leading-[0.85] text-[11vw] md:text-[6.5vw]">
              ACCESS IS THE REWARD.
            </h2>
            <p className="mt-6 text-paper/75 text-sm md:text-base max-w-lg">
              For those who want to get closer to the drops, the pieces and everything happening behind the scenes.
            </p>
          </Reveal>
          <div className="mt-16 grid md:grid-cols-2 gap-x-16">
            {membership.clubBenefits.map((b, i) => (
              <Reveal key={b} delay={i * 0.04}>
                <div className="flex items-baseline gap-6 py-5 border-b border-paper/15">
                  <span className="font-display font-black text-paper/30 text-xl tracking-tighter shrink-0">0{i + 1}</span>
                  <span className="font-display font-bold uppercase tracking-tight text-lg md:text-xl">{b}</span>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-14 text-[11px] tracking-[0.25em] text-paper/50">
              AFTER THE FOUNDING 500 — ₹{clubYearlyPrice}/YEAR. FOUNDING MEMBERS KEEP CLUB ACCESS.
            </p>
            {!hasClubAccess(member) && (
              <Link
                to="/club"
                data-testid="club-section-join-btn"
                className="inline-block mt-8 bg-paper text-ink px-8 py-4 text-[11px] tracking-[0.3em] font-medium border border-paper hover:bg-transparent hover:text-paper transition-colors duration-300"
              >
                JOIN THE CLUB
              </Link>
            )}
          </Reveal>
        </div>
      </section>

      <section className="border-b border-ink" data-testid="founding-section">
        <div className="px-4 md:px-8 py-24 md:py-36 max-w-[1600px] mx-auto grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <Reveal>
            <p className="text-[11px] tracking-[0.35em] text-smoke mb-4">FOUNDING 500</p>
            <h2 className="font-display font-black uppercase tracking-tighter leading-[0.85] text-[13vw] md:text-[6vw]">
              THE FIRST 500.
            </h2>
            <p className="mt-6 text-sm md:text-base text-ink/70 max-w-md leading-relaxed">
              Before Nalayak became a crowd, there were 500 who got there first.
            </p>
            <p className="mt-4 text-sm md:text-base text-ink/70 max-w-md leading-relaxed">
              Founding members receive permanent Founding Member status and access to the Nalayak Club benefits.
            </p>
            <p className="mt-6 text-[11px] tracking-[0.3em] text-smoke">GET THERE FIRST.</p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="border border-ink p-8 md:p-12" data-testid="founding-card">
              {type === 'founding' ? (
                <>
                  <p className="text-[11px] tracking-[0.3em] text-smoke mb-3">NALAYAK CLUB</p>
                  <p className="font-display font-black uppercase tracking-tight text-4xl md:text-5xl" data-testid="founding-status">
                    FOUNDING MEMBER {formatMemberNo(member.foundingNumber)}
                  </p>
                  <p className="mt-3 text-[11px] tracking-[0.25em] text-smoke">FOUNDING STATUS: PERMANENT</p>
                  <p className="mt-6 font-display font-bold uppercase tracking-tight text-xl">FIRST IN. ALWAYS IN.</p>
                </>
              ) : (
                <>
                  <p className="font-display font-black tracking-tighter text-6xl md:text-7xl">₹{foundingMemberPrice}</p>
                  <p className="mt-2 text-[11px] tracking-[0.25em]">ONE-TIME FOUNDING MEMBERSHIP</p>
                  <p className="mt-1 text-[11px] tracking-[0.25em] text-smoke">NOT A SUBSCRIPTION.</p>
                  <div className="mt-10">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-[11px] tracking-[0.25em] text-smoke" data-testid="founding-progress">
                        {foundingMemberClaimed} OF {foundingMemberLimit} CLAIMED
                      </span>
                      <span className="text-[11px] tracking-[0.25em] text-smoke">GET THERE FIRST.</span>
                    </div>
                    <div className="h-[3px] bg-line w-full">
                      <div className="h-full bg-ink" style={{ width: `${claimedPct}%` }} />
                    </div>
                  </div>
                  <Link
                    to="/club"
                    data-testid="become-founding-btn"
                    className="mt-10 block w-full text-center bg-ink text-paper py-4 text-[12px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300"
                  >
                    BECOME A FOUNDING MEMBER
                  </Link>
                  <p className="mt-4 text-[10px] tracking-[0.2em] text-smoke">
                    Limited to the first 500 members.
                  </p>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 md:px-8 py-20 md:py-28 max-w-[1200px] mx-auto" data-testid="comparison-section">
        <Reveal>
          <p className="text-[11px] tracking-[0.3em] text-smoke mb-3">COMPARE</p>
          <h2 className="font-display font-extrabold uppercase tracking-tight leading-[0.9] text-4xl md:text-6xl">
            BELONG. ACCESS. LEGACY.
          </h2>
        </Reveal>
        <div className="mt-14 overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 pb-6 border-b border-ink">
              <span />
              {[
                ['NALAYAK', 'FREE'],
                ['CLUB', `₹${clubYearlyPrice} / YEAR`],
                ['FOUNDING 500', `₹${foundingMemberPrice} ONE-TIME`],
              ].map(([name, price]) => (
                <div key={name}>
                  <p className="font-display font-extrabold uppercase tracking-tight text-lg md:text-xl">{name}</p>
                  <p className="text-[10px] tracking-[0.2em] text-smoke mt-1">{price}</p>
                </div>
              ))}
            </div>
            <div className="divide-y divide-line">
              {membership.comparison.map(([label, free, club, founding]) => (
                <div key={label} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 py-4 items-center">
                  <span className="text-sm">{label}</span>
                  {[free, club, founding].map((has, i) => (
                    <span key={i} aria-label={has ? 'Included' : 'Not included'}>
                      {has ? <Check size={15} strokeWidth={2} /> : <span className="text-smoke">—</span>}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {!member && (
        <section className="px-4 md:px-8 pb-24 md:pb-32 max-w-[1200px] mx-auto">
          <Reveal>
            <button
              onClick={joinFree}
              data-testid="join-free-btn-bottom"
              className="bg-ink text-paper px-10 py-4 text-[11px] tracking-[0.3em] font-medium hover:bg-ink/85 transition-colors duration-300"
            >
              JOIN NALAYAK — FREE
            </button>
            <p className="mt-4 text-[11px] tracking-[0.2em] text-smoke">START WITH BELONGING.</p>
          </Reveal>
        </section>
      )}
    </main>
  );
}
