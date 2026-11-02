# NEXAPOS — FULL INFINITE EXPERIENCE
## Master Visual & Implementation Blueprint

**Status:** Locked by user · **Version:** 1.0 · **Branch:** `nexapos/consolidated-pr-22` · **Review path:** PR #22 only.

## 1. Direction
**Brand:** NEXAPOS INFINITE  
**Tagline:** Beyond the Interface.  
**Philosophy:** Spatial Digital Architecture.  
**Character:** highly experimental, cinematic, futuristic, and professional.

This is a complete visual-system replacement, not a homepage-only refresh, a recolor of the old dashboard, or an isolated 3D hero.

## 2. Scope
The visual system applies to the public homepage and pricing; login, invitation activation and PIN verification; all tenant dashboards and operational modules; POS catalog, cart, checkout, payment and receipts; products, categories, inventory, transactions, reports, cashier sessions, attendance, team, permissions, queue, self-order, settings and support; Super Admin and Admin NexaPos; NexaSpace; Single Workspace; shared navigation, tables, cards, forms, dialogs, drawers, notifications, loading, empty and error states; desktop, laptop, tablet and mobile.

## 3. Visual identity
| Token | Hex | Role |
|---|---|---|
| Obsidian Navy | #071522 | Primary dark environment |
| Deep Space | #0B2031 | Secondary dark surface |
| Spatial Blue | #102B42 | Structural panels |
| Electric Teal | #19B9A5 | Primary interaction accent |
| Teal Light | #50E0CB | Active and highlight |
| Titanium | #7593A6 | Technical metadata |
| Polar White | #FFFFFF | Readable content surface |
| Mist | #E9EFF3 | Soft surfaces and separators |

The official logo remains authoritative; reconcile final color tokens against the actual logo before release. Portal frames, stepped geometry, metallic details, layered translucent surfaces and high-contrast content panels form the signature language. Avoid uniform card grids, excessive glow, decorative 3D on every component, and low-contrast text.

## 4. Motion language
- Portal Reveal: page and experience entrance.
- Infinite Shift: contextual transitions.
- Spatial Depth: layered surfaces.
- Light Sweep: selected highlights.
- Magnetic Response: pointer-aware marketing controls.
- Geometric Morph: selected panel transitions.
- Data Pulse: restrained live-data feedback.
- Kinetic Typography: marketing storytelling.
- Precision Feedback: immediate operational feedback.

Suggested durations: micro-interaction 100–180 ms; component transition 180–300 ms; page transition 250–450 ms. Motion must never block controls. Respect reduced-motion, touch interaction and WebGL fallback.

## 5. Experience rules
**Homepage:** cinematic portal hero, connected-workflow showcase, workspace model explanation, operational capabilities, pricing/activation sourced from existing data, promotion/voucher information, FAQ, WhatsApp/Telegram contact and final CTA. Never invent prices, quotas, durations or promotions.

**Authentication:** focused access panel and clear form states. Preserve Supabase Auth and invitation activation.

**Workspace:** deep-space framing, high-contrast navigation, readable content surfaces and contextual data panels.

**POS:** Product Space, Transaction Space and Payment Space must remain immediately understandable. Preserve product selection, cart edits, quantity, discounts, payment, idempotent checkout, stock decrement, cashier identity, receipts and queue behavior.

**Administration:** Super Admin and Admin NexaPos retain their permissions. NexaSpace remains the Owner's organization control center. Single Workspace remains independent.

## 6. Responsive and accessibility
Mobile is an operational layout, not a shrunken desktop page. Prevent page-level horizontal overflow; make tables deliberately responsive; keep touch targets comfortable; preserve keyboard focus and semantic status feedback; honor `prefers-reduced-motion`; provide graceful fallback if WebGL or pointer tracking is unavailable.

## 7. Performance
Load 3D progressively at restrained pixel ratios; pause decorative animation in hidden tabs; keep 3D off checkout-critical paths; optimize images/fonts and code splitting; avoid layout-shifting animation. Measure LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 on representative devices. These are targets, not assumed results.

## 8. Technical and data boundaries
Continue exclusively in PR #22. Preserve the existing React/Vite architecture unless an audit proves otherwise. Preserve the existing Supabase POS production project, authentication, RLS, tenant isolation, realtime, activation, checkout, queue, reporting and role permissions. No migration is justified solely by a visual redesign. Any required migration must be reviewed against production history and explicitly approved. Do not reset production data, merge to main or deploy the public domain without explicit approval.

## 9. Required release validation
1. Production build and CI.
2. Route/render smoke tests for all page families.
3. Desktop, tablet and mobile visual review.
4. Authentication and role routing.
5. Tenant isolation and RLS regression.
6. Activation, expiry, quota and package visibility.
7. Multi-cashier checkout, stock decrement, cashier identity and receipt.
8. Queue enabled/disabled behavior.
9. Realtime and manual refresh.
10. Reduced-motion, WebGL fallback, keyboard and touch.
11. Preview review and explicit approval before production.

## 10. Definition of done
Every page family and shared component uses the INFINITE visual language; responsive states pass review; existing business flows pass regression testing; preview is verified; and production is not released without approval.
