-- Keep all support RPCs unavailable to the unauthenticated anon role.
-- Anonymous live-chat sessions use Supabase's authenticated role and are still validated
-- inside each function before any write occurs.
REVOKE ALL ON FUNCTION public.submit_support_message(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_support_handoff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reply_support_message(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_support_conversation_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_support_message(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_support_handoff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reply_support_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_support_conversation_status(uuid, text) TO authenticated;
