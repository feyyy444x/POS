# acoPos

acoPos is a responsive point-of-sale and business-operations platform built with React, Vite, and Supabase. It includes multi-tenant management, a company control center, POS checkout, inventory, reports, Self Order, queue management, and Joeclyn support.

## Included modules
- Super Admin activation and account management
- **acoPos Control Center** for company-level management, plus tenant management
- Single Workspace registration and conversion to a company subscription
- Role-based Owner, Manager, and Karyawan access with PIN verification
- Product catalog, stock, categories, SKU/barcode, and pricing
- POS cart and server-validated checkout with transaction identity
- 80mm thermal receipt printing
- Queue tickets and TV display
- Sales history, reports, and CSV export
- Self Order with payment-proof review and cashier shift validation
- Company/tenant lifecycle, audit log, and realtime synchronization
- Joeclyn support chat and WhatsApp/Telegram support links

## Local setup
1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the browser client.
3. Set `VITE_TELEGRAM_SUPPORT_USERNAME` to the support team's Telegram username without the @ sign.
4. Run `npm install`, then `npm run dev`.
5. Build with `npm run build`.

## Vercel deployment
- Framework: Vite
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`
- Vercel serves the API adapters in `api/`. The adapters preserve the existing backend handlers in `netlify/functions/` and the `vercel.json` rewrite preserves their existing browser URLs.
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to Preview and Development for frontend access.
- Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` for server-side authentication helpers.
- The backend functions that create/complete registrations, activate invitations, and manage passwords/staff also require `SUPABASE_SERVICE_ROLE_KEY`. Add it as an **Encrypted** environment variable in Vercel; never prefix it with `VITE_`, expose it to the browser, or commit it to Git.
- Add `VITE_TELEGRAM_SUPPORT_USERNAME` only when the support username is confirmed.
- Do not place the production service-role key in Preview. Preview currently points to the production Supabase project; until an isolated staging project is configured, keep privileged backend operations disabled in Preview or use a separate non-production credential scope.

## Database and data safety
- The existing Supabase production project is the source of truth. Do not create a new database or apply migrations to the test project.
- Existing migrations are retained as historical records. Do not rename or rewrite applied migration files.
- All exposed application tables have Row Level Security enabled.
- Checkout and operational actions are validated by database RPCs; suspended companies/tenants must remain read-only.
- Never use a service-role key in client-side variables.
- Queue TV view: append `?screen=queue` to the app URL.
- Thermal printing uses the browser print dialog; some Bluetooth printers require their vendor driver or companion app.

## Validation
Run `npm run build` and the repository's Node test suite before approving a production release. Production deployment and custom-domain cutover require a separate release approval.
