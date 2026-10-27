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
- Help Center with in-app live chat for customers and Super Admin replies, plus Telegram support link

## Local setup
1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Set `VITE_TELEGRAM_SUPPORT_USERNAME` to the support team's Telegram username without the @ sign (example: `nexapos_support`).
4. Run `npm install`, then `npm run dev`.
5. Build with `npm run build`.

## Help Center setup
1. Apply `supabase/migrations/20261027170000_support_center.sql` to the connected Supabase project (Supabase SQL Editor or your normal migration workflow). This creates the live-chat table, row-level security policies, indexes, and Realtime publication entry.
2. In Netlify, set `VITE_TELEGRAM_SUPPORT_USERNAME` to the real Telegram username of your support account. Do not include `@` or a `t.me/` prefix.
3. Trigger a new Deploy Preview build after setting environment variables. Vite embeds `VITE_*` values at build time.
4. Sign in as a normal tenant user, complete PIN verification, and open **Pusat bantuan → Live chat** to send a message. A Super Admin can open the Help Center inbox and reply to user conversations. Telegram opens the configured support account in a new tab.
5. The Telegram option remains disabled until a username is configured, preventing users from being sent to an incorrect account.

## Deployment
Netlify uses `npm run build` and publishes `dist`. SPA routing is configured in `netlify.toml`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Netlify's build environment for every deployment context that should connect to Supabase. Vite embeds these values during build, so changing them requires a fresh deploy. The `netlify/functions/` directory must be included in the deployed artifact for server-side invitation activation and Super Admin password management. Set `SUPABASE_URL` and a secret `SUPABASE_SERVICE_ROLE_KEY` in the Deploy Preview context for those functions; never expose the service-role key through a `VITE_` variable. For pull-request testing, ensure the Vite variables are set in the **Deploy Preview** context and redeploy that preview; changing variables does not update an already-published preview automatically.

## Notes
- All exposed application tables have Row Level Security policies.
- Checkout is processed by a database RPC that validates membership, product activity, stock, and payment amount before creating the order and queue ticket.
- Queue TV view: append `?screen=queue` to the app URL. Sign in with a store account on the TV browser.
- Thermal printing uses the browser print dialog; some Bluetooth printers require their vendor driver or companion app.
- Work is currently in `feature/nexapos-foundation`; production has not been published from this branch.
