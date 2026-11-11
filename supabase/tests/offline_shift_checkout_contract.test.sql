begin;
select plan(5);

select ok(
  has_function_privilege(
    'authenticated',
    'public.complete_sale_idempotent(uuid,jsonb,numeric,text,numeric,text,boolean,uuid)',
    'EXECUTE'
  ),
  'authenticated can execute only the idempotent checkout entry point'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.complete_sale(uuid,jsonb,numeric,text,numeric,text,boolean)',
    'EXECUTE'
  ),
  'authenticated cannot execute the legacy checkout function directly'
);

select ok(
  position('cashier_shifts' in pg_get_functiondef('public.complete_sale(uuid,jsonb,numeric,text,numeric,text,boolean)'::regprocedure)) > 0,
  'authoritative checkout validates cashier shifts in the database'
);

select ok(
  position('cashier_shift_breaks' in pg_get_functiondef('public.complete_sale(uuid,jsonb,numeric,text,numeric,text,boolean)'::regprocedure)) > 0,
  'authoritative checkout validates active cashier breaks in the database'
);

select ok(
  position('auth.uid()' in pg_get_functiondef('public.complete_sale(uuid,jsonb,numeric,text,numeric,text,boolean)'::regprocedure)) > 0,
  'shift ownership is bound to the authenticated user'
);

select * from finish();
rollback;
