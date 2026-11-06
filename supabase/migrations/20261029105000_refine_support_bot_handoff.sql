-- Improve the zero-cost support bot's greeting and direct human-support handoff.
UPDATE public.support_knowledge_base
SET keywords = array_remove(keywords, 'tidak bisa'), updated_at = now()
WHERE category = 'gangguan';

INSERT INTO public.support_knowledge_base (category, question, answer, keywords, priority)
VALUES ('umum','Sapaan awal','Halo! Saya bot bantuan NexaPos. Saya bisa membantu pertanyaan seputar akun, aktivasi, kasir, produk, struk, antrean, dan penggunaan NexaPos. Jika membutuhkan petugas, tulis “komplain” atau tekan tombol Hubungi Admin NexaPos.',ARRAY['halo','hai','hello','selamat pagi','selamat siang','selamat sore','selamat malam'],3)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.submit_support_message(p_message text, p_display_identity text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_message text := trim(coalesce(p_message, ''));
  v_email text := '';
  v_is_anonymous boolean := COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false);
  v_status text;
  v_answer text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Silakan masuk untuk menggunakan live chat'; END IF;
  IF char_length(v_message) < 1 OR char_length(v_message) > 3000 THEN
    RAISE EXCEPTION 'Pesan harus berisi 1–3000 karakter';
  END IF;
  IF NOT v_is_anonymous AND NOT private.is_pin_verified() THEN
    RAISE EXCEPTION 'Verifikasi PIN terlebih dahulu untuk mengirim pesan';
  END IF;
  IF (SELECT count(*) FROM public.support_messages
      WHERE user_id = v_user_id AND sender_role = 'customer'
        AND created_at > now() - interval '1 hour') >= 40 THEN
    RAISE EXCEPTION 'Batas pesan sementara tercapai. Coba lagi nanti atau hubungi Admin.';
  END IF;

  SELECT coalesce(nullif(trim(p_display_identity), ''), u.email, nullif(u.raw_user_meta_data ->> 'email', ''), '')
    INTO v_email FROM auth.users u WHERE u.id = v_user_id;

  INSERT INTO public.support_conversations(user_id, status, updated_at, last_message_at)
  VALUES (v_user_id, 'ai_active', now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT c.status INTO v_status
    FROM public.support_conversations c WHERE c.user_id = v_user_id FOR UPDATE;
  IF v_status = 'resolved' THEN
    UPDATE public.support_conversations
      SET status = 'ai_active', updated_at = now(), last_message_at = now()
      WHERE user_id = v_user_id;
    v_status := 'ai_active';
  END IF;

  INSERT INTO public.support_messages(user_id, sender_id, user_email, sender_role, message)
  VALUES (v_user_id, v_user_id, v_email, 'customer', v_message);

  UPDATE public.support_conversations SET updated_at = now(), last_message_at = now()
    WHERE user_id = v_user_id;

  IF v_status IN ('waiting_admin', 'admin_active') THEN
    RETURN jsonb_build_object('status', v_status, 'bot_replied', false);
  END IF;

  IF lower(v_message) ~ '(komplain|keluhan|hubungi admin|bicara dengan admin|bicara admin|petugas nexapos|admin manusia|customer service|cs nexapos)' THEN
    UPDATE public.support_conversations
      SET status = 'waiting_admin', updated_at = now(), last_message_at = now()
      WHERE user_id = v_user_id;
    INSERT INTO public.support_messages(user_id, sender_id, user_email, sender_role, message)
    VALUES (v_user_id, v_user_id, v_email, 'bot',
      'Baik, saya teruskan percakapan ini ke Admin NexaPos. Bot berhenti menjawab otomatis sementara petugas menangani chat ini.');
    RETURN jsonb_build_object('status', 'waiting_admin', 'bot_replied', true, 'handoff', true);
  END IF;

  SELECT k.answer INTO v_answer
  FROM public.support_knowledge_base k
  WHERE k.is_active
    AND EXISTS (
      SELECT 1 FROM unnest(k.keywords) AS kw
      WHERE char_length(kw) >= 3 AND position(lower(kw) in lower(v_message)) > 0
    )
  ORDER BY (
    SELECT max(char_length(kw)) FROM unnest(k.keywords) AS kw
    WHERE char_length(kw) >= 3 AND position(lower(kw) in lower(v_message)) > 0
  ) DESC, k.priority DESC, k.id
  LIMIT 1;

  IF v_answer IS NULL THEN
    v_answer := 'Maaf, saya belum memiliki jawaban terverifikasi untuk pertanyaan tersebut. Agar tidak memberikan informasi yang keliru, silakan jelaskan kendalanya lebih spesifik atau tekan “Hubungi Admin NexaPos” untuk dibantu petugas.';
  END IF;

  INSERT INTO public.support_messages(user_id, sender_id, user_email, sender_role, message)
  VALUES (v_user_id, v_user_id, v_email, 'bot', v_answer);
  UPDATE public.support_conversations SET updated_at = now(), last_message_at = now()
    WHERE user_id = v_user_id;
  RETURN jsonb_build_object('status', v_status, 'bot_replied', true);
END;
$function$;
