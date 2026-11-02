-- Public Self Order requests must validate store/organization activation without requiring
-- the anonymous customer to be a tenant member. The existing is_store_operational()
-- intentionally includes private.is_store_member(), which is correct for staff access
-- but makes every public QR catalog request fail for anon users.
create or replace function private.is_store_publicly_available(target_store uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.stores s
    where s.id = target_store
      and (
        s.organization_id is null
        or exists (
          select 1
          from public.owner_organizations o
          where o.id = s.organization_id
            and o.status = 'active'
            and (o.expires_at is null or o.expires_at > now())
        )
      )
  );
$function$;

revoke all on function private.is_store_publicly_available(uuid) from public, anon, authenticated;

do $migration$
declare
  fn record;
  definition text;
  replaced_count integer := 0;
begin
  for fn in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('get_public_self_order_catalog', 'create_self_service_order')
  loop
    definition := pg_get_functiondef(fn.oid);
    if position('private.is_store_operational(p_store_id)' in definition) = 0 then
      raise exception 'Expected operational guard not found in public.%', fn.proname;
    end if;

    definition := replace(
      definition,
      'private.is_store_operational(p_store_id)',
      'private.is_store_publicly_available(p_store_id)'
    );
    execute definition;
    replaced_count := replaced_count + 1;
  end loop;

  if replaced_count <> 2 then
    raise exception 'Expected to update 2 public Self Order functions; updated %', replaced_count;
  end if;
end;
$migration$;
