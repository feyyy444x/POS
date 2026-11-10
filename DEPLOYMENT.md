# acoPos — Vercel deployment checklist

## Project
- Vercel project: `acopos`
- Framework: Vite
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`
- Functions region: Singapore (`sin1`)
- Production deployment: not authorized by this setup task; use Preview until separately approved.

## Frontend environment variables
Set in Vercel Project Settings → Environment Variables:
- `VITE_SUPABASE_URL` — Supabase production API URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — publishable/anon client key

## Server-side environment variables
- `SUPABASE_URL` — same project API URL
- `SUPABASE_ANON_KEY` — publishable/anon key used to validate caller sessions
- `SUPABASE_SERVICE_ROLE_KEY` — encrypted server-only key required by registration, invitation activation, staff management, and password-management functions. Never expose it with a `VITE_` prefix and never commit it.
- `VITE_TELEGRAM_SUPPORT_USERNAME` — optional confirmed support username.

The Preview environment currently targets the production Supabase project. Do **not** add the production `SUPABASE_SERVICE_ROLE_KEY` to Preview. Registration completion, invitation activation, staff creation, and password reset routes will return a configuration error until a safe server-side key is supplied. Use an isolated staging database for end-to-end tests of privileged functions.

## API routing
- Existing frontend calls to `/.netlify/functions/<name>` are preserved by `vercel.json`.
- Vercel Node handlers under `api/` adapt the existing Netlify-compatible backend handlers.
- Do not delete the original handler implementations until all Vercel routes have been validated.

## Data and release safeguards
- Use the existing Supabase production project as the data source; do not apply the production migration set to the test project.
- Check applied migrations against `supabase/migrations/` before any database change.
- Validate RLS, tenant isolation, read-only suspension, audit logging, realtime, registration, Self Order, and Owner/tenant status consistency.
- Do not run destructive data migrations or production deployment as part of preview setup.
- Only attach the live custom domain after preview acceptance and separate release approval.
