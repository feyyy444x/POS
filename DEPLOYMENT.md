# Deployment checklist

- Build command: `npm run build`
- Publish directory: `dist`
- Required build variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Required Netlify Functions runtime variables: `SUPABASE_URL` (or reuse `VITE_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`. Store the service-role key only in Netlify's server-side environment; never use a `VITE_` prefix or expose it to browser code.
- Invitation activation validates a pending, unexpired `store_invites` row before setting the password. The migration `20261027070000_invitation_activation_without_email_confirmation.sql` must be applied to the target Supabase database before enabling this flow.
- The pull request preview is the review target; do not publish the feature branch to production until the app has been tested end-to-end.
