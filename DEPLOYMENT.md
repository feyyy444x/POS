# acoPos — Vercel deployment checklist

## Project
- Vercel project: `acopos`
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 22.x
- Serverless Function region: Singapore (`sin1`)

## Public build environment
Set these for Preview and Production:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Server-only API environment
Set only in the appropriate environment:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Never prefix the service-role key with `VITE_` or expose it to browser code. The production service-role key must not be added to Preview while Preview points at the production database. For privileged Preview testing, connect an isolated staging Supabase project and its matching server-side credentials.

## Routes
- Vercel serverless API entry points are in `api/`.
- Existing request handlers are adapted through `lib/vercel-netlify-adapter.js`.
- SPA routes are served by Vercel's Vite output and application router.

## Release safety
- Test Preview before any Production release.
- Do not apply new production migrations from an unreviewed Preview build.
- Deploy the frontend and matching database migration set together.
- Preserve existing tenant, transaction, and audit data.
- Confirm RLS, Realtime, registration, invitation activation, and privileged API flows before production promotion.
