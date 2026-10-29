-- Authoritative server-side quote calculation for public activation pricing and voucher eligibility.
-- This is a read-only SECURITY INVOKER function; existing RLS rules continue to limit visible rows.
create or replace function public.get_activation_quote(
  p_package_key text,
  p_duration_key text,
  p_promo_code text default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $function$
declare
  v_price numeric(12,2);
  v_promo public.site_promotions;
  v_has_promo boolean := false;
  v_discount numeric(12,2) := 0;
  v_final numeric(12,2);
  v_code text := upper(trim(coalesce(p_promo_code, '')));
begin
  select greatest(0, coalesce((p.prices ->> p_duration_key)::numeric, 0))
  into v_price
  from public.site_activation_packages p
  where p.package_key = p_package_key
    and p.is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Paket tidak tersedia.');
  end if;

  if not exists (
    select 1 from public.site_activation_durations d
    where d.duration_key = p_duration_key and d.is_active = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'Durasi tidak tersedia.');
  end if;

  if v_code = '' then
    select p.* into v_promo
    from public.site_promotions p
    where p.is_active = true
      and p.requires_code = false
      and (p.starts_at is null or p.starts_at <= now())
      and (p.ends_at is null or p.ends_at >= now())
      and (cardinality(p.eligible_periods) = 0 or p_duration_key = any(p.eligible_periods))
    order by p.starts_at desc nulls last, p.created_at desc
    limit 1;
  else
    select p.* into v_promo
    from public.site_promotions p
    where p.is_active = true
      and p.requires_code = true
      and upper(trim(p.promo_code)) = v_code
      and (p.starts_at is null or p.starts_at <= now())
      and (p.ends_at is null or p.ends_at >= now())
      and (cardinality(p.eligible_periods) = 0 or p_duration_key = any(p.eligible_periods))
    order by p.starts_at desc nulls last, p.created_at desc
    limit 1;
  end if;
  v_has_promo := found;

  if v_has_promo then
    if v_promo.discount_type = 'percent' then
      v_discount := least(v_price, round(v_price * least(v_promo.discount_value, 100) / 100, 2));
    else
      v_discount := least(v_price, greatest(0, v_promo.discount_value));
    end if;
  end if;
  v_final := greatest(0, v_price - v_discount);

  return jsonb_build_object(
    'ok', true,
    'package_key', p_package_key,
    'duration_key', p_duration_key,
    'base_price', v_price,
    'discount', v_discount,
    'final_price', v_final,
    'promo_id', case when v_has_promo then v_promo.id else null end,
    'promo_title', case when v_has_promo then v_promo.title else null end,
    'promo_description', case when v_has_promo then v_promo.description else null end,
    'discount_type', case when v_has_promo then v_promo.discount_type else null end,
    'discount_value', case when v_has_promo then v_promo.discount_value else null end,
    'eligible_periods', case when v_has_promo then to_jsonb(v_promo.eligible_periods) else '[]'::jsonb end,
    'promo_code', case when v_has_promo then v_promo.promo_code else null end,
    'requires_code', case when v_has_promo then v_promo.requires_code else false end,
    'starts_at', case when v_has_promo then v_promo.starts_at else null end,
    'ends_at', case when v_has_promo then v_promo.ends_at else null end
  );
end;
$function$;

revoke all on function public.get_activation_quote(text, text, text) from public;
grant execute on function public.get_activation_quote(text, text, text) to anon, authenticated;

comment on function public.get_activation_quote(text, text, text) is
  'Validates package, duration, promotion schedule, voucher code, and eligible period against database rows before returning an informational activation quote.';
