# NEXAPOS — DIGITAL UNIVERSE
## Master Design Blueprint: Full-Site 3D / WebGL Experience
**Status:** Design specification — implementation must follow this document  
**Target branch:** `nexapos/consolidated-pr-22`  
**Scope:** Entire NexaPos public website, authentication, platform administration, NexaSpace, Owner experiences, every tenant workspace, Self Order, support and every shared UI component.

---

## 1. Design decision and non-negotiable direction

NexaPos adopts a **dominant 3D / WebGL visual language** inspired by the immersive interaction principles of Bruno Simon and Active Theory. This is a full product-wide design direction, not a homepage-only hero effect, a collection of decorative CSS animations, or a conventional dashboard with a 3D background.

The experience must feel spatial, responsive and alive from the first page load through the smallest interaction. Every page and component receives a deliberate motion and depth treatment. Each page must retain its own information architecture and visual personality; a single dashboard template must not be repeated across unrelated modules.

### Brand constraints
- Primary: NexaPos Navy `#102D50`, deep Navy `#07182C`.
- Accent: NexaPos Teal `#08B996`, deep Teal `#087E69`.
- Supporting: white, cool light grey, restrained neutral metallic/glass surfaces.
- No purple, pink, violet, or unrelated blue/pink gradients.
- Lighting, glow, reflections and particle colors must remain within the Navy/Teal/white/neutral brand palette.
- Preserve the existing NexaPos logo and tenant-specific logo behavior.

### Product constraints
- Preserve current business rules, permissions, role routing, tenant isolation, pricing, activation, checkout, stock, receipts, reports, Self Order and support behavior.
- This is a visual/interaction redesign. Do not change database schema, execute migrations, reset data, or alter production records as part of visual work.
- Keep existing PR #22 and branch `nexapos/consolidated-pr-22`; do not create a new PR.
- Do not merge or deploy to the public domain without the appropriate review and explicit approval.

---

## 2. Experience principles

1. **Spatial by default:** pages have depth, foreground/midground/background, lighting, parallax and layered surfaces.
2. **Motion has meaning:** motion communicates hierarchy, cause/effect, progress, state and navigation. Avoid random perpetual movement.
3. **Page-specific worlds:** every major page family gets a different scene grammar and composition.
4. **Small interactions matter:** buttons, icon buttons, toggles, tabs, menu items, table rows, inputs, chips, badges, pagination, tooltips, dialogs, toasts, charts and empty states all have a designed response.
5. **Content remains legible:** 3D never compromises text contrast, form usability, table scanning, keyboard navigation or touch targets.
6. **Operational speed first:** POS checkout, barcode/search entry, payment and receipt flows must remain immediate. No blocking scene transition may delay a business action.
7. **Progressive enhancement:** WebGL is an enhancement layer. Semantic DOM remains the source of truth and a usable fallback.
8. **Responsive, not merely scaled:** desktop, tablet and mobile receive different scene density, camera framing and interaction patterns.
9. **Respect reduced motion:** honor `prefers-reduced-motion` and provide a low-motion experience without hiding information or functionality.
10. **Consistent system, distinct expression:** common tokens and interaction physics unify the product; page compositions remain intentionally different.

---

## 3. Whole-product page inventory and visual direction

### A. Public and access experiences

| Area | Unique visual composition | 3D / motion direction |
|---|---|---|
| Homepage | Cinematic product-story environment, editorial typography and staged feature sections | Hero world/abstract commerce structure, camera travel on scroll, floating system objects, kinetic type, feature objects that react to pointer |
| Pricing and activation choices | Focused pricing stage, not a generic card grid | Plan objects/surfaces rise from a shared spatial plane; duration selection animates state and price changes; comparison remains readable |
| Promo/voucher content | Promotional spotlight | Controlled reveal, depth and light sweep; no flashing or distracting countdown effects |
| Demo | Interactive product walkthrough | Guided camera/scene transitions between real product capabilities; demo data only, no production writes |
| Login | Single-canvas access portal, not split-screen | Portal aperture / layered security rings, restrained depth, focus-following light; form remains semantic DOM |
| Invitation activation | Same access world, distinct state | Code verification steps represented as progressive spatial stages; clear error/success states |
| Public Self Order | Customer-first ordering environment | Product presentation, category transitions, cart additions and order progress have tactile motion; fast on mobile |
| Public queue display | Purpose-built live display | Large, readable queue number and counter/cashier information; subtle 3D frame and arrival/call transition; no removed TV/media feature is reintroduced |

### B. Platform administration

| Area | Unique visual composition | 3D / motion direction |
|---|---|---|
| Super Admin dashboard | Platform command observatory | Spatial system map, tenant/service activity nodes, live metric instruments and camera focus transitions |
| Admin NexaPos dashboard | Same capability parity as Super Admin, distinct admin identity label | Same command language and permissions, not a different reduced template |
| Tenant/workspace directory | Spatial registry / orbital index | Tenant entries behave as layered registry tiles; filters morph the visible set without disorienting |
| Tenant control center | Focused tenant inspection chamber | Tenant status, activation, usage and controls grouped into depth layers; dangerous actions stay deliberate |
| Organization management | Relationship map | Organization-to-tenant relationships visualized as connected nodes, with an accessible list/table alternative |
| Activation and duration settings | Configuration instrument panel | Duration values and package quotas animate as editable controls; clear before/after preview |
| Packages, prices and promotions | Commercial configuration studio | Price/duration transitions, promotion preview and package quota visualization |
| Platform staff and access | Identity/security registry | Role, permission and account states have distinct visual feedback; no decorative ambiguity |
| Platform audit | Event timeline / forensic ledger | Timeline depth, event focus, filters and detail expansion; data remains searchable and export/readable |

### C. NexaSpace and Owner

| Area | Unique visual composition | 3D / motion direction |
|---|---|---|
| NexaSpace home | Organization command space | Company identity at center, tenant nodes around it, live operational indicators and deliberate camera focus |
| Organization profile/settings | Identity studio | Logo/name/details edit states transition in place; saved state is explicit |
| Tenant list | Tenant constellation / directory | Each tenant has a distinct spatial tile; status, expiry, quota and workspace access remain immediately visible |
| Create/manage tenant | Tenant provisioning sequence | Guided steps with clear progress, validation and quota feedback |
| Tenant switching | Workspace portal transition | Short transition identifying the destination tenant; never obscure or delay access |
| Team and permissions | People/access map | Employee cards and role changes have controlled motion; permissions remain plain-language and explicit |
| Organization reports | Multi-tenant analytics environment | Tenant comparison, aggregated metrics and drill-down focus; chart motion must not misrepresent values |
| Organization operations/monitoring | Operations wall | Live activity, cashier state and alert prioritization; reduced motion mode retains status clarity |
| Organization audit | Organization event timeline | Scoped events, actor, tenant and timestamp clearly traceable |

### D. Single Workspace and tenant workspace

Single Workspace remains a separate product model: Owner enters one independent workspace without NexaSpace or tenant management. Its visual treatment may share the workspace design language but must not introduce organization/tenant concepts that do not apply.

| Area | Unique visual composition | 3D / motion direction |
|---|---|---|
| Workspace home/dashboard | Operational overview / spatial workbench | Metric panels, activity stream and shortcuts have distinct depth hierarchy; no generic template reused everywhere |
| POS / checkout | High-speed transaction cockpit | Product catalogue and cart use a clear two-zone spatial composition; add-to-cart, quantity, discount, payment and success feedback are tactile and brief |
| Product catalogue | Product gallery / inventory index | Product tiles use controlled depth and image hover/tilt; grid/list modes transition cleanly |
| Inventory | Stock-control ledger | Stock levels, low-stock alerts and adjustments have readable state transitions; tables remain efficient |
| Queue | Live service stage | Queue status and active tickets are prominent; name, number, counter/cashier/loket remain primary; do not add TV media/video templates |
| Sales reports | Analytical workbench | Filters, metrics, chart reveal, date-range selection and detail drill-down; no false 3D perspective that distorts comparisons |
| Cost / COGS details | Financial inspection panel | Expandable cost and margin detail with careful number hierarchy |
| Cashier session/open-close | Cash control station | Session state, opening/closing cash and confirmation have distinct state transitions |
| Attendance/breaks | Timeline and presence board | Active/break/ended states animate clearly; no gamified or distracting motion |
| Team/access | People directory | Member profile, role, activation, PIN/password reset and delete actions each have unique action feedback |
| Store settings | Configuration studio | Grouped settings panels, preview states, save confirmation and logo handling |
| Receipt preview/print | Print-focused preview surface | Paper/receipt reveal and print confirmation; printing must use existing browser/thermal flow |
| Self Order management | Ordering control studio | QR, catalog, ordering status and configuration represented with interactive spatial previews |
| Support/NexaBot | Support workspace | Conversation timeline, typing indicator, message delivery and admin handoff; motion must not impede reading |
| Notifications/alerts | Contextual alert layer | Priority-based entrance and dismissal; critical alerts accessible and persistent until acknowledged |
| Empty/loading/error states | Purpose-built state scenes | Small branded motion, skeletons and clear recovery actions; never use an infinite blocking 3D loader |

### E. Shared and responsive shells
- Platform shell, NexaSpace shell, Owner shell, Single Workspace shell and tenant shell must not be collapsed into one generic shell.
- Each shell receives a distinct navigation composition and transition behavior.
- Mobile navigation uses a compact, touch-first layout; no desktop hover-only actions.
- Back navigation and route state must continue to work exactly as current product logic requires.

---

## 4. Component-level motion and depth specification

This section applies to every instance across the website, including shared components and module-specific components.

| Component | Default visual treatment | Interaction / state motion |
|---|---|---|
| Primary button | Layered Navy/Teal surface, subtle bevel/highlight | Pointer light, 1–2px press depth, brief release; loading replaces label without layout jump |
| Secondary button | Raised neutral surface with Navy border | Small lift and border/light response |
| Destructive button | Restrained danger treatment, visually distinct | No playful bounce; confirmation stage and deliberate press feedback |
| Icon button | Compact raised control with clear hit area | Icon micro-motion, tooltip reveal, focus ring |
| Sidebar/nav item | Layered navigation rail | Active marker glides; hover/focus shifts depth; mobile tap state |
| Tabs/segmented control | Connected spatial selector | Active indicator slides; content transition is brief and non-blocking |
| Dropdown/select | Floating depth layer | Origin-aware opening, option focus and selected-state confirmation |
| Input/textarea | Inset field with clear focus plane | Focus ring/light, validation feedback, label/help transition |
| Checkbox/switch/radio | Physical toggle/selector metaphor | Knob/mark movement and clear checked state; keyboard support |
| Card/panel | Layered surface with edge light and shadow | Restrained hover parallax/tilt; no layout jitter |
| Table/list row | Flat readable data plane with depth on focus | Row highlight, selected state and detail expansion; never tilt whole dense tables |
| Badge/status chip | Compact status surface | State transition with icon/text change; color is not the only signal |
| Chart/metric | Instrument-like data surface | Draw/reveal on entry; changes animate from prior value without implying false data |
| Modal/dialog | Spatial overlay and focus plane | Scale/translate from trigger; backdrop scene dims; focus trap and Escape behavior |
| Drawer/sheet | Layered side/bottom plane | Directional slide and inert background |
| Tooltip/popover | Small floating plane | Short fade/translate, correct anchor and collision handling |
| Toast/notification | Floating status surface | Enter/exit with status icon; announce through accessible live region |
| Pagination | Discrete navigation controls | Active page indicator glides; preserve list context |
| Search/filter | Focused command surface | Filter chips enter/leave; no unnecessary animation on each keystroke |
| Product tile | Product object/surface | Gentle pointer tilt, image/object focus and brief add-to-cart response |
| Cart line item | Transaction row | Quantity and removal feedback; totals update immediately |
| Loading skeleton | Low-contrast moving light band | Reduced motion uses static skeleton |
| Empty state | Small illustrative scene or geometric object | One short entrance, clear CTA |
| Error state | Stable warning surface | Subtle attention cue once; never shake repeatedly |
| Success state | Confirmation surface | Short completion pulse/checkmark; no confetti that slows checkout |
| Cursor | Optional desktop-only branded cursor aura | Never replace native cursor in text selection, accessibility or critical controls |
| Scroll indicator | Thin progress/section indicator | Smooth position update; no scroll hijacking |
| Breadcrumb/back | Clear navigation affordance | Directional transition while preserving browser history |

### Smallest-component rule
Every interactive component must define:
- rest, hover, focus-visible, pressed, selected/active, disabled, loading, success and error states where relevant;
- touch equivalent for hover;
- keyboard behavior and visible focus;
- reduced-motion behavior;
- a motion duration and easing token;
- no color-only status communication.

Decorative 3D must never intercept pointer or keyboard input intended for actual controls.

---

## 5. 3D scene and motion architecture

### Recommended implementation layers
1. **Semantic application layer (React DOM):** all text, inputs, buttons, tables, charts with accessible labels, navigation, forms, business logic and state remain real DOM components.
2. **3D scene layer (Three.js / React Three Fiber):** backgrounds, spatial environments, hero objects, scene transitions and selected visual objects.
3. **Motion orchestration layer (GSAP where appropriate):** timelines, scroll choreography, camera transitions and coordinated sequences.
4. **Component motion layer (CSS transforms / WAAPI / small React transitions):** frequent button, field, card, tab and feedback interactions.
5. **Data visualization layer:** accessible charts with accurate values; optional depth treatment must not distort axes or comparisons.

### Technology choices
- Evaluate `three` and `@react-three/fiber` as the core 3D renderer for the existing React application.
- Use `@react-three/drei` only for helpers that are actually needed.
- Use GSAP for complex, coordinated timelines and scroll scenes; do not introduce it for every simple hover.
- Use CSS transforms/transitions or Web Animations API for high-frequency micro-interactions.
- WebGPU may be explored as an optional future enhancement; WebGL remains the dependable baseline.
- Do not add a physics engine by default. Add Rapier only if a validated interaction genuinely needs physical simulation.
- Verify current React 19 compatibility, package versions, bundle impact, license, browser support and build behavior before adding dependencies.
- Do not add a dependency merely because it is fashionable.

### Scene ownership
- A global scene host may provide shared renderer lifecycle, performance monitoring and transition coordination.
- Each page family owns its scene composition and camera choreography.
- Route transitions must dispose of scene resources and event handlers correctly.
- Lazy-load heavy 3D page chunks. Public visitors and cashiers must not download every admin/3D scene at first load.
- Avoid mounting multiple full-screen WebGL canvases at once. Prefer one managed scene host or isolated canvases only when architecture proves it necessary.
- Text, controls and data should not be rendered as textures in a canvas.

### Asset strategy
- Prefer original lightweight procedural geometry, instanced meshes and compressed glTF assets.
- Use KTX2/Basis textures and Draco/meshopt compression where useful and supported by the chosen pipeline.
- Avoid large stock 3D assets, heavy video textures and unnecessarily detailed models.
- Keep branded models consistent with Navy/Teal identity and avoid copying another studio's proprietary assets.

---

## 6. Responsive and performance behavior

3D is dominant in the design language, but rendering intensity must adapt to device capability and user preference.

### Desktop — full experience
- Full scene depth, camera choreography, pointer response, high-quality lighting and selected post-processing.
- Fine pointer interactions only where appropriate.
- Maintain stable layout and avoid pointer-driven motion that makes reading difficult.

### Tablet — balanced experience
- Simplify geometry, particle count, shadow quality and post-processing.
- Replace hover-only interactions with tap/focus states.
- Reframe scenes for portrait and landscape layouts.
- Keep workspace navigation and transaction controls touch-first.

### Mobile — adaptive 3D experience
- Retain a visible 3D identity on every major page, but use lighter scenes, fewer particles, simpler materials and shorter transitions.
- No hover dependency; use tap, press and scroll.
- Avoid large canvas areas that push essential controls below the fold.
- Keep POS search, catalogue, cart and checkout reachable and fast.
- Detect constrained devices and gracefully reduce scene quality.

### Performance budgets and release targets
These are targets to validate, not claims of current performance:
- Aim for 60fps on supported desktop devices; accept a stable lower frame target on constrained mobile rather than overheating or stuttering.
- Keep critical route content interactive before non-essential scene assets finish loading.
- Lazy-load scenes and models; use suspense/fallback states that do not block the application.
- Pause or reduce animation when a tab is hidden, a scene is offscreen or the device is under pressure.
- Limit draw calls, transparent overdraw, shadow maps, particle count and post-processing passes.
- Avoid forced synchronous layout and per-frame React state updates.
- Use instancing for repeated geometry and reuse materials/textures.
- Test cold load, route changes, prolonged sessions, memory use, thermal behavior and low-end mobile.
- Measure bundle size and WebGL memory as part of review.

### Graceful fallback
- If WebGL is unavailable, context is lost, or rendering fails, the page remains fully usable with a static branded depth composition and DOM interactions.
- Provide context-loss recovery without losing user-entered form data or POS cart state.
- Reduced-motion mode removes camera travel, parallax, pointer tilt, looping particles and long transitions while preserving all content and action feedback.

---

## 7. Accessibility, usability and operational safety

- Preserve semantic HTML and accessible names.
- All actions work by keyboard and touch.
- Focus must remain visible above visual effects.
- Modal focus trapping, Escape handling, screen-reader announcements and form validation remain correct.
- Do not use animation alone to communicate an error, success, selected state or status.
- Avoid flashing, rapid luminance changes, motion that follows the pointer too aggressively and continuous movement behind dense text.
- Respect `prefers-reduced-motion`; offer a user-accessible motion setting if product architecture supports it.
- Do not hijack scrolling.
- Do not animate critical payment/checkout confirmation in a way that delays completion.
- Cart totals, stock, payment state, queue state and saved settings must update from real application state—not animation timers or decorative mock data.
- 3D must not create a fake impression of live metrics, real-time status or saved state.
- Demo scenes must remain isolated from production data.

---

## 8. Motion tokens and interaction grammar

Initial token proposal; tune during visual prototyping.

| Token | Initial target | Usage |
|---|---:|---|
| `--motion-instant` | 100ms | Press/focus feedback |
| `--motion-fast` | 160ms | Buttons, icons, chips |
| `--motion-standard` | 240ms | Cards, menus, fields |
| `--motion-emphasis` | 420ms | Dialogs, panels, route accents |
| `--motion-scene` | 700–1100ms | Camera/page scene transitions |
| `--ease-standard` | cubic-bezier(.2,.7,.2,1) | Everyday interaction |
| `--ease-spatial` | cubic-bezier(.16,1,.3,1) | Spatial entrance/exit |
| `--depth-1` | subtle | Fields, chips, small controls |
| `--depth-2` | medium | Cards, panels, menus |
| `--depth-3` | strong | Dialogs, hero objects, scene focal points |

Motion must be interruptible and state-driven. Repeated interaction must not queue stale animations.

---

## 9. Design and implementation sequence

### Phase 0 — inventory and safety baseline
- Map every route, page component, shared component, role shell and current interaction.
- Identify duplicate/legacy CSS, current animation hooks and current app performance behavior.
- Record baseline build, route behavior and existing business-flow tests.
- Confirm current branch head and work only in PR #22.

### Phase 1 — visual prototypes
Build reviewable prototypes for:
1. Homepage cinematic 3D world.
2. Access portal.
3. Super Admin command environment.
4. NexaSpace organization environment.
5. Tenant POS workspace.
6. Inventory/reporting visual language.
7. Self Order experience.

These prototypes establish the shared renderer, lighting/material system, camera grammar, component interaction tokens and responsive quality profiles.

### Phase 2 — shared foundation
- Introduce the managed scene host and lifecycle.
- Implement page-specific scene registration and safe cleanup.
- Establish reusable spatial surface, depth, lighting, pointer and transition primitives.
- Implement reduced-motion, WebGL fallback, context-loss recovery and device quality profiles.
- Add component states and accessibility tests.

### Phase 3 — full page implementation
Implement each page from the page inventory above. Do not mark a page complete because a global background or CSS class has been added. Each page must have its own composition, motion behavior, content layout and functional review.

### Phase 4 — regression and visual QA
- Compare every route with the approved page blueprint.
- Test all actions and buttons, not only visual appearance.
- Test all roles, tenant switching and Single Workspace separation.
- Test checkout, cart, payments, stock, receipt print, queue on/off, attendance, reports, Self Order and support.
- Test desktop, tablet and mobile sizes.
- Test reduced motion, no-WebGL fallback, WebGL context loss and low-end devices.
- Verify no migrations, production writes or deployment occurred during visual-only work.

### Phase 5 — preview review and release gate
- Build and run all automated checks.
- Publish only the PR Deploy Preview through the existing PR workflow.
- Inspect actual rendered pages at representative desktop/tablet/mobile viewports.
- Record gaps and fix them in PR #22.
- Keep PR draft and public production untouched until review and explicit release approval.

---

## 10. Definition of done

The redesign is **not complete** until all are true:

- [ ] Every route/page in the inventory has an individual design composition.
- [ ] Every major page has a meaningful 3D/WebGL scene or 3D environment treatment.
- [ ] Every interactive component has deliberate motion/depth states, including focus, pressed, disabled and loading.
- [ ] No unrelated purple/pink/gradient theme appears.
- [ ] Homepage and login remain distinct experiences; login is not split-screen.
- [ ] NexaSpace, Single Workspace and tenant workspace remain visually and functionally distinct.
- [ ] No queue media/video or TV template is reintroduced.
- [ ] All text and data remain readable and accessible.
- [ ] Desktop, tablet and mobile have validated responsive compositions.
- [ ] Reduced-motion and WebGL fallback work.
- [ ] POS checkout and other operational flows remain fast and correct.
- [ ] All buttons and actions still perform their intended business operation.
- [ ] No business logic, permissions, database migrations or production records were changed unintentionally.
- [ ] Build, security smoke, preview smoke and applicable E2E tests pass.
- [ ] Real Deploy Preview has been visually inspected; no claim of completion is based on CSS changes alone.

**Completion rule:** A page is complete only after its real implementation, functional checks and responsive visual inspection are all recorded. A design token, global stylesheet, placeholder canvas or static screenshot does not satisfy this definition.

---

## 11. Explicit non-goals

- Do not copy Bruno Simon or Active Theory's websites, assets, source code, models or proprietary visual compositions. Use them as inspiration for interaction quality and spatial storytelling only.
- Do not turn all application controls into a WebGL canvas.
- Do not replace semantic forms, tables or accessible controls with 3D objects.
- Do not add decorative 3D that obscures information or increases checkout latency.
- Do not reintroduce removed queue media features.
- Do not use fake live data or write demo data to production.
- Do not merge, deploy publicly, reset data or run migrations as part of this design specification.

---

**Final direction:** NexaPos is a complete, brand-owned, interactive 3D commerce environment. The 3D language reaches every page and every component, while the underlying application remains fast, accessible, responsive and operationally reliable.
