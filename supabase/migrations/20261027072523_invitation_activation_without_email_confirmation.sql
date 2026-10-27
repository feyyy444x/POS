-- Invitation activation happens before login through the trusted Netlify function.
-- Auth account creation alone must not silently accept invitations.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  return new;
end;
$$;

-- Prevent the legacy authenticated RPC from bypassing the pre-login activation step.
create or replace function public.accept_store_invites()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Aktivasi undangan harus dilakukan sebelum login melalui menu Aktivasi Undangan';
end;
$$;
revoke all on function public.accept_store_invites() from public, anon;
grant execute on function public.accept_store_invites() to authenticated;
