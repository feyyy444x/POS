-- Set the standard 365-day activation prices for every public package.
-- This updates existing rows as well as rows seeded by earlier migrations.
update public.site_activation_packages
set prices = jsonb_set(
  coalesce(prices, '{}'::jsonb),
  '{yearly}',
  case package_key
    when 'starter' then to_jsonb(490000)
    when 'growth' then to_jsonb(990000)
    when 'business' then to_jsonb(1790000)
    when 'enterprise' then to_jsonb(2990000)
  end,
  true
),
updated_at = now()
where package_key in ('starter', 'growth', 'business', 'enterprise');

-- Ensure the public 365-day duration remains available for homepage selection.
insert into public.site_activation_durations
  (duration_key, name, duration_days, sort_order, is_active)
values ('yearly', 'Tahunan', 365, 4, true)
on conflict (duration_key) do update
set name = excluded.name,
    duration_days = excluded.duration_days,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();
