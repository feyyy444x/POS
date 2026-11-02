# NEXAPOS — NEXA / ARCHITECTURE DESIGN BLUEPRINT

Status: approved direction; implementation in progress  
Workstream: existing PR #22, branch `nexapos/consolidated-pr-22`  
Design DNA: Digital Architecture × Nexa Control × Kinetic Dimension

## Non-negotiable design rules
- Rebuild page structures and composition; do not treat the work as a CSS facelift.
- Do not reuse the previous page template or generic AI/SaaS dashboard/login templates.
- Login and access portal are a single full-canvas experience, never split-screen.
- Preserve the NexaPos identity palette: Navy, Teal, White, and Light Gray. No purple, pink, neon-blue, or rainbow gradients.
- Give each page and module a layout suited to its task; shared design tokens do not mean identical page templates.
- Immersive motion is selective, performant, accessible, and respects reduced-motion preferences.
- Desktop, tablet, and mobile are separately composed responsive experiences.

## Product truth is the source of all copy
Text, labels, navigation, feature descriptions, package descriptions, help text, FAQ, status messages, and CTAs must be checked against the implemented application, database configuration, and current master specification. Never claim a feature is available merely because it is planned.

Current verified product rules from the repository master specification:
- NexaSpace is the Owner control center for multi-tenant organizations.
- Single Workspace is a separate model: Owner enters one independent POS workspace, without NexaSpace or parent-organization tenant management.
- Platform roles are Super Admin and Admin NexaPos; no Customer Service platform role.
- Tenant-facing roles are Owner, Manager, and Karyawan.
- Public standard activation durations are Harian 3 days, Mingguan 7 days, Bulanan 30 days, Tahunan 365 days. Custom duration is Admin-only and must not appear as a public duration option.
- Public regular packages are Starter, Growth, Business, and Enterprise, with quota/pricing sourced from active database configuration.
- Paket Khusus is a consultation offer; do not show public price or tenant quota. Admin sets the requested duration/quota during activation.
- Single Workspace package is currently marked inactive in production configuration; do not show it as a purchasable public offer until Admin activates it and its prices are approved.
- Promotions, voucher eligibility, and final quotes are sourced from backend rules; no static invented discounts.
- Queue is operational only: queue number, customer name, and counter/cashier/loket. No media, video, playlist, or TV-template features.
- Self-service ordering exists in the application and requires its own customer ordering experience.
- NexaBot is the support bot name; its scope is NexaPos. Handoff is to Admin NexaPos. Public homepage support channels are WhatsApp and Telegram according to live configuration; no guest live chat.
- Product, stock, transactions, reports, team permissions, shifts/operational activity, self-order, audit, and realtime claims must match their actual role permissions and backend state.
- Password minimum is 6 characters where password creation is required.

## Page-family blueprint
1. Public homepage — immersive editorial/architectural narrative; dynamic package, duration, promo, FAQ and support information must remain data-backed.
2. Authentication — original single-canvas Access Portal; login and invitation activation retain existing authentication behavior. PIN setup/verification uses the same visual family without split composition.
3. Platform Command Center — Super Admin and Admin NexaPos; operational controls, activation, packages, duration, promotions, organizations, staff, support, audit and system configuration.
4. NexaSpace — organization overview, tenant directory/detail, quota, team/access, monitoring, combined reports, activation, organization settings, audit.
5. Single Workspace — independent Owner workspace; never display NexaSpace/parent-tenant management.
6. Tenant Manager — workspace overview, catalog, categories, inventory, transactions, POS, reports, team, permission matrix, cashier activity, queue, self-order, settings.
7. Tenant Karyawan — role-limited operational surfaces only; do not imply Owner/Manager permissions.
8. POS Transaction Studio — fast catalog, cart, payment and receipt flow; prioritize reliability and cashier throughput over decorative motion.
9. Self-order customer flow — public catalog, order composition, order status/payment steps supported by actual backend.
10. Shared states — loading, empty, error, offline/realtime status, permission denied, expired/suspended, confirmation, success and not-found states.

## Copy and content audit matrix
For every page, inventory and verify:
- Page title, subtitle, eyebrow, helper text and breadcrumb.
- Navigation label and destination.
- Every CTA/button label and actual action.
- Form labels, placeholder, validation, success and error text.
- Empty/loading/error/permission/expired states.
- FAQ question and answer.
- Feature claims and role-specific availability.
- Pricing, quota, duration, promotion and contact destinations.
- Accessibility labels, responsive truncation and localization.

## Acceptance criteria
- No split-screen login/access page.
- No old page layout retained as the base for a cosmetic restyle.
- No invented, stale, contradictory, or hardcoded public business configuration where database configuration is authoritative.
- Every visible action points to its actual purpose and is permission-checked by the existing backend.
- No database migration or production configuration mutation is performed as part of visual redesign without separate review and explicit approval.
- All routes, roles, device sizes, and UI states are visually and functionally tested.
- Work remains on PR #22; do not merge or deploy production without explicit approval.
