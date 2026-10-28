# Deploy Preview Environment

The current Netlify Deploy Preview configuration for PR #15 points to the primary Supabase project `POS` (`zoplanjzcizvjhorsldm`) because the owner explicitly requested that NexaPos work remain on this project.

**Important:** this means the preview is not isolated from production data. Any actions performed in the preview can affect the primary POS database. Do not use it for destructive tests, test transactions, or schema changes. Keep production and branch-deploy settings unchanged unless explicitly approved.

Before troubleshooting authentication or PostgREST schema-cache errors, verify the deployed commit and confirm that both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the deploy-preview context belong to the primary `POS` project.
