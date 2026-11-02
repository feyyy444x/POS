-- Cover newly introduced package/activation foreign keys with indexes.
create index if not exists owner_organizations_activation_package_key_idx
  on public.owner_organizations (activation_package_key);
create index if not exists site_activation_durations_updated_by_idx
  on public.site_activation_durations (updated_by);
create index if not exists site_activation_packages_updated_by_idx
  on public.site_activation_packages (updated_by);
create index if not exists stores_activation_package_key_idx
  on public.stores (activation_package_key);
