# Deploy Preview rebuild

Trigger a fresh Netlify Deploy Preview build after correcting the deploy-preview Supabase environment variables to the primary POS project (`zoplanjzcizvjhorsldm`). The cashier break migration has also been applied additively to that project so the preview can access `cashier_shift_breaks` and `cashier_break_settings`.

This is a PR #15 preview rebuild, not a merge to `main`. Avoid destructive test transactions because the preview now shares the primary POS database.
