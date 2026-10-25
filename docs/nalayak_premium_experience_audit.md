# NALAYAK STUDIOS — Comprehensive Premium E-Commerce Experience Audit
**Role:** Senior Luxury Fashion E-Commerce Designer, UX Architect & React Frontend Engineer  
**Benchmark:** [BLUORNG](https://bluorng.com/) & [BLUORNG Valentine Drop](https://bluorng.com/collections/valentine-drop)  
**Date:** October 2026  
**Repository:** `c:\Users\paapr\OneDrive\Desktop\NLYK STUDIOS`  
**Operating Mode:** Audit & Baseline Verification Only — Zero Destructive Refactoring  

---

## 1. Executive Summary & Baseline Production Build

### 1.1 Objective & Strategy
NALAYAK STUDIOS is an original Indian streetwear label characterized by an unapologetic, rebellious attitude ("WE WERE NEVER MADE TO FIT IN"), brutalist typography, Devanagari graphic fragments (*नालायक*), heavyweight textiles (240–450 GSM), and an exclusive members-only drop ecosystem (THE CLUB).

The goal of this audit is to systematically evaluate the entire digital shopping ecosystem against leading luxury streetwear platforms (principally **BLUORNG**), pinpointing friction points, visual inconsistencies, layout shifts, conversion blockers, and architectural opportunities. 

### 1.2 Baseline Production Build Verification
A clean production build was executed using `@craco/craco build`:
- **Exit Status:** `0` (Success)
- **Output Status:** `Compiled successfully.`
- **Bundle Metrics (Gzipped):**
  - `build\static\js\main.78d7fbb5.js`: 446.47 kB
  - `build\static\js\547.8afc1081.chunk.js`: 145.81 kB
  - `build\static\media\draco_decoder.fffcf5b6e1ab33aa0894.js`: 136.27 kB
  - `build\static\css\main.db1c8761.css`: 14.89 kB
  - `build\static\media\draco_wasm_wrapper.32411aeda4682d683777.js`: 11.32 kB
  - `build\static\media\draco_wasm_wrapper.88fe410aa6dcfa598aa5.js`: 11.19 kB
  - `build\static\media\basis_transcoder.7719480561a2d5fc7ae9.js`: 10.82 kB
- **Integrity Result:** The build passes cleanly with zero fatal compilation errors.

---

## 2. Forensic Website Audit by Domain

### 2.1 Header, Announcement Bar & Navigation

#### Current State & Code Evidence
- **Announcement Bar ([`Header.jsx`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/components/Header.jsx#L75-L89)):**
  - Uses `react-fast-marquee` cycling `site.announcement` four times in a black ticker (`bg-ink text-paper py-2`).
  - Text: `"FREE SHIPPING ON ORDERS ABOVE ₹999 — NO COUPON, NO BEGGING"`.
- **Desktop Navigation ([`Header.jsx`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/components/Header.jsx#L11-L19)):**
  - Links: `NEW IN`, `COLLECTIONS`, `CATEGORIES`, `MEN`, `WOMEN`, `CLUB`, `CUSTOM`.
  - Mega Menu trigger via `onMouseEnter` / `onMouseLeave` with a 160ms debounce.
- **Mega Menu ([`MegaMenu.jsx`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/components/MegaMenu.jsx#L6-L135)):**
  - Implements 6 visual tiles per section with titles, specs, and thumbnails.
- **Mobile Navigation ([`MobileNav.jsx`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/components/MobileNav.jsx#L1-L102)):**
  - Slides in from left with full screen `bg-ink text-paper`, account link at top, and category links with `ChevronRight`.

#### Identified Issues & Conversion Blockers
1. **Dead/Misleading Mega Menu Destination:**
   - In `MegaMenu.jsx` line 95, `CATEGORIES` section sets `viewAllLink: '/collections'`. Collections and Categories are distinct taxonomies; linking Categories to `/collections` confuses shoppers expecting the full catalog (`/shop` or `/all`).
2. **Missing Active State Differentiation:**
   - `NavLink` uses `isActive` with a bottom border, but the border height (`border-b-2`) introduces a 1px layout shift if padding is not balanced.
3. **Mobile Menu Visual Disconnect:**
   - MobileNav uses deep black background (`bg-ink`) while the main site header is stark white (`bg-white`). The transition between header and mobile drawer feels jarring rather than seamless.
4. **Announcement Bar Inactivity:**
   - The marquee text is plain text with no click action. Clicking could open the Shipping & Delivery policy modal or copy a promo notice.

---

### 2.2 Homepage Experience (`Home.jsx`)

#### Current State & Code Evidence
- **Render Sequence (14 Sections):**
  1. `Hero()` (lines 19–180)
  2. `EditorialMarquee()` (lines 181–193)
  3. `Categories()` (lines 228–305)
  4. `New Arrivals Grid` (lines 597–612)
  5. `ShopByDepartment()` (lines 307–375)
  6. `NalayakEdit()` (lines 195–226)
  7. `Campaign()` (lines 377–408)
  8. `Best Sellers Rail` (lines 624–642)
  9. `BrandStory()` (lines 463–496)
  10. `CustomDesignSection()` (lines 432–461)
  11. `IrlGrid()` (lines 498–535)
  12. `CustomerReviews()` (lines 653)
  13. `Manifesto()` (lines 410–430)
  14. `Newsletter()` (lines 537–578)

#### Identified Issues & Visual Inconsistencies
1. **Homepage Rhythm & Section Density:**
  - 14 full-bleed sections make the mobile page extremely long (~9,000px height). User fatigue leads to high bounce rates before reaching Customer Reviews or Manifesto.
2. **Best Sellers Link Inaccuracy:**
  - In `Best Sellers Rail` ([`Home.jsx#L630`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/pages/Home.jsx#L630)), `linkTo="/collections"` is used for a section titled *"THE ONES EVERYONE WANTS"*, whereas it should lead to a filtered best-sellers view or `/shop`.
3. **Campaign Parallax Contrast:**
  - Parallax transform on campaign background image (`scale(1.16)` with `y`) can cause slight repaint stutter on low-power mobile devices.
4. **Department Discovery Imagery:**
  - `ShopByDepartment` uses product packshots (`/products/devanagari-chaos-tee-front.jpg`) rather than aspirational lifestyle editorial shots.

---

### 2.3 Product Discovery & Collection Pages (`Collections.jsx`, `CollectionDetail.jsx`, `ListingPage.jsx`)

#### Current State & Code Evidence
- **Architecture:**
  - `Collections.jsx`: Renders high-impact asymmetrical editorial collection cards (`col-span-7` / `col-span-5`) followed by full product catalog with filter drawer and dense view toggle.
  - `CollectionDetail.jsx`: Dynamic drop page (`/collections/:slug`) with hero banner, piece counter, filter drawer, and dense view toggle.
  - `ListingPage.jsx`: Dynamic listing handler for categories (`/men`, `/women`, `/tees`, etc.) with pagination/load-more (`PAGE_SIZE = 12`).
- **Filter System ([`AdvanceFilterDrawer.jsx`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/components/AdvanceFilterDrawer.jsx)):**
  - Right-hand slide-over drawer with sizes (`XS`–`XL`), categories, solid color swatches, availability, price ranges, and sorting.
- **Dense View Feature:**
  - Includes a custom Compass Star button that switches between standard editorial 4-column cards and ultra-dense catalog view with category break markers (inspired by BLUORNG's desktop archive view).

#### Identified Issues & Visual Inconsistencies
1. **Dense View Aesthetic Clash:**
  - In `ListingPage.jsx` lines 282 and 296, dense items use `rounded-xl` borders and `border-dashed border-neutral-300`. This curved, dashed border conflicts with the sharp brutalist identity of NALAYAK (which uses clean 0px or 1px razor hairlines).
2. **Category Tabs in Dense View:**
  - Switching category tabs when dense view is enabled works, but does not scroll the user smoothly to the matching section header.
3. **Reset Filters Feedback:**
  - When filters produce 0 results, the empty state displays `"NOTHING MATCHES. Loosen the filters."`, but does not show which specific filter caused the zero count (e.g. "No Green Hoodies in XXL").

---

### 2.4 Product Card Experience ([`ProductCard.jsx`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/components/ProductCard.jsx))

#### Current State & Code Evidence
- **Card Ratio:** 3:4 portrait ratio (`aspect-[3/4]`), white background with 1px border.
- **Image Hover:** Flips to `product.images[1]` on hover with smooth opacity transition.
- **Quick Add Drawer:** Slides up from card bottom on desktop hover. Supports size selection pills and 1-click addition.
- **Color Selector:** Direct solid color swatch buttons below product title that update the displayed card thumbnail.
- **Badges:** Refined solid pills (`BEST SELLER`: `#FF4400`, `NEW`: `#1035FF`, `LIMITED`: `#143822`, `DISCOUNT`: `#B80C2A`).

#### Identified Issues & UX Gaps
1. **Touchscreen Quick Add Unavailability:**
  - Quick Add is explicitly hidden on touch screens via `hidden md:block` (line 87). Mobile shoppers (over 70% of Indian streetwear traffic) must navigate into the PDP to select a size and add to cart.
2. **Missing Secondary Image Fallback:**
  - If a product only has 1 image, hovering causes a slight scale animation on `selectedImage` without secondary visual feedback.
3. **Price Typography Visual Weight:**
  - Price text uses `text-[13px] font-semibold`. For premium streetwear, prices should have slightly stronger typographic distinction (`font-display font-bold text-sm tracking-tight`).

---

### 2.5 Product Detail Page ([`ProductDetail.jsx`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/pages/ProductDetail.jsx))

#### Current State & Code Evidence
- **Layout:** 2-column desktop layout (Left: interactive image gallery with fullscreen cursor zoom; Right: sticky product info, spec pills, color swatches, size grid, size guide trigger, purchase CTAs, accordion details).
- **Mobile Sticky Purchase Bar ([`MobileStickyPurchaseBar.jsx`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/components/MobileStickyPurchaseBar.jsx)):**
  - Renders when the main Add to Bag button scrolls out of viewport on mobile.
- **Specifications ([`ProductSpecs.jsx`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/components/ProductSpecs.jsx)):**
  - Accurately parses verified specs (GSM, 100% cotton, fit silhouette, pre-shrunk finish) without fabricating false claims.
- **Size Guide ([`SizeGuideModal.jsx`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/components/SizeGuideModal.jsx)):**
  - Verified garment specs (chest, length, waist) with inches/cm toggle and fit guidance.

#### Critical Bug & Conversion Blockers
1. **"BUY NOW" CTA Handoff Flaw ([`ProductDetail.jsx#L176-L184`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/pages/ProductDetail.jsx#L176-L184)):**
   - When a customer clicks `BUY NOW`, `tryAdd(true)` is invoked.
   - It adds the garment to cart and fires a toast saying `"Straight to checkout energy."`, **but it neither opens the Cart Drawer nor navigates to `/cart`**!
   - The user remains on the PDP, creating confusion and directly dropping checkout conversions.
2. **Size Unselected Friction:**
   - If size is unselected, clicking Add to Bag displays a toast error `"Pick a size first."` but does not visually shake or highlight the size pills to guide the user's eye.
3. **Image Gallery Navigation on Mobile:**
   - Mobile uses vertical stacking or swiping, but lacks a visible swipe dot indicator or thumbnail carousel strip.

---

### 2.6 Cart Drawer & Checkout Flow ([`CartDrawer.jsx`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/components/CartDrawer.jsx) & [`CartPage.jsx`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/pages/CartPage.jsx))

#### Current State & Code Evidence
- **Cart Drawer:**
  - Slide-in sheet from right (`max-w-md bg-paper`).
  - Dynamic free shipping calculation (`FREE_SHIPPING_THRESHOLD = 999`) with progress bar.
  - Line items with thumbnail, size/color variant label, increment/decrement, and trash button.
  - "COMPLETE THE DROP" 1-click accessory recommendation rail.
  - Checkout CTA linking to `/cart`.
- **Cart Page (`CartPage.jsx`):**
  - Full-width table view of items with order summary and expandable checkout form.
  - Posts order to `${REACT_APP_BACKEND_URL}/api/orders`.
  - Generates real order confirmation with tracking token.

#### Identified Issues & Optimization Opportunities
1. **Two-Step Checkout Handoff:**
   - Clicking `CHECKOUT` inside the Cart Drawer routes to `/cart` rather than opening a streamlined inline checkout or direct payment handoff.
2. **Shipping Cost Clarification:**
   - Shipping fee is hardcoded to ₹99 when below threshold. While clear, an explicit indicator showing "Express Delivery: 48-hour Dispatch" would strengthen value perception.
3. **Empty Cart Action:**
   - Empty cart CTA links to `/new-arrivals`, but lacks quick category pills (e.g. `TEES`, `HOODIES`, `BEST SELLERS`) for immediate one-tap exploration.

---

### 2.7 Search Experience ([`SearchOverlay.jsx`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/components/SearchOverlay.jsx) & [`SearchPage.jsx`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/pages/SearchPage.jsx))

#### Current State & Code Evidence
- Full-screen search overlay with large input, popular suggestions, recent searches from `localStorage`, and instant result filtering via `searchProducts()`.

#### Critical UX Bug
1. **Search Overlay Click Closure Missing ([`SearchOverlay.jsx#L92`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/components/SearchOverlay.jsx#L92)):**
   - Clicking a search result triggers `onClick={go}`, where `go = () => q.trim() && addRecentSearch(q.trim());`.
   - It does **not** call `setSearchOpen(false)`. While `Header.jsx` has a `location.pathname` listener, if a user clicks a product while already on that page or on specific route changes, the overlay can remain locked over the viewport.

---

### 2.8 Customer Reviews & Social Proof ([`CustomerReviews.jsx`](file:///c:/Users/paapr/OneDrive/Desktop/NLYK%20STUDIOS/frontend/src/components/CustomerReviews.jsx))

#### Current State & Code Evidence
- Connects to `/api/reviews` with graceful fallback to `demoReviews`.
- Supports category filtering (`fabric`, `fit`, `identity`, `print`).
- Displays verified buyer badge, location, garment specification tags, and quote.

#### Opportunities for Improvement
- Review cards on mobile currently slide horizontally. Adding a clean card-deck swipe gesture or pagination bullets will improve mobile usability.
- Reviewer rating stars currently use solid black (`fill-current text-ink`). A subtle warm accent or gold rating star elevates luxury credibility without breaking monochrome restraint.

---

### 2.9 Performance, Accessibility & Responsive Integrity

#### Current State & Code Evidence
- **Fonts:** Cabinet Grotesk (headings) and Switzer (body) loaded via `@font-face` in `index.css`.
- **Smooth Scroll:** Lenis library initialized in `App.js` with `smoothWheel: true, lerp: 0.09`.
- **Image Handling:** `SafeImg.jsx` wraps Unsplash and local image URLs with fallback handling.

#### Identified Issues
1. **Touch Targets on Mobile:**
   - Some footer utility links and quantity increment buttons on mobile have touch targets under 44x44px.
2. **Missing Keyboard Focus Indicators:**
   - Some custom buttons lack prominent `:focus-visible` outline rings for screen-reader and keyboard users.
3. **Cumulative Layout Shift (CLS) on Hero Slides:**
   - Parallax transform on Hero can cause slight layout shift before full viewport height settles on mobile browsers with dynamic URL bars.

---

## 3. Prioritized Recommendations & Action Items

| Priority | Area | Issue | Solution |
| :--- | :--- | :--- | :--- |
| **P0 (Critical)** | Product Detail | `BUY NOW` button does not route to checkout | Update `tryAdd(true)` to navigate directly to `/cart` or open Cart Drawer with instant checkout trigger. |
| **P0 (Critical)** | Search Overlay | Clicking search result does not explicitly close overlay | Add `setSearchOpen(false)` inside result item `onClick` handler. |
| **P1 (High)** | Navigation | `CATEGORIES` in Mega Menu links to `/collections` | Point `viewAllLink` to `/shop` or dedicated category landing. |
| **P1 (High)** | Product Cards | Quick Add unavailable on mobile devices | Implement a sleek mobile Quick Add bottom sheet or accessible tap action. |
| **P1 (High)** | Dense View | `rounded-xl` and dashed borders clash with brand identity | Replace curved/dashed borders with sharp 0px brutalist frames (`border border-line`). |
| **P2 (Medium)** | Homepage | 14 sections create excessive mobile scroll fatigue | Consolidate and refine section rhythm; tighten vertical padding on smaller screens. |
| **P2 (Medium)** | Product Card | Price typographic weight is understated | Upgrade price styling to crisp, authoritative uppercase typography. |
| **P2 (Medium)** | PDP Size Guidance | Unselected size gives toast but no visual button shake | Add subtle visual error state / shake animation to unselected size pills. |
| **P3 (Polish)** | Footer | App "Coming Soon" styling has legacy glow class | Align App teaser with minimalist luxury atelier aesthetic. |

---

## 4. Affected Files & Module Map

| Module / Area | Source Files | Changes Required |
| :--- | :--- | :--- |
| **Design System & Tokens** | `frontend/src/index.css`, `frontend/tailwind.config.js` | Normalize typography, button states, focus rings, and border tokens. |
| **Header & Navigation** | `frontend/src/components/Header.jsx`, `MegaMenu.jsx`, `MobileNav.jsx` | Fix Category link target, refine active states, harmonize mobile drawer. |
| **Homepage Experience** | `frontend/src/pages/Home.jsx` | Refine section rhythm, update best-seller CTA destination, optimize mobile spacing. |
| **Product Discovery & Cards**| `frontend/src/components/ProductCard.jsx`, `AdvanceFilterDrawer.jsx` | Enable mobile Quick Add, refine price typography, unify border tokens. |
| **Collection & Listing Pages**| `frontend/src/pages/Collections.jsx`, `CollectionDetail.jsx`, `ListingPage.jsx` | Remove rounded-xl dashed styling in dense view, polish empty states. |
| **Product Detail Page** | `frontend/src/pages/ProductDetail.jsx`, `MobileStickyPurchaseBar.jsx` | Fix `BUY NOW` checkout handoff, add size selection highlight guide. |
| **Cart & Search Drawers** | `frontend/src/components/CartDrawer.jsx`, `SearchOverlay.jsx` | Fix search overlay closure bug, enhance empty cart navigation. |
| **Brand & Support Pages** | `frontend/src/pages/About.jsx`, `InfoPages.jsx` | Ensure consistent typography, breadcrumbs, and form field touch ergonomics. |

---

## 5. Phased Implementation Plan

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASED IMPLEMENTATION ROADMAP                        │
│                                                                        │
│  [ Phase 1: Full Audit & Baseline Verification ]  ◄── (COMPLETED NOW)  │
│                         │                                              │
│                         ▼                                              │
│  [ Phase 2: Design System & Shared Tokens ]                            │
│    - Reusable UI tokens, focus rings, typography, button variants       │
│                         │                                              │
│                         ▼                                              │
│  [ Phase 3: Homepage Experience Polish ]                               │
│    - Section rhythm, corrected CTA links, verified editorial assets    │
│                         │                                              │
│                         ▼                                              │
│  [ Phase 4: Navigation & Product Discovery ]                           │
│    - MegaMenu route fixes, Mobile Quick Add, card price typography      │
│                         │                                              │
│                         ▼                                              │
│  [ Phase 5: Collections & Listing Pages ]                              │
│    - Dense view brutalist styling, filter feedback, responsive grids   │
│                         │                                              │
│                         ▼                                              │
│  [ Phase 6: Product Detail Experience ]                                │
│    - Fix BUY NOW checkout handoff, size selection guide, sticky bar    │
│                         │                                              │
│                         ▼                                              │
│  [ Phase 7: Cart, Search & Checkout Handoff ]                          │
│    - Search click closure, empty cart shortcuts, shipping progress     │
│                         │                                              │
│                         ▼                                              │
│  [ Phase 8: Brand & Support Pages ]                                    │
│    - About & Info pages consistency, touch target ergonomics           │
│                         │                                              │
│                         ▼                                              │
│  [ Phase 9: Mobile, Accessibility & Performance Verification ]         │
│    - Full test suite, production build validation, regression signoff  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Acceptance Criteria & Regression Safeguards

### 6.1 Strict Regression Safeguards
1. **Club & Membership:** Zero modifications to `/club`, `/club/drops`, `/membership/founding`, or Razorpay payment initiation.
2. **Order API & Tracking:** All checkout operations must post to `/api/orders` with valid token generation and receipt emails.
3. **No Fabricated Data:** Fabric weights, compositions, sizing charts, and product reviews remain strictly derived from real data.
4. **Git Safety:** Zero commits, zero pushes, zero remote deployments without explicit user signoff.

### 6.2 Acceptance Checklist for Implementation
- [ ] Production build (`npm --prefix frontend run build`) compiles with exit code 0 after each phase.
- [ ] `BUY NOW` on PDP navigates immediately to `/cart` with item added.
- [ ] Clicking any search result in `SearchOverlay` closes the overlay instantly.
- [ ] Dense View uses sharp, luxury brutalist borders matching brand aesthetic.
- [ ] MegaMenu `CATEGORIES` section links to real catalog discovery.
- [ ] Mobile navigation and cart drawers operate smoothly without horizontal overflow.
- [ ] All touch targets meet 44x44px minimum touch ergonomics.

