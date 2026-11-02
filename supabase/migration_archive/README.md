# Archived NexaPos migration sources

These files were present in `supabase/migrations/` but their original timestamps did not match the production migration ledger. They are preserved here for traceability and MUST NOT be executed as migrations.

## Reconciliation performed against Supabase POS production on 2026-11-02

The live database migration ledger contained the equivalent or newer behavior for the following sources:

- `20261027122100_support_messages_require_verified_pin.sql`: the two PIN-scoped Support Center policies are already present.
- `20261027173000_super_admin_move_user_between_tenants.sql`: the protected `super_admin_move_user_membership` RPC is already present.
- `20261027180000_enable_workspace_realtime.sql`: the current workspace tables it covers are already in `supabase_realtime`.
- `20261027230000_cashier_shifts_attendance.sql`: the cashier shift table and close-shift RPC are already present.
- `20261028030000_nexapos_operations_queue_audit.sql`: intentionally not applied; the queue creator/caller audit columns and trigger are not used by the current simplified queue UI.
- `20261028030001_reject_duplicate_checkout_items.sql`: the live `complete_sale` RPC already rejects duplicate product IDs and locks stock rows.
- `20261028040000_nexapos_realtime_activation_admin.sql`: the activation and team tables used by the current UI are already published for Realtime.
- `20261028060000_harden_public_tv_rpc_search_path.sql`: the live public queue display RPC already has an empty search path.
- `20261029130000_add_store_queue_enabled.sql`: `store_settings.queue_enabled` already exists in production.
- `20261030370000_owner_tenant_entry_and_expiry_sync.sql`: the owner entry and tenant-list RPCs already exist in production.
- `20261030420000_separate_owner_organization_and_workspace_names.sql`: identical SQL is already recorded twice in the production migration ledger under versions `20261030044855` and `20261030044857`.
- `20261030430000_manager_team_controls_and_cashier_product_insert.sql`: the manager/Owner team-control RPCs are already present in production.
- `20261030440000_super_admin_store_member_controls.sql`: not applied; the current Admin UI does not call these RPCs, so this unused feature is not shipped.
- `20261101120000_support_special_activation_package.sql`: the live activation RPC already contains the Khusus/custom quota path.

## Realtime correction\n\n`support_conversations` was added to `supabase_realtime` in migration `20261102130341_nexapos_realtime_support_conversations`. The table already has RLS enabled and a SELECT policy scoped to the conversation owner or Super Admin.\n\n## Active migration rule

Only files directly inside `supabase/migrations/` are active migrations. The active directory is reconciled to the production ledger: 102 active SQL files match 102 production migration records as of 2026-11-02, including `20261102130341_nexapos_realtime_support_conversations`. Archived files are reference material only. Do not move these files back or apply them manually.
