-- Auditable administrative and operational events. Sensitive credentials/tokens are never copied into audit payloads.
create table if not exists public.platform_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.owner_organizations(id) on delete set null,
  store_id uuid references public.stores(id) on delete set null,
  entity_table text not null,
  entity_id text,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_audit_logs_created_at_idx
  on public.platform_audit_logs (created_at desc);
create index if not exists platform_audit_logs_store_created_idx
  on public.platform_audit_logs (store_id, created_at desc);
create index if not exists platform_audit_logs_organization_created_idx
  on public.platform_audit_logs (organization_id, created_at desc);
create index if not exists platform_audit_logs_actor_created_idx
  on public.platform_audit_logs (actor_user_id, created_at desc);

alter table public.platform_audit_logs enable row level security;
revoke all on public.platform_audit_logs from public, anon;
grant select on public.platform_audit_logs to authenticated;

drop policy if exists "Super Admin reads platform audit logs" on public.platform_audit_logs;
create policy "Super Admin reads platform audit logs"
  on public.platform_audit_logs for select to authenticated
  using (private.is_super_admin());

drop policy if exists "Owner reads organization audit logs" on public.platform_audit_logs;
create policy "Owner reads organization audit logs"
  on public.platform_audit_logs for select to authenticated
  using (
    organization_id is not null
    and exists (
      select 1 from public.owner_organizations o
      where o.id = platform_audit_logs.organization_id
        and o.owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "Owner reads own tenant audit logs" on public.platform_audit_logs;
create policy "Owner reads own tenant audit logs"
  on public.platform_audit_logs for select to authenticated
  using (
    store_id is not null
    and private.is_store_owner(store_id)
  );

create or replace function private.capture_nexapos_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_before jsonb;
  v_after jsonb;
  v_store_id uuid;
  v_org_id uuid;
  v_entity_id text;
  v_action text := tg_op;
begin
  if tg_op in ('UPDATE','DELETE') then
    v_before := to_jsonb(old);
  end if;
  if tg_op in ('INSERT','UPDATE') then
    v_after := to_jsonb(new);
  end if;

  -- Never persist hashes or bearer tokens in audit payloads.
  if v_before is not null then
    v_before := v_before - 'activation_code_hash' - 'pin_hash' - 'password'
      - 'public_token' - 'access_token' - 'refresh_token' - 'token' - 'secret' - 'customer_name';
  end if;
  if v_after is not null then
    v_after := v_after - 'activation_code_hash' - 'pin_hash' - 'password'
      - 'public_token' - 'access_token' - 'refresh_token' - 'token' - 'secret' - 'customer_name';
  end if;

  if tg_table_name = 'stores' then
    v_store_id := coalesce(nullif(v_after->>'id','')::uuid, nullif(v_before->>'id','')::uuid);
    v_org_id := coalesce(nullif(v_after->>'organization_id','')::uuid, nullif(v_before->>'organization_id','')::uuid);
    -- A deleted store cannot be the FK target of its own post-delete audit record.
    if tg_op = 'DELETE' then v_store_id := null; end if;
  elsif tg_table_name = 'owner_organizations' then
    v_org_id := coalesce(nullif(v_after->>'id','')::uuid, nullif(v_before->>'id','')::uuid);
  else
    v_store_id := coalesce(nullif(v_after->>'store_id','')::uuid, nullif(v_before->>'store_id','')::uuid);
    if v_store_id is not null then
      select s.organization_id into v_org_id
      from public.stores s where s.id = v_store_id;
    end if;
  end if;

  v_entity_id := coalesce(
    v_after->>'id', v_before->>'id',
    v_after->>'store_id', v_before->>'store_id',
    v_after->>'user_id', v_before->>'user_id'
  );

  insert into public.platform_audit_logs (
    actor_user_id, organization_id, store_id, entity_table, entity_id,
    action, before_data, after_data
  ) values (
    (select auth.uid()), v_org_id, v_store_id, tg_table_name, v_entity_id,
    v_action, v_before, v_after
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

revoke all on function private.capture_nexapos_audit_event() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'owner_organizations',
    'stores',
    'store_members',
    'store_invites',
    'store_settings',
    'products',
    'orders',
    'queue_tickets',
    'cashier_shifts',
    'site_promotions',
    'site_activation_packages',
    'site_activation_durations',
    'platform_staff_roles'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists nexapos_audit_event on public.%I', t);
      execute format(
        'create trigger nexapos_audit_event after insert or update or delete on public.%I for each row execute function private.capture_nexapos_audit_event()',
        t
      );
    end if;
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'platform_audit_logs'
  ) then
    alter publication supabase_realtime add table public.platform_audit_logs;
  end if;
end $$;
