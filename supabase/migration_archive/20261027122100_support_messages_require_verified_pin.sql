-- Require a PIN-verified Supabase session for all Help Center chat access.
-- Drop both historical policy-name sets; permissive policies combine with OR.
drop policy if exists "Customers and Super Admins can read support messages" on public.support_messages;
drop policy if exists "Customers and Super Admins can send support messages" on public.support_messages;
drop policy if exists support_messages_read_own_or_admin on public.support_messages;
drop policy if exists support_messages_insert_customer_or_admin on public.support_messages;

revoke all on public.support_messages from anon, public;
grant select, insert on public.support_messages to authenticated;

create policy support_messages_read_pin_verified
on public.support_messages for select to authenticated
using (
  private.is_pin_verified()
  and (
    user_id = (select auth.uid())
    or private.is_super_admin()
  )
);

create policy support_messages_insert_pin_verified
on public.support_messages for insert to authenticated
with check (
  private.is_pin_verified()
  and sender_id = (select auth.uid())
  and (
    (sender_role = 'customer' and user_id = (select auth.uid()))
    or (sender_role = 'support' and private.is_super_admin())
  )
);
