-- Account security, four-digit PIN verification, profile management and permanent deletion.
create table if not exists public.user_security_pins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.user_security_pins enable row level security;
revoke all on public.user_security_pins from anon, authenticated;

create table if not exists public.pin_verified_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists pin_verified_sessions_user_idx on public.pin_verified_sessions(user_id);
alter table public.pin_verified_sessions enable row level security;
revoke all on public.pin_verified_sessions from anon, authenticated;

create table if not exists public.user_pin_attempt_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.user_pin_attempt_limits enable row level security;
revoke all on public.user_pin_attempt_limits from anon, authenticated;

create or replace function private.current_session_id()
returns uuid language sql stable security definer set search_path = ''
as $$
  select nullif(auth.jwt()->>'session_id','')::uuid
$$;

create or replace function private.is_pin_verified()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.pin_verified_sessions v
    where v.user_id = (select auth.uid())
      and v.session_id = private.current_session_id()
      and v.expires_at > now()
  )
$$;

create or replace function public.get_my_pin_status()
returns table(has_pin boolean, is_verified boolean)
language sql stable security definer set search_path = ''
as $$
  select
    exists(select 1 from public.user_security_pins p where p.user_id=(select auth.uid())),
    private.is_pin_verified()
  where (select auth.uid()) is not null
$$;

create or replace function public.set_my_pin(p_pin text)
returns void language plpgsql security definer set search_path = ''
as $set_my_pin$
declare v_user uuid := auth.uid(); v_session uuid := private.current_session_id();
begin
  if v_user is null or v_session is null then raise exception 'Sesi login tidak valid'; end if;
  if p_pin !~ '^[0-9]{4}$' then raise exception 'PIN harus tepat 4 angka'; end if;
  if exists(select 1 from public.user_security_pins where user_id=v_user) then
    raise exception 'PIN sudah dibuat. Gunakan fitur ganti/reset PIN.';
  end if;
  insert into public.user_security_pins(user_id,pin_hash)
  values(v_user,extensions.crypt(p_pin,extensions.gen_salt('bf')));
  insert into public.pin_verified_sessions(session_id,user_id,expires_at)
  values(v_session,v_user,now()+interval '12 hours')
  on conflict(session_id) do update set user_id=excluded.user_id,verified_at=now(),expires_at=excluded.expires_at;
end;
$set_my_pin$;

create or replace function public.verify_my_pin(p_pin text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_session uuid := private.current_session_id(); v_hash text; v_attempts integer; v_locked timestamptz;
begin
  if v_user is null or v_session is null then raise exception 'Sesi login tidak valid'; end if;
  select failed_attempts,locked_until into v_attempts,v_locked from public.user_pin_attempt_limits where user_id=v_user;
  if v_locked is not null and v_locked>now() then raise exception 'Terlalu banyak percobaan. Coba lagi setelah %',v_locked; end if;
  if p_pin !~ '^[0-9]{4}$' then
    v_hash:=null;
  else
    select pin_hash into v_hash from public.user_security_pins where user_id=v_user;
  end if;
  if v_hash is null or v_hash <> extensions.crypt(coalesce(p_pin,''),v_hash) then
    insert into public.user_pin_attempt_limits(user_id,failed_attempts,locked_until,updated_at)
    values(v_user,1,null,now())
    on conflict(user_id) do update set
      failed_attempts=case when public.user_pin_attempt_limits.locked_until is not null and public.user_pin_attempt_limits.locked_until<=now() then 1 else public.user_pin_attempt_limits.failed_attempts+1 end,
      locked_until=case when (case when public.user_pin_attempt_limits.locked_until is not null and public.user_pin_attempt_limits.locked_until<=now() then 1 else public.user_pin_attempt_limits.failed_attempts+1 end)>=5 then now()+interval '15 minutes' else null end,
      updated_at=now();
    return false;
  end if;
  delete from public.user_pin_attempt_limits where user_id=v_user;
  insert into public.pin_verified_sessions(session_id,user_id,expires_at)
  values(v_session,v_user,now()+interval '12 hours')
  on conflict(session_id) do update set user_id=excluded.user_id,verified_at=now(),expires_at=excluded.expires_at;
  return true;
end;
$$;

create or replace function public.change_my_pin(p_current_pin text,p_new_pin text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_session uuid := private.current_session_id(); v_hash text; v_attempts integer; v_locked timestamptz;
begin
  if v_user is null or v_session is null then raise exception 'Sesi login tidak valid'; end if;
  select failed_attempts,locked_until into v_attempts,v_locked from public.user_pin_attempt_limits where user_id=v_user;
  if v_locked is not null and v_locked>now() then raise exception 'Terlalu banyak percobaan. Coba lagi setelah %',v_locked; end if;
  if p_new_pin !~ '^[0-9]{4}$' then raise exception 'PIN baru harus tepat 4 angka'; end if;
  select pin_hash into v_hash from public.user_security_pins where user_id=v_user;
  if v_hash is null or v_hash <> extensions.crypt(coalesce(p_current_pin,''),v_hash) then
    insert into public.user_pin_attempt_limits(user_id,failed_attempts,locked_until,updated_at)
    values(v_user,1,null,now())
    on conflict(user_id) do update set
      failed_attempts=case when public.user_pin_attempt_limits.locked_until is not null and public.user_pin_attempt_limits.locked_until<=now() then 1 else public.user_pin_attempt_limits.failed_attempts+1 end,
      locked_until=case when (case when public.user_pin_attempt_limits.locked_until is not null and public.user_pin_attempt_limits.locked_until<=now() then 1 else public.user_pin_attempt_limits.failed_attempts+1 end)>=5 then now()+interval '15 minutes' else null end,
      updated_at=now();
    raise exception 'PIN saat ini salah';
  end if;
  delete from public.user_pin_attempt_limits where user_id=v_user;
  update public.user_security_pins set pin_hash=extensions.crypt(p_new_pin,extensions.gen_salt('bf')),updated_at=now() where user_id=v_user;
  delete from public.pin_verified_sessions where user_id=v_user;
  insert into public.pin_verified_sessions(session_id,user_id,expires_at) values(v_session,v_user,now()+interval '12 hours');
end;
$$;

create or replace function public.update_my_profile(p_full_name text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_name text := btrim(coalesce(p_full_name,''));
begin
  if v_user is null or not private.is_pin_verified() then raise exception 'Verifikasi PIN diperlukan'; end if;
  if length(v_name)<2 or length(v_name)>120 then raise exception 'Nama harus 2–120 karakter'; end if;
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data,'{}'::jsonb) || jsonb_build_object('full_name',v_name),
      updated_at=now()
  where id=v_user;
  update public.store_members set full_name=v_name where user_id=v_user;
  update public.store_invites set full_name=v_name
  where lower(email)=lower((select email from auth.users where id=v_user))
    and accepted_at is null;
end;
$$;

create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_pin_verified()
    and exists(select 1 from public.super_admins sa where sa.user_id=(select auth.uid()))
$$;

create or replace function private.is_store_member(target_store uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_pin_verified()
    and exists(select 1 from public.store_members m
      where m.store_id=target_store and m.user_id=(select auth.uid()) and m.is_active=true)
$$;

create or replace function private.is_store_manager(target_store uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_pin_verified()
    and exists(select 1 from public.store_members m
      where m.store_id=target_store and m.user_id=(select auth.uid()) and m.is_active=true
        and m.role in ('owner','admin','manager'))
$$;

create or replace function private.is_store_owner(target_store uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_pin_verified()
    and exists(select 1 from public.store_members m
      where m.store_id=target_store and m.user_id=(select auth.uid()) and m.role='owner' and m.is_active=true)
$$;

create or replace function private.is_store_operational(target_store uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_store_member(target_store)
     and exists(select 1 from public.stores s
       where s.id=target_store and s.status='active'
         and (s.expires_at is null or s.expires_at>now()) and s.deleted_at is null)
$$;

create or replace function public.set_store_tenant_status(p_store_id uuid,p_status text)
returns public.stores
language plpgsql security definer set search_path = ''
as $tenant_status$
declare v_store public.stores;
begin
  if not private.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if p_status not in ('pending','suspended') then
    raise exception 'Status tidak valid. Penghapusan tenant harus menggunakan penghapusan permanen.';
  end if;
  update public.stores set status=p_status
  where id=p_store_id and deleted_at is null returning * into v_store;
  if v_store.id is null then raise exception 'Tenant tidak ditemukan'; end if;
  return v_store;
end;
$tenant_status$;

create or replace function public.super_admin_list_users()
returns table(
  user_id uuid, email text, full_name text, created_at timestamptz, last_sign_in_at timestamptz,
  is_super_admin boolean, is_banned boolean, membership_count bigint, active_memberships bigint, store_names text
)
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_super_admin() then raise exception 'Super Admin access required'; end if;
  return query
  select u.id,coalesce(u.email,''),coalesce(
    nullif(u.raw_user_meta_data->>'full_name',''),
    string_agg(distinct nullif(m.full_name,''),', ') filter(where nullif(m.full_name,'') is not null),''),
    u.created_at,u.last_sign_in_at,
    exists(select 1 from public.super_admins sa where sa.user_id=u.id),
    coalesce(u.banned_until>now(),false),count(distinct m.id),
    count(distinct m.id) filter(where m.is_active=true),
    coalesce(string_agg(distinct s.name,', ') filter(where s.name is not null),'')
  from auth.users u
  left join public.store_members m on m.user_id=u.id
  left join public.stores s on s.id=m.store_id
  group by u.id,u.email,u.created_at,u.last_sign_in_at,u.banned_until,u.raw_user_meta_data
  order by u.created_at desc;
end;
$$;

create or replace function public.super_admin_set_user_banned(p_user_id uuid,p_banned boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if p_user_id is null or p_user_id=(select auth.uid()) then raise exception 'Target akun tidak valid'; end if;
  if exists(select 1 from public.super_admins where user_id=p_user_id) then raise exception 'Akun Super Admin dilindungi'; end if;
  update auth.users set banned_until=case when coalesce(p_banned,false) then now()+interval '100 years' else null end,updated_at=now() where id=p_user_id;
  if not found then raise exception 'Akun tidak ditemukan'; end if;
end;
$$;

create or replace function public.super_admin_reset_user_pin(p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if p_user_id is null or p_user_id=(select auth.uid()) then raise exception 'Target akun tidak valid'; end if;
  if exists(select 1 from public.super_admins where user_id=p_user_id) then raise exception 'Akun Super Admin lain dilindungi dari reset lewat menu ini'; end if;
  delete from public.user_security_pins where user_id=p_user_id;
  delete from public.pin_verified_sessions where user_id=p_user_id;
  delete from public.user_pin_attempt_limits where user_id=p_user_id;
  if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Akun tidak ditemukan'; end if;
end;
$$;

create or replace function public.super_admin_delete_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_email text;
begin
  if not private.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if p_user_id is null or p_user_id=(select auth.uid()) then raise exception 'Tidak dapat menghapus akun sendiri'; end if;
  if exists(select 1 from public.super_admins where user_id=p_user_id) then raise exception 'Akun Super Admin dilindungi'; end if;
  select email into v_email from auth.users where id=p_user_id;
  if v_email is null then raise exception 'Akun tidak ditemukan'; end if;
  delete from public.store_invites where lower(email)=lower(v_email);
  -- The current schema does not define an auth.users FK on store_members;
  -- remove memberships explicitly to avoid orphaned access rows.
  delete from public.store_members where user_id=p_user_id;
  delete from auth.users where id=p_user_id;
end;
$$;

create or replace function public.super_admin_delete_store_tenant(p_store_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user_ids uuid[];
begin
  if not private.is_super_admin() then raise exception 'Super Admin access required'; end if;
  if p_store_id is null then raise exception 'Tenant tidak valid'; end if;
  if not exists(select 1 from public.stores where id=p_store_id) then raise exception 'Tenant tidak ditemukan'; end if;
  select coalesce(array_agg(distinct user_id),'{}'::uuid[]) into v_user_ids
  from public.store_members where store_id=p_store_id;
  -- FK ON DELETE CASCADE removes tenant products, orders, order items, stock, queue, settings,
  -- memberships and invitations. This is intentionally permanent.
  delete from public.stores where id=p_store_id;
  -- Delete now-orphaned user accounts, but preserve accounts shared with another tenant or Super Admin.
  delete from auth.users u
  where u.id=any(v_user_ids)
    and not exists(select 1 from public.store_members m where m.user_id=u.id)
    and not exists(select 1 from public.super_admins sa where sa.user_id=u.id);
end;
$$;

create or replace function public.owner_update_store_member(p_member_id uuid,p_full_name text,p_role text,p_is_active boolean)
returns public.store_members language plpgsql security definer set search_path = ''
as $$
declare v_member public.store_members;
begin
  select * into v_member from public.store_members where id=p_member_id;
  if v_member.id is null then raise exception 'Anggota tidak ditemukan'; end if;
  if not private.is_store_owner(v_member.store_id) then raise exception 'Hanya Owner toko yang dapat mengubah akun'; end if;
  if v_member.user_id=(select auth.uid()) or v_member.role='owner' then raise exception 'Akun Owner tidak dapat diubah dari menu staf'; end if;
  if p_role not in ('admin','cashier') then raise exception 'Role tidak valid'; end if;
  if length(btrim(coalesce(p_full_name,'')))<2 or length(btrim(p_full_name))>120 then raise exception 'Nama harus 2–120 karakter'; end if;
  update public.store_members set full_name=btrim(p_full_name),role=p_role,is_active=coalesce(p_is_active,false),
    disabled_at=case when coalesce(p_is_active,false) then null else coalesce(disabled_at,now()) end,
    disabled_by=case when coalesce(p_is_active,false) then null else (select auth.uid()) end
  where id=p_member_id returning * into v_member;
  return v_member;
end;
$$;

create or replace function public.owner_delete_store_member(p_member_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_member public.store_members; v_email text;
begin
  select * into v_member from public.store_members where id=p_member_id;
  if v_member.id is null then raise exception 'Anggota tidak ditemukan'; end if;
  if not private.is_store_owner(v_member.store_id) then raise exception 'Hanya Owner toko yang dapat menghapus akun'; end if;
  if v_member.user_id=(select auth.uid()) or v_member.role='owner' then raise exception 'Akun Owner tidak dapat dihapus dari menu staf'; end if;
  v_email:=v_member.email;
  delete from public.store_invites where store_id=v_member.store_id and lower(email)=lower(v_email);
  delete from public.store_members where id=p_member_id;
  if not exists(select 1 from public.store_members where user_id=v_member.user_id)
     and not exists(select 1 from public.super_admins where user_id=v_member.user_id) then
    delete from public.store_invites where lower(email)=lower(v_email);
    delete from auth.users where id=v_member.user_id;
  end if;
end;
$$;

create or replace function public.owner_delete_store_invite(p_invite_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_store_id uuid;
begin
  select store_id into v_store_id from public.store_invites where id=p_invite_id;
  if v_store_id is null then raise exception 'Undangan tidak ditemukan'; end if;
  if not private.is_store_owner(v_store_id) then raise exception 'Hanya Owner toko yang dapat menghapus undangan'; end if;
  delete from public.store_invites where id=p_invite_id;
end;
$$;

revoke all on function public.get_my_pin_status() from public,anon;
revoke all on function public.set_store_tenant_status(uuid,text) from public,anon;
revoke all on function public.set_my_pin(text) from public,anon;
revoke all on function public.verify_my_pin(text) from public,anon;
revoke all on function public.change_my_pin(text,text) from public,anon;
revoke all on function public.update_my_profile(text) from public,anon;
revoke all on function public.super_admin_reset_user_pin(uuid) from public,anon;
revoke all on function public.super_admin_delete_user(uuid) from public,anon;
revoke all on function public.super_admin_delete_store_tenant(uuid) from public,anon;
revoke all on function public.owner_update_store_member(uuid,text,text,boolean) from public,anon;
revoke all on function public.owner_delete_store_member(uuid) from public,anon;
revoke all on function public.owner_delete_store_invite(uuid) from public,anon;
grant execute on function public.get_my_pin_status() to authenticated;
grant execute on function public.set_store_tenant_status(uuid,text) to authenticated;
grant execute on function public.set_my_pin(text) to authenticated;
grant execute on function public.verify_my_pin(text) to authenticated;
grant execute on function public.change_my_pin(text,text) to authenticated;
grant execute on function public.update_my_profile(text) to authenticated;
grant execute on function public.super_admin_reset_user_pin(uuid) to authenticated;
grant execute on function public.super_admin_delete_user(uuid) to authenticated;
grant execute on function public.super_admin_delete_store_tenant(uuid) to authenticated;
grant execute on function public.owner_update_store_member(uuid,text,text,boolean) to authenticated;
grant execute on function public.owner_delete_store_member(uuid) to authenticated;
grant execute on function public.owner_delete_store_invite(uuid) to authenticated;
grant execute on function public.super_admin_list_users() to authenticated;
grant execute on function public.super_admin_set_user_banned(uuid,boolean) to authenticated;
