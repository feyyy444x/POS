# acoPos

acoPos is a responsive point-of-sale, inventory, and real-time queue management platform built with React, Vite, and Supabase.

## Included modules
- Super Admin activation and tenant management
- Owner company control center and independent Single Workspace
- Product catalog, inventory, barcode/SKU, and stock controls
- Multi-cashier POS, server-validated checkout, payment records, and receipts
- Real-time queue management and cashier display
- Sales history, reports, and CSV export
- Self Order with QRIS proof submission and cashier approval
- Role-based staff management, PIN verification, and read-only suspended workspaces
- Audit logs, support center, and Joeclyn assistant

## Local setup
1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Set `VITE_TELEGRAM_SUPPORT_USERNAME` to the support team's Telegram username without the @ sign.
4. Run `npm install`, then `npm run dev`.
5. Build with `npm run build`.

## Vercel deployment
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Required Preview and Production build variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Server-only variables for privileged API routes: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
- Never expose `SUPABASE_SERVICE_ROLE_KEY` through a `VITE_` variable.
- The API adapters in `api/` preserve the existing server-side registration, invitation, staff, and password-management routes.
- Do not place the production service-role key in Preview when Preview is connected to the production database. Use a separate staging project for privileged Preview testing; configure the production service-role key only in the Production environment after explicit release approval.

## Data and security
- Application tables use Row Level Security.
- Checkout is processed through database RPC validation.
- Self Order approval requires an active cashier shift.
- Suspended/expired workspaces remain readable but block operational writes.
- Existing tenant, transaction, and audit data is preserved during branding changes.
- Queue TV view: append `?screen=queue` to the app URL.
- Thermal printing uses the browser print dialog.
