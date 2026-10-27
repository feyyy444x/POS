# Bootstrap Super Admin

The `super_admins` table intentionally has no client-side insert policy. A Super Admin must be assigned by a trusted project owner through the Supabase SQL Editor.

1. Ensure the intended Super Admin email already exists in **Supabase → Authentication → Users**.
2. Open **Supabase → SQL Editor** for this project.
3. Replace `superadmin@example.com` with that exact email and run:

```sql
insert into public.super_admins (user_id)
select id
from auth.users
where lower(email) = lower('superadmin@example.com')
on conflict (user_id) do nothing;

select sa.user_id, u.email, sa.created_at
from public.super_admins sa
join auth.users u on u.id = sa.user_id
where lower(u.email) = lower('superadmin@example.com');
```

4. Sign out and sign in again in NexaPos. The account will receive the Super Admin tenant dashboard.

If the query returns no row, the email is not registered in Supabase Auth yet or does not match. Never expose the database service-role key in the browser. Do not add a client-side signup option that lets users assign themselves the Super Admin role.
