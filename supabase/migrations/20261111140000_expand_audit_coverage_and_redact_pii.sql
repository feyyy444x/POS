-- Expand audit coverage while keeping credentials, contact data and message bodies out of snapshots.
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
  v_actor_user_id uuid := (select auth.uid());
  v_action text := tg_op;
begin
  if tg_op in ('UPDATE','DELETE') then v_before := to_jsonb(old); end if;
  if tg_op in ('INSERT','UPDATE') then v_after := to_jsonb(new); end if;

  -- Redact personal/contact data, message bodies, payment paths, PINs and tokens.
  if v_before is not null then
    v_before := v_before
      - 'activation_code_hash' - 'pin_hash' - 'password'
      - 'public_token' - 'access_token' - 'refresh_token' - 'token' - 'secret'
      - 'customer_name' - 'customer_phone' - 'customer_notes'
      - 'email' - 'user_email' - 'owner_email' - 'owner_name' - 'full_name'
      - 'phone' - 'whatsapp_number' - 'telegram_username' - 'address'
      - 'message' - 'manual_alert_message' - 'manual_alert_title'
      - 'cashier_name_snapshot' - 'sent_by_name_snapshot'
      - 'question' - 'answer' - 'content'
      - 'payment_proof_path' - 'qris_image_url' - 'storage_path' - 'source_url';
  end if;
  if v_after is not null then
    v_after := v_after
      - 'activation_code_hash' - 'pin_hash' - 'password'
      - 'public_token' - 'access_token' - 'refresh_token' - 'token' - 'secret'
      - 'customer_name' - 'customer_phone' - 'customer_notes'
      - 'email' - 'user_email' - 'owner_email' - 'owner_name' - 'full_name'
      - 'phone' - 'whatsapp_number' - 'telegram_username' - 'address'
      - 'message' - 'manual_alert_message' - 'manual_alert_title'
      - 'cashier_name_snapshot' - 'sent_by_name_snapshot'
      - 'question' - 'answer' - 'content'
      - 'payment_proof_path' - 'qris_image_url' - 'storage_path' - 'source_url';
  end if;

  if tg_table_name = 'stores' then
    v_store_id := coalesce(nullif(v_after->>'id','')::uuid, nullif(v_before->>'id','')::uuid);
    v_org_id := coalesce(nullif(v_after->>'organization_id','')::uuid, nullif(v_before->>'organization_id','')::uuid);
    if tg_op = 'DELETE' then v_store_id := null; end if;
  elsif tg_table_name = 'owner_organizations' then
    v_org_id := coalesce(nullif(v_after->>'id','')::uuid, nullif(v_before->>'id','')::uuid);
    if tg_op = 'DELETE' then v_org_id := null; end if;
  elsif tg_table_name = 'order_items' then
    select o.store_id into v_store_id
    from public.orders o
    where o.id = coalesce(nullif(v_after->>'order_id','')::uuid, nullif(v_before->>'order_id','')::uuid);
  elsif tg_table_name = 'self_service_order_items' then
    select o.store_id into v_store_id
    from public.self_service_orders o
    where o.id = coalesce(nullif(v_after->>'self_service_order_id','')::uuid, nullif(v_before->>'self_service_order_id','')::uuid);
  else
    v_store_id := coalesce(nullif(v_after->>'store_id','')::uuid, nullif(v_before->>'store_id','')::uuid);
  end if;

  if v_store_id is not null then
    if tg_op = 'DELETE' and not exists (select 1 from public.stores s where s.id = v_store_id) then
      return old;
    end if;
    select s.organization_id into v_org_id
    from public.stores s where s.id = v_store_id;
  end if;

  if v_actor_user_id is null then
    v_actor_user_id := coalesce(
      nullif(v_after->>'updated_by','')::uuid,
      nullif(v_before->>'updated_by','')::uuid,
      nullif(v_after->>'sent_by','')::uuid,
      nullif(v_before->>'sent_by','')::uuid,
      nullif(v_after->>'sender_id','')::uuid,
      nullif(v_before->>'sender_id','')::uuid
    );
  end if;

  v_entity_id := coalesce(
    v_after->>'id', v_before->>'id',
    v_after->>'store_id', v_before->>'store_id',
    v_after->>'user_id', v_before->>'user_id',
    v_after->>'order_id', v_before->>'order_id',
    v_after->>'self_service_order_id', v_before->>'self_service_order_id'
  );

  insert into public.platform_audit_logs (
    actor_user_id, organization_id, store_id, entity_table, entity_id,
    action, before_data, after_data
  ) values (
    v_actor_user_id, v_org_id, v_store_id, tg_table_name, v_entity_id,
    v_action, v_before, v_after
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

-- Tenant operational/configuration history.
drop trigger if exists audit_cashier_break_settings_changes on public.cashier_break_settings;
create trigger audit_cashier_break_settings_changes after insert or update or delete on public.cashier_break_settings
for each row execute function private.capture_nexapos_audit_event();

drop trigger if exists audit_cashier_manual_alerts_changes on public.cashier_manual_alerts;
create trigger audit_cashier_manual_alerts_changes after insert or update or delete on public.cashier_manual_alerts
for each row execute function private.capture_nexapos_audit_event();

drop trigger if exists audit_cashier_shift_breaks_changes on public.cashier_shift_breaks;
create trigger audit_cashier_shift_breaks_changes after insert or update or delete on public.cashier_shift_breaks
for each row execute function private.capture_nexapos_audit_event();

drop trigger if exists audit_order_items_changes on public.order_items;
create trigger audit_order_items_changes after insert or update or delete on public.order_items
for each row execute function private.capture_nexapos_audit_event();

drop trigger if exists audit_self_service_order_items_changes on public.self_service_order_items;
create trigger audit_self_service_order_items_changes after insert or update or delete on public.self_service_order_items
for each row execute function private.capture_nexapos_audit_event();

drop trigger if exists audit_store_tv_settings_changes on public.store_tv_settings;
create trigger audit_store_tv_settings_changes after insert or update or delete on public.store_tv_settings
for each row execute function private.capture_nexapos_audit_event();

-- Platform administration and support metadata. Message/contact content is redacted above.
drop trigger if exists audit_site_subscription_plans_changes on public.site_subscription_plans;
create trigger audit_site_subscription_plans_changes after insert or update or delete on public.site_subscription_plans
for each row execute function private.capture_nexapos_audit_event();

drop trigger if exists audit_super_admins_changes on public.super_admins;
create trigger audit_super_admins_changes after insert or update or delete on public.super_admins
for each row execute function private.capture_nexapos_audit_event();

drop trigger if exists audit_support_channel_settings_changes on public.support_channel_settings;
create trigger audit_support_channel_settings_changes after insert or update or delete on public.support_channel_settings
for each row execute function private.capture_nexapos_audit_event();

drop trigger if exists audit_support_knowledge_base_changes on public.support_knowledge_base;
create trigger audit_support_knowledge_base_changes after insert or update or delete on public.support_knowledge_base
for each row execute function private.capture_nexapos_audit_event();

drop trigger if exists audit_support_messages_changes on public.support_messages;
create trigger audit_support_messages_changes after insert or update or delete on public.support_messages
for each row execute function private.capture_nexapos_audit_event();

drop trigger if exists audit_support_conversation_status_changes on public.support_conversations;
drop trigger if exists audit_support_conversations_status_changes on public.support_conversations;
create trigger audit_support_conversation_status_changes after update of status on public.support_conversations
for each row when (old.status is distinct from new.status)
execute function private.capture_nexapos_audit_event();

drop trigger if exists audit_support_conversations_lifecycle on public.support_conversations;
create trigger audit_support_conversations_lifecycle after insert or delete on public.support_conversations
for each row execute function private.capture_nexapos_audit_event();

-- PIN hash is removed from snapshots; attempt counters are useful for security investigations.
drop trigger if exists audit_user_security_pins_changes on public.user_security_pins;
create trigger audit_user_security_pins_changes after insert or update or delete on public.user_security_pins
for each row execute function private.capture_nexapos_audit_event();

drop trigger if exists audit_user_pin_attempt_limits_changes on public.user_pin_attempt_limits;
create trigger audit_user_pin_attempt_limits_changes after insert or update or delete on public.user_pin_attempt_limits
for each row execute function private.capture_nexapos_audit_event();
