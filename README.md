# NexaPos

NexaPos is a responsive point-of-sale, inventory, and real-time queue management web app built with React, Vite, and Supabase.

## Included modules
- Supabase email/password authentication with invitation-based tenant membership; public sign-up alone does not create a store or grant an Owner role
- Super Admin tenant registration and activation; store owners invite Admin/Cashier accounts with one-time activation codes
- Four-digit PIN setup and verification, profile updates, and account recovery controls
- Product catalog with create, edit, delete, categories, SKU/barcode, price, and stock
- POS cart, server-validated checkout, stock decrement, cash/QRIS/transfer selection, and receipt number
- 80mm thermal receipt print layout with optional store logo (PNG/JPEG/WebP, max 3 MB) using the browser print dialog
- Real-time queue ticket creation, call/serve/complete/skip actions, and TV display
- Sales history and CSV export
- Store settings and role-based manager controls

## Local setup
1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Run `npm install`, then `npm run dev`.
4. Build with `npm run build`.

## Deployment
Netlify uses `npm run build` and publishes `dist`. SPA routing is configured in `netlify.toml`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Netlify's build environment for every deployment context that should connect to Supabase. Vite embeds these values during build, so changing them requires a fresh deploy. The `netlify/functions/` directory must be included in the deployed artifact for server-side invitation activation and Super Admin password management. Set `SUPABASE_URL` and a secret `SUPABASE_SERVICE_ROLE_KEY` in the Deploy Preview context for those functions; never expose the service-role key through a `VITE_` variable. For pull-request testing, ensure the Vite variables are set in the **Deploy Preview** context and redeploy that preview; changing variables does not update an already-published preview automatically.

## Notes
- All exposed application tables have Row Level Security policies.
- Checkout is processed by a database RPC that validates membership, product activity, stock, and payment amount before creating the order and queue ticket.
- Queue TV view: append `?screen=queue` to the app URL. Sign in with a store account on the TV browser.
- Thermal printing uses the browser print dialog; some Bluetooth printers require their vendor driver or companion app.
- Work is currently in `feature/nexapos-foundation`; production has not been published from this branch.
