begin;

select plan(3);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.complete_sale(uuid,jsonb,numeric,text,numeric,text,boolean)',
    'EXECUTE'
  ),
  'authenticated cannot invoke the legacy non-idempotent checkout RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.complete_sale_idempotent(uuid,jsonb,numeric,text,numeric,text,boolean,uuid)',
    'EXECUTE'
  ),
  'authenticated can invoke the idempotent checkout RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.complete_sale_idempotent(uuid,jsonb,numeric,text,numeric,text,boolean,uuid)',
    'EXECUTE'
  ),
  'anon cannot invoke the idempotent checkout RPC'
);

select * from finish();

rollback;
