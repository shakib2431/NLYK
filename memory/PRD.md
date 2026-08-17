# NALAYAK — PRD

## Original problem statement
Complete redesign of the NALAYAK website into a premium Indian fashion/streetwear ecommerce frontend. Fashion label first, store second. "Luxury fashion website with an attitude problem." Frontend-only this phase: no Supabase, no payments, no real orders. Central mock data layer structured for later Supabase swap. Awwwards-level craft: kinetic hero with masked line reveal, numbered manifesto chapters, slow editorial marquee, framer-motion reveals, lenis smooth scroll, subtle parallax.

## User personas
- Young Indian streetwear shopper (18–30) browsing on mobile, expects H&M-level UX clarity with attitude.
- Returning fan hunting limited drops quickly.
- First-time visitor judging brand credibility in <5 seconds from the hero.

## Architecture
- React 19 + CRA/craco, Tailwind (sharp, rounded-none, ink/paper/smoke palette), Cabinet Grotesk display + Switzer body (Fontshare CDN).
- `src/data/storeData.js` — single source: site config (announcement bar), nav, hero, 24 products, 4 collections, category tiles, manifesto, IRL grid, footer links, listing configs.
- `src/services/catalog.js` — data/service layer (products, collections, search, sorting, related) ready to swap to Supabase.
- `src/context/StoreContext.jsx` — cart, wishlist, recent searches, recently viewed (localStorage-persisted), drawer/overlay state.
- framer-motion (reveals, masked hero lines, drawers), lenis (momentum scroll), react-fast-marquee, sonner toasts.
- 22 routes, all functional; 404 page included.

## Implemented (2026-08-16)
- Global: announcement bar (central config), sticky nav (desktop + full-screen mobile menu), cart drawer with free-shipping progress bar, full-screen search overlay with suggestions/recent/empty state, footer with giant wordmark, payment + region placeholder.
- Homepage: parallax kinetic hero "NOT FOR EVERYONE", editorial marquee, New Arrivals (4-up), The Nalayak Edit asymmetric tiles, Shop the Essentials category rail, dark campaign section "WELCOME TO THE WRONG CROWD" with parallax, Best Sellers horizontal rail, numbered manifesto chapters, brand story split, NALAYAK IRL 6-tile grid, newsletter "DON'T BE NORMAL".
- PLP (/new-arrivals, /men, /women, /tees, /shirts, /hoodies, /bottoms, /accessories): breadcrumb, count, 5 sort modes, category/size/price/availability filters, mobile filter drawer, load-more.
- PDP: gallery + thumbs, colour/size/qty selectors, size guide link, ADD TO BAG / BUY NOW, wishlist, accordions (description/delivery/returns), sold-out state, Complete the Look, You May Also Like, Recently Viewed.
- Wishlist page (persisted), /cart full page with summary, account page (placeholder sign-in via localStorage, tabs: profile/orders/wishlist/addresses/logout), search page, About/Contact/Size Guide/Shipping/Returns/FAQ with real content, 404.
- SEO: per-page titles + meta descriptions, semantic headings, alt text.
- All imagery curated stock, centralized in storeData.js with SafeImg fallback.

## Implemented (2026-08-16, phase 2 — premium extension)
- NALAYAK MEMBERS (/membership): campaign hero, "NOT A REWARDS PROGRAM. A MEMBERSHIP." positioning, 5 numbered editorial benefits, 3 levels (NALAYAK / INSIDER / ICON) with current-level highlight; join persists to localStorage (`nalayak_member`).
- Account: "WELCOME BACK." dashboard strip (membership status, early access, wishlist count) + MEMBERSHIP tab (level card, progress bar, benefits, member offers, activity). Join CTA for non-members.
- 3D product viewer: `@google/model-viewer` + `three`, lazy-loaded only when "VIEW IN 3D" is clicked; full-screen dark modal with rotate/zoom/fullscreen/close controls, Esc-to-close, poster fallback on model load failure. Product schema extended with has3D/modelUrl/posterImage (DAILY CHAOS SNEAKERS uses Khronos sample shoe GLB as placeholder).
- Custom design request (/custom-design): editorial hero "MAKE IT YOURS.", 6-chapter form (details, garment, size, idea, vibe, colours, budget, inspiration upload with local previews/removal), validation with inline errors, review summary, success state with mock ref NL-XXXX; requests stored in `nalayak_custom_requests`.
- Subtle CTAs woven in: CUSTOM nav item, PDP members line + "WANT SOMETHING DIFFERENT?" block, homepage MAKE IT YOURS split + "THE WRONG CROWD HAS BENEFITS." strip, footer Members/Custom Design links. Nav breakpoint moved to lg to fit CUSTOM.
- Verified (phase 2): membership join + level badge + account panel; 3D open/rotate/zoom/close + fallback (tested with a 404 model); custom form validation, uploads, remove, summary, edit, submit, stored request. Console clean.

## Implemented (2026-08-16, phase 3 — membership model refinement)
- Two-layer model: NALAYAK MEMBERS (free, auto-created on account sign-in — "START WITH BELONGING.") and NALAYAK CLUB (paid access layer — "ACCESS IS THE REWARD.").
- FOUNDING 500 launch offer: ₹999 one-time, permanent status, "13 OF 500 CLAIMED" progress (no timers); joining assigns a mocked founding number (#0014). Config centralized: `membershipConfig` in storeData.js (limit/price/claimed/clubYearlyPrice).
- Clean membership service layer `src/services/membership.js`: membershipType (free/club/founding), membershipStatus, membershipNumber, foundingNumber, startedAt, expiresAt, isFoundingMember + start/renew/cancel subscription stubs for the future ₹999/year Club.
- Membership page rebuilt: hero (JOIN FREE / EXPLORE THE CLUB), free benefits (numbered editorial), earned levels (NALAYAK → INSIDER → ICON, "EARNED, NOT BOUGHT"), dark Club section, Founding 500 conversion section, minimal 3-column comparison ("BELONG. ACCESS. LEGACY.").
- First-visit welcome popup (once per browser): JOIN NALAYAK — FREE / EXPLORE THE CLUB.
- Account: dashboard membership cell shows free / club (active-until) / founding (# + PERMANENT); early access unlocked only for club/founding; MEMBERSHIP tab splits MEMBERSHIP (paid layer, founding join CTA) from EARNED STATUS (level progress).
- PDP microcopy: "MEMBERS GET FIRST LOOKS." (free/none) vs "CLUB MEMBERS GET EARLY ACCESS." (club/founding). Homepage keeps a single membership strip ("START WITH BELONGING.").
- Verified (phase 3): popup once-per-visit, free join, founding join → #0014 + permanent status on page + account, auto free membership on sign-in, PDP copy switching, early-access lock for free members. Console clean.

## Implemented (2026-08-16, phase 4 — club paywall, drops, progression, founding card)
- Club paywall (/club): "ACCESS IS THE REWARD." hero, benefits, Founding 500 pricing card vs future ₹999/year, mock checkout modal (summary → processing → "WELCOME TO THE CLUB."). Prices/limits only from `membershipConfig` (foundingPrice 999 one-time, foundingLimit 500, clubYearlyPrice, currency, billingPeriod). Razorpay-ready CTA, mock activation for now.
- Early-access drops (/club/drops): 4 club products with clubOnly/clubEarlyAccess/clubReleaseAt/publicReleaseAt; states COMING SOON / CLUB EARLY ACCESS / PUBLIC / SOLD OUT with day·time release labels (no countdowns). Guests see locked banner + locked card overlays; PDP enforces lock (add-to-bag replaced by JOIN THE CLUB panel); product-card quick-add shows CLUB ACCESS strip. Members get CLUB ACCESS LIVE + purchase.
- Status progression: `statusLevels` config (NALAYAK 0+ / INSIDER 3+ / ICON 6+ qualifying orders, placeholder thresholds) + `getStatusProgress()`; account shows current level, % to next, orders remaining, next benefit, member since. Earned, not bought — payment never changes level.
- Founding card (/membership/founding): monochrome editorial card with member number, Web Share API share + canvas-generated PNG download; locked state for non-founding members.
- Membership data model reworked in services/membership.js: membershipType/membershipStatus/membershipLevel/membershipNumber/foundingNumber/isFoundingMember/foundingStatus (permanent, independent)/clubMembershipStatus/clubStartedAt/clubExpiresAt + hasClubAccess/getMembershipDisplay helpers. Founding status survives club expiry by design.
- Verified: guest lock on drops + PDP, paywall purchase → #0014, member unlock of club-only product (add-to-bag + CLUB EARLY ACCESS label), dashboard founding display, progression panel (33% to Insider, 2 orders), card page + share/download buttons, sign-in does not overwrite founding status. Console clean.

## Implemented (2026-08-17, phase 5 — notifications, OG image, Razorpay plumbing)
- Drop/restock notifications: NOTIFY ME on coming-soon drop cards + PDP locked panel ("NOTIFY ME AT PUBLIC RELEASE") and NOTIFY WHEN BACK on sold-out PDPs. Subscriptions persist in localStorage (`nalayak_drop_alerts`), toggle on/off with toast. Ready to map to a Supabase `drop_alerts` table.
- OG/social: generated brand OG image (public/og-image.png, 1200×630) + og:/twitter: meta in index.html. Founding card share now attaches the actual PNG via Web Share API files when supported (falls back to text/link/clipboard).
- Razorpay plumbing (key-driven): backend POST /api/razorpay/create-order + /api/razorpay/verify (server-side signature verification, orders recorded in Mongo `membership_orders`, membership never activated without verified payment). Frontend paywall loads checkout.js, opens Razorpay, verifies, then activates. Without RAZORPAY_KEY_ID/SECRET in backend/.env → 503 → frontend falls back to clearly-marked mock activation.
- Verified: notify subscribe/unsubscribe persists (coming-soon + sold-out), drops card notify, paywall mock fallback activates founding, create-order 503/400 handling, OG image serves (200) with meta tags present. Console clean except the intentional 503 probe when paying without keys.

## Implemented (2026-08-17, phase 6 — alerts in account + welcome emails)
- ALERTS tab in account: lists every registered drop/restock alert with product image, alert type (DROP ALERT — COMING SOON / RESTOCK ALERT / etc.), and remove. Empty state links to Club Drops.
- Welcome emails (Emergent managed Resend, real sends): POST /api/email/welcome with fixed server-side branded templates (member: "You're in the wrong crowd." / club: "Welcome to Nalayak Club."), guardrail gate on every send, Mongo dedupe (one per email+kind), invalid-email 400. Frontend fires on account creation (member) and club/founding activation (club), only when an account email exists. No caller-supplied HTML/subject; links point at the app domain only.
- Verified: both templates sent (real email IDs returned), dedupe returns already_sent, invalid email rejected; UI sign-in fired member email, club join fired club email (confirmed via already_sent); alerts tab list/remove works. Console clean.

## Implemented (2026-08-17, phase 7 — drop alert emails + custom request emails)
- Drop alerts now register server-side: POST /api/alerts/register (upsert per email+slug) fires when a signed-in user hits NOTIFY ME / NOTIFY WHEN BACK; localStorage remains the offline fallback.
- Go-live blast: POST /api/drops/go-live {slug, name} emails every un-notified registrant a branded "…IS LIVE." email (link to the product page), then marks them notified — retriggering sends 0. Hook for a cron/admin job later.
- Custom requests now persist server-side: POST /api/custom-requests stores the request in Mongo, assigns the authoritative NL-XXXX ref (frontend shows the backend ref), and sends a branded "REQUEST RECEIVED." confirmation email. Offline fallback keeps the local mock ref.
- Verified: register → go-live sent 1, retrigger sent 0; UI sign-in + NOTIFY WHEN BACK registered server-side (confirmed by go-live sending to that address); UI custom form returned backend ref NL-4030 with "Confirmation email sent" toast; invalid emails rejected with 400. Console clean.

## Implemented (2026-08-17, phase 8 — order receipts + request status emails)
- Mock checkout is now a real order loop: /cart CHECKOUT (requires sign-in) → POST /api/orders stores the order in Mongo (NLO-XXXX), sends a branded itemised receipt email, shows a "GOOD CHOICE." confirmation, clears the bag. Account → ORDERS lists real orders from the backend (id, date, items, total, status).
- Request status emails: POST /api/custom-requests/{ref}/status (received/in-progress/completed) updates the stored request and emails the customer a branded "YOUR PIECE IS IN PROGRESS." update. Validation: 400 bad status, 404 unknown ref.
- Verified: UI purchase loop (sign-in → add to bag → checkout → NLO-1660 + receipt email + order in account + cart cleared); curl order create/list; status update emailed for NL-9092; invalid status/ref rejected. Fixed a missing useState import that blanked /cart. Console clean.

## Implemented (2026-08-17, phase 9 — tracking page, ship emails, real About)
- Track order: /track lookup by order number + /track/:orderId timeline page (PLACED → SHIPPED → DELIVERED with dates, items, totals, not-found state). Receipt + status emails now link straight to the tracking page; footer Track Order points to /track; account order rows link through.
- Ship notifications: POST /api/orders/{id}/status (placed/shipped/delivered) updates the order with timestamps and emails "IT'S ON ITS WAY." / "IT'S THERE." to the customer.
- About page rebuilt: editorial split with studio photography + headline, then "BORN IN MUMBAI. RAISED BY THE WRONG CROWD." story section.
- Verified: lookup → NLO-1660 timeline with all three states dated; unknown number shows NO SUCH ORDER; shipped + delivered emails both sent (emailed:true); bad status 400, unknown order 404; About renders with image. Console clean.

## Implemented (2026-08-17, phase 10 — delivery proof ask + account timelines)
- Delivered orders now send a delivery-proof email: "IT'S THERE." + wear-it/shoot-it/tag-@NALAYAK ask with a SEE NALAYAK IRL link (shipped keeps the tracking CTA).
- Account → ORDERS rows are expandable: chevron toggle reveals the same PLACED → SHIPPED → DELIVERED timeline as the tracking page (shared Timeline component) plus a link to the full tracking page.
- Verified: delivered hook on NLO-5118 sent the review-ask email; account orders expand/collapse with correct timeline states. Console clean.

## Implemented (2026-08-17, phase 11 — IRL uploads + admin dashboard)
- IRL uploads: delivered orders show SHARE YOUR FIT on the tracking page (preview → upload to Emergent object storage → pending). Homepage NALAYAK IRL grid leads with approved customer uploads (fetched live, placeholders fill the rest). Pending/rejected files are never served publicly.
- Admin dashboard at /admin ("THE BACK ROOM", passcode-gated via ADMIN_KEY, stored in localStorage): ORDERS (advance placed→shipped→delivered, emails fire), CUSTOM (received→in-progress→completed, emails fire), IRL (approve/reject uploads with image previews). Status + go-live endpoints now require X-Admin-Key (401 without).
- Verified: upload → pending → wrong key 401 → approve → approved list → public file serves (200 image/png) → appears as first tile of homepage IRL grid; UI upload flow with preview + RECEIVED state; admin gate rejects wrong key; orders/custom tabs list and advance. Console clean.

## Implemented (2026-08-17, phase 12 — admin drop trigger + member faces)
- Admin DROPS tab: all club drops listed with club/public release windows; SEND DROP ALERTS fires the key-gated go-live blast and reports "N members emailed."
- Member faces: account PROFILE tab shows FEATURED IN NALAYAK IRL — the customer's approved uploads (matched via their orders), as a badge of honour.
- Verified: blast button emailed the freshly registered member (1 sent); profile badge renders for the test customer; /api/irl/mine returns approved uploads by email; go-live without admin key returns 401. Console clean.

## Verified (phase 1)
- Homepage render, PDP size-select → add-to-bag → drawer subtotal/qty update, PLP filter + sort, search → result navigation, wishlist add + persistence across navigation, empty cart drawer, collections grid. Mobile: responsive classes throughout; visual check pending (screenshot tool fixed at desktop viewport).

## Backlog / next tasks
- P0: Supabase schema + auth + real checkout/payment (phase 2, explicitly deferred by user).
- P1: Swap curated stock for real Nalayak photography; hero video support (container already structured).
- P1: Real Nalayak GLB models to replace the placeholder shoe; custom-design requests to Supabase storage; membership levels driven by real order history.
- P1: Mobile visual QA pass on real devices.
- P2: Track-order flow, real newsletter capture, size-guide per-category tables, lookbook page.
- P2: Performance pass (srcset variants, preconnect hints).
