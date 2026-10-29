-- Harden the token-based public TV RPC against object shadowing.
-- Anonymous execution is intentional: the TV display is public by opaque token.
-- Keep the RPC accessible but resolve objects only through explicit schema qualification
-- and PostgreSQL's implicit pg_catalog lookup.
alter function public.get_public_tv_display(text) set search_path = '';

comment on function public.get_public_tv_display(text) is
  'Public TV display lookup by opaque public token. Anonymous execution is intentional; keep search_path empty and schema-qualify application objects.';
