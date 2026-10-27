create or replace function public.owner_regenerate_store_invite(
  p_invite_id uuid,
  p_activation_code text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_store_id uuid;
  v_accepted_at timestamptz;
  v_code text := lower(trim(coalesce(p_activation_code, '')));
begin
  if v_code !~ '^[a-f0-9]{32}$' then
    raise exception 'Kode aktivasi tidak valid';
  end if;

  select store_id, accepted_at
    into v_store_id, v_accepted_at
  from public.store_invites
  where id = p_invite_id
  for update;

  if v_store_id is null then
    raise exception 'Undangan tidak ditemukan';
  end if;

  if not private.is_store_owner(v_store_id) then
    raise exception 'Hanya Owner toko yang dapat membuat ulang kode undangan';
  end if;

  if v_accepted_at is not null then
    raise exception 'Undangan sudah diterima; buat undangan baru jika diperlukan';
  end if;

  update public.store_invites
  set activation_code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex'),
      expires_at = now() + interval '30 days'
  where id = p_invite_id;
end;
$function$;

revoke all on function public.owner_regenerate_store_invite(uuid, text) from public, anon;
grant execute on function public.owner_regenerate_store_invite(uuid, text) to authenticated;
