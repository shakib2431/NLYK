// Membership service layer — mock state today, Supabase rows tomorrow.
import { membershipConfig, statusLevels } from '@/data/storeData';

const now = () => new Date().toISOString();

export const formatMemberNo = (n) => `#${String(n).padStart(4, '0')}`;

export const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
    : '—';

const mockMembershipNumber = () => `NM-${Math.floor(1000 + Math.random() * 9000)}`;

export const createFreeMembership = () => ({
  membershipType: 'free',
  membershipStatus: 'none',
  membershipLevel: 'NALAYAK',
  membershipNumber: mockMembershipNumber(),
  foundingNumber: null,
  isFoundingMember: false,
  foundingStatus: 'none',
  clubMembershipStatus: 'none',
  clubStartedAt: null,
  clubExpiresAt: null,
  startedAt: now(),
  since: new Date().getFullYear(),
  level: 'NALAYAK',
  progress: 0,
  qualifyingOrders: 1, // mock activity signal until Supabase is the source of truth
  benefits: [],
});

export const createFoundingMembership = () => ({
  ...createFreeMembership(),
  membershipType: 'club',
  membershipStatus: 'active',
  foundingNumber: membershipConfig.foundingMemberClaimed + 1,
  isFoundingMember: true,
  foundingStatus: 'permanent',
  clubMembershipStatus: 'active',
  clubStartedAt: now(),
  clubExpiresAt: null,
});

export const startClubSubscription = (member) => ({
  ...(member || createFreeMembership()),
  membershipType: 'club',
  membershipStatus: 'active',
  clubMembershipStatus: 'active',
  clubStartedAt: now(),
  clubExpiresAt: new Date(Date.now() + 365 * 864e5).toISOString(),
});

export const cancelClubSubscription = (member) => ({
  ...member,
  membershipStatus: 'cancelled',
  clubMembershipStatus: 'cancelled',
});

export const renewClubSubscription = (member) => startClubSubscription(member);

export const membershipTypeOf = (member) =>
  !member ? null : member.isFoundingMember ? 'founding' : member.membershipType || 'free';

export const hasClubAccess = (member) =>
  !!member &&
  (member.isFoundingMember ||
    (member.membershipType === 'club' && member.membershipStatus === 'active'));

export const getMembershipDisplay = (member) => {
  if (!member) return { title: 'NOT A MEMBER — YET', sub: null };
  if (member.isFoundingMember) {
    return {
      title: `FOUNDING MEMBER ${formatMemberNo(member.foundingNumber)}`,
      sub: member.clubExpiresAt
        ? `CLUB ACTIVE UNTIL ${formatDate(member.clubExpiresAt)} · FOUNDING STATUS: PERMANENT`
        : 'FOUNDING STATUS: PERMANENT',
    };
  }
  if (member.membershipType === 'club' && member.membershipStatus === 'active') {
    return { title: 'NALAYAK CLUB', sub: `ACTIVE UNTIL ${formatDate(member.clubExpiresAt)}` };
  }
  return { title: 'NALAYAK MEMBER', sub: `MEMBER SINCE ${member.since}` };
};

// ── Status progression — earned, not bought ──
export const getStatusProgress = (member) => {
  const orders = member?.qualifyingOrders ?? 0;
  const idx = statusLevels.reduce((acc, l, i) => (orders >= l.minOrders ? i : acc), 0);
  const current = statusLevels[idx];
  const next = statusLevels[idx + 1] || null;
  const pct = next ? Math.min(100, Math.round((orders / next.minOrders) * 100)) : 100;
  return { current, next, orders, pct, ordersToNext: next ? Math.max(0, next.minOrders - orders) : 0 };
};

// ── Club drops access control ──
export const getDropState = (product, member) => {
  if (product.stock === 0) return 'sold-out';
  const t = Date.now();
  if (product.clubReleaseAt && t < Date.parse(product.clubReleaseAt)) return 'coming-soon';
  if (product.clubOnly) return hasClubAccess(member) ? 'club-live' : 'locked';
  if (product.clubEarlyAccess && product.publicReleaseAt && t < Date.parse(product.publicReleaseAt))
    return hasClubAccess(member) ? 'club-live' : 'locked';
  return 'public';
};

export const canPurchase = (product, member) => {
  const s = getDropState(product, member);
  return s === 'public' || s === 'club-live';
};

export const formatReleaseLabel = (iso) =>
  `${new Date(iso).toLocaleDateString('en-IN', { weekday: 'long' }).toUpperCase()} · ${new Date(iso)
    .toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true })
    .toUpperCase()}`;
