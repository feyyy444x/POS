-- Remove personal/contact and secret fields from historical audit snapshots.
-- This is a branch migration; it is not applied to the production database by this commit.

create or replace function private.redact_audit_snapshot(p_value jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $function$
declare
  v_result jsonb;
begin
  if p_value is null then
    return null;
  elsif jsonb_typeof(p_value) = 'object' then
    select coalesce(jsonb_object_agg(e.key, private.redact_audit_snapshot(e.value)), '{}'::jsonb)
      into v_result
    from jsonb_each(p_value) e
    where lower(e.key) not in (
      'activation_code_hash','pin_hash','password','public_token','access_token',
      'refresh_token','token','secret','customer_name','customer_phone',
      'customer_notes','email','user_email','owner_email','owner_name','full_name',
      'phone','whatsapp_number','telegram_username','address','message',
      'manual_alert_message','manual_alert_title','cashier_name_snapshot',
      'sent_by_name_snapshot','question','answer','content','payment_proof_path',
      'qris_image_url','storage_path','source_url'
    );
    return v_result;
  elsif jsonb_typeof(p_value) = 'array' then
    select coalesce(jsonb_agg(private.redact_audit_snapshot(e.value) order by e.ordinality), '[]'::jsonb)
      into v_result
    from jsonb_array_elements(p_value) with ordinality e(value, ordinality);
    return v_result;
  end if;
  return p_value;
end;
$function$;

revoke all on function private.redact_audit_snapshot(jsonb) from public, anon, authenticated;

-- Scrub existing snapshots in place without selecting or exposing the original values.
update public.platform_audit_logs
set before_data = private.redact_audit_snapshot(before_data),
    after_data = private.redact_audit_snapshot(after_data)
where before_data is not null or after_data is not null;
