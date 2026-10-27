-- Bootstrap the explicitly designated NexaPos platform administrator.
-- Privileged access is granted only to an already-existing, email-verified account.
-- Do not attach an auth.users signup trigger here: email-only auto-provisioning can
-- grant Super Admin privileges before the intended mailbox owner has verified access.
insert into public.super_admins(user_id)
select u.id
from auth.users u
where lower(coalesce(u.email, '')) = 'ndraaaid@gmail.com'
  and u.email_confirmed_at is not null
on conflict (user_id) do nothing;

-- If the intended account is not yet verified when this migration runs, provision
-- it later through a trusted SQL/admin step after confirming the account identity.
