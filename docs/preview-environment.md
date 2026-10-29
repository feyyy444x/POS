# Deploy Preview Environment

PR #15 Deploy Preview uses the primary Supabase project `POS` (`zoplanjzcizvjhorsldm`) by explicit owner request. Both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Netlify's deploy-preview context must belong to this project.

**Important:** this preview shares the primary POS database and is not isolated. Avoid destructive tests or fake customer transactions. Schema changes must be additive, reviewed, and applied to this project deliberately. The cashier break migration adds `cashier_break_settings` and `cashier_shift_breaks` with row-level security, per-store membership checks, realtime publication, and a database guard against closing a shift during an active break.

Production and branch-deploy environment contexts are kept separate from the deploy-preview configuration. Do not merge PR #15 into `main` as part of preview troubleshooting.
