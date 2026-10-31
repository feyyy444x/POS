-- Repair and enforce the public yearly activation option and its prices.
-- Keep this migration idempotent for databases that already contain yearly rows.
insert into public.site_activation_durations
  (duration_key, name, duration_days, sort_order, is_active)
values ('yearly', 'Tahunan', 365, 4, true)
on conflict (duration_key) do update
set name = excluded.name,
    duration_days = excluded.duration_days,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

update public.site_activation_packages
set prices = coalesce(prices, '{}'::jsonb) || jsonb_build_object(
  'yearly',
  case package_key
    when 'starter' then 490000
    when 'growth' then 990000
    when 'business' then 1790000
    when 'enterprise' then 2990000
  end
),
updated_at = now()
where package_key in ('starter', 'growth', 'business', 'enterprise');
