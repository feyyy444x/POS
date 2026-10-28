# Deploy Preview Environment

Netlify Deploy Previews for PR #15 are configured to use the isolated `nexapos-test` Supabase project (`yfhczjtjhrmsdbhcitzr`). Production and branch-deploy Supabase settings must remain unchanged until the migration and authenticated end-to-end checks are approved.

Do not apply preview-only schema changes to the production Supabase project as a workaround for missing RPC functions. Verify the active deployment commit and Supabase project before investigating PostgREST schema-cache errors.
