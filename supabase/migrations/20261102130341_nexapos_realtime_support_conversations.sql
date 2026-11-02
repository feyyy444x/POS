-- Keep Support Center conversation updates live for scoped owners and Admin NexaPos.
-- The table already has RLS enabled and a SELECT policy scoped to the conversation owner
-- or Super Admin; only add it to the publication after confirming the table exists.
DO $$
BEGIN
  IF to_regclass('public.support_conversations') IS NULL THEN
    RAISE EXCEPTION 'public.support_conversations is missing; cannot enable scoped realtime';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'support_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
  END IF;
END
$$;
