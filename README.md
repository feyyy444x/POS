# NexaPos

NexaPos is a responsive point-of-sale, inventory, and real-time queue management web app built with React, Vite, and Supabase.

## Included modules
- Supabase email/password authentication; first registered user owns their new store
- Product catalog with create, edit, delete, categories, SKU/barcode, price, and stock
- POS cart, server-validated checkout, stock decrement, cash/QRIS/transfer selection, and receipt number
- 80mm thermal receipt print layout using the browser print dialog
- Real-time queue ticket creation, call/serve/complete/skip actions, and TV display
- Sales history and CSV export
- Store settings and role-based manager controls

## Local setup
1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Run `npm install`, then `npm run dev`.
4. Build with `npm run build`.

## Deployment
Netlify uses `npm run build` and publishes `dist`. SPA routing is configured in `netlify.toml`. Set the two Vite environment variables in Netlify for each deployment context.

## Notes
- All exposed application tables have Row Level Security policies.
- Checkout is processed by a database RPC that validates membership, product activity, stock, and payment amount before creating the order and queue ticket.
- Queue TV view: append `?screen=queue` to the app URL. Sign in with a store account on the TV browser.
- Thermal printing uses the browser print dialog; some Bluetooth printers require their vendor driver or companion app.
- Work is currently in `feature/nexapos-foundation`; production has not been published from this branch.
