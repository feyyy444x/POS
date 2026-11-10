-- Internal one-time activation for free single-workspace registration.
alter table private.free_workspace_registration_intents add column if not exists activation_code_hash text;

create or replace function public.prepare_free_single_workspace_registration(
 p_user_id uuid,p_email text,p_owner_name text,p_company_name text,p_workspace_name text,p_business_category text,p_pin text,p_activation_code text
) returns boolean language plpgsql security definer set search_path='' as $function$
declare
 v_email text:=lower(btrim(coalesce(p_email,''))); v_owner_name text:=btrim(coalesce(p_owner_name,''));
 v_company_name text:=btrim(coalesce(p_company_name,'')); v_workspace_name text:=btrim(coalesce(p_workspace_name,''));
 v_business_category text:=btrim(coalesce(p_business_category,'')); v_auth_email text; v_pending_flag text; v_prepared_user_id uuid;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Registration service access required'; end if;
 if p_user_id is null then raise exception 'Akun autentikasi tidak valid'; end if;
 if coalesce(p_activation_code,'') !~ '^[a-f0-9]{32}$' then raise exception 'Kode aktivasi internal tidak valid'; end if;
 select lower(u.email),u.raw_user_meta_data->>'free_workspace_pending' into v_auth_email,v_pending_flag from auth.users u where u.id=p_user_id;
 if not found or v_auth_email is distinct from v_email then raise exception 'Email akun autentikasi tidak cocok'; end if;
 if v_pending_flag is distinct from 'true' then raise exception 'Akun ini tidak memiliki sesi pendaftaran gratis yang valid'; end if;
 if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Format email tidak valid'; end if;
 if length(v_owner_name)<2 or length(v_owner_name)>120 then raise exception 'Nama Owner harus 2 sampai 120 karakter'; end if;
 if length(v_company_name)<2 or length(v_company_name)>120 then raise exception 'Nama Perusahaan harus 2 sampai 120 karakter'; end if;
 if length(v_workspace_name)<2 or length(v_workspace_name)>120 then raise exception 'Nama workspace harus 2 sampai 120 karakter'; end if;
 if v_business_category not in ('Retail / Toko','Minimarket','Fashion / Pakaian','Kuliner / Restoran','Kafe / Kedai','Jasa','Salon / Barbershop','Apotek','Elektronik','Lainnya') then raise exception 'Kategori usaha wajib dipilih dari daftar'; end if;
 if p_pin !~ '^[0-9]{4}$' then raise exception 'PIN harus tepat 4 angka'; end if;
 if exists(select 1 from public.store_members m where m.user_id=p_user_id and m.is_active) then raise exception 'Akun ini sudah terhubung ke workspace'; end if;
 if exists(select 1 from public.user_security_pins p where p.user_id=p_user_id) then raise exception 'Akun ini sudah memiliki PIN keamanan'; end if;
 delete from private.free_workspace_registration_intents where expires_at<=now();
 insert into private.free_workspace_registration_intents as existing(user_id,email,owner_name,company_name,workspace_name,business_category,pin_hash,activation_code_hash,expires_at)
 values(p_user_id,v_email,v_owner_name,v_company_name,v_workspace_name,v_business_category,
 extensions.crypt(p_pin,extensions.gen_salt('bf')),encode(extensions.digest(p_activation_code,'sha256'),'hex'),now()+interval '30 days')
 on conflict(user_id) do update set expires_at=greatest(existing.expires_at,excluded.expires_at)
 where existing.expires_at>now() and existing.email=excluded.email and existing.owner_name=excluded.owner_name
 and existing.company_name=excluded.company_name and existing.workspace_name=excluded.workspace_name
 and existing.business_category=excluded.business_category and existing.activation_code_hash=excluded.activation_code_hash
 and extensions.crypt(p_pin,existing.pin_hash)=existing.pin_hash returning user_id into v_prepared_user_id;
 if v_prepared_user_id is null then raise exception 'Pendaftaran sebelumnya berbeda atau telah kedaluwarsa'; end if;
 return true;
end;$function$;

create or replace function public.complete_free_single_workspace_registration(p_user_id uuid,p_activation_code text)
returns uuid language plpgsql security definer set search_path='' as $function$
declare v_intent private.free_workspace_registration_intents; v_auth_email text; v_store_id uuid;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Registration service access required'; end if;
 if p_user_id is null then raise exception 'Akun autentikasi tidak valid'; end if;
 select lower(u.email) into v_auth_email from auth.users u where u.id=p_user_id and u.email_confirmed_at is not null;
 if not found then raise exception 'Akun autentikasi belum aktif'; end if;
 select * into v_intent from private.free_workspace_registration_intents i where i.user_id=p_user_id for update;
 if not found then return null; end if;
 if v_intent.expires_at<=now() then delete from private.free_workspace_registration_intents where user_id=p_user_id; raise exception 'Masa persiapan pendaftaran telah berakhir'; end if;
 if v_intent.email is distinct from v_auth_email then raise exception 'Email akun tidak cocok'; end if;
 if v_intent.activation_code_hash is null or v_intent.activation_code_hash<>encode(extensions.digest(coalesce(p_activation_code,''),'sha256'),'hex') then raise exception 'Kode aktivasi internal tidak valid atau sudah digunakan'; end if;
 if exists(select 1 from public.store_members m where m.user_id=p_user_id and m.is_active) then raise exception 'Akun ini sudah terhubung ke workspace'; end if;
 insert into public.stores(name,company_name,business_category,owner_name,owner_email,status,activated_at,expires_at,activation_days,activation_package_key,activation_location_limit,workspace_mode,is_primary_workspace)
 values(v_intent.workspace_name,v_intent.company_name,v_intent.business_category,v_intent.owner_name,v_intent.email,'active',now(),now()+interval '30 days',30,'free_workspace',1,'single_workspace',true) returning id into v_store_id;
 insert into public.store_members(store_id,user_id,role,email,full_name,is_active) values(v_store_id,p_user_id,'owner',v_intent.email,v_intent.owner_name,true);
 insert into public.store_settings(store_id,store_name) values(v_store_id,v_intent.workspace_name);
 insert into public.user_security_pins(user_id,pin_hash) values(p_user_id,v_intent.pin_hash);
 delete from private.free_workspace_registration_intents where user_id=p_user_id;
 return v_store_id;
end;$function$;

revoke all on function public.prepare_free_single_workspace_registration(uuid,text,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.complete_free_single_workspace_registration(uuid) from public,anon,authenticated;
revoke all on function public.prepare_free_single_workspace_registration(uuid,text,text,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.complete_free_single_workspace_registration(uuid,text) from public,anon,authenticated;
grant execute on function public.prepare_free_single_workspace_registration(uuid,text,text,text,text,text,text,text) to service_role;
grant execute on function public.complete_free_single_workspace_registration(uuid,text) to service_role;


-- Free workspaces expire after 30 days. Only Super Admin (with verified PIN)
-- may extend them through the existing admin activation workflow.
create or replace function public.activate_single_workspace(p_store_id uuid,p_duration_days integer)
returns public.stores language plpgsql security definer set search_path='' as $function$
declare v_store public.stores;
begin
  if not private.is_super_admin() then
    raise exception 'Super Admin access required';
  end if;
  if not private.is_pin_verified() then
    raise exception 'Verifikasi PIN diperlukan untuk mengubah aktivasi';
  end if;
  if p_duration_days is null or p_duration_days < 1 or p_duration_days > 36500 then
    raise exception 'Durasi harus 1 sampai 36500 hari';
  end if;
  select * into v_store from public.stores
  where id=p_store_id and workspace_mode='single_workspace'
    and status<>'deleted' and deleted_at is null for update;
  if not found then
    raise exception 'Single Workspace tidak ditemukan atau sudah diarsipkan';
  end if;
  update public.stores
  set status='active',
      workspace_mode='single_workspace',
      organization_id=null,
      activation_package_key=case when v_store.activation_package_key='free_workspace' then 'free_workspace' else 'single_workspace' end,
      activation_location_limit=1,
      activated_at=now(),
      expires_at=now()+make_interval(days=>p_duration_days),
      activation_days=p_duration_days,
      is_primary_workspace=true,
      deleted_at=null
  where id=v_store.id returning * into v_store;
  return v_store;
end;
$function$;
