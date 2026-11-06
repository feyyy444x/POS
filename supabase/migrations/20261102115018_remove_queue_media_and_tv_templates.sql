-- Retire queue media/video uploads and all configurable TV templates.
-- No media rows or storage objects existed at application time.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'tv-media') THEN
    RAISE EXCEPTION 'Bucket tv-media still contains objects; review before removal.';
  END IF;
END
$$;

DROP TRIGGER IF EXISTS store_tv_media_quota_guard ON public.store_tv_media;
DROP FUNCTION IF EXISTS public.enforce_store_tv_media_quota();
DROP TABLE IF EXISTS public.store_tv_media;

ALTER TABLE public.store_tv_settings
  DROP COLUMN IF EXISTS template,
  DROP COLUMN IF EXISTS layout_mode,
  DROP COLUMN IF EXISTS theme_mode,
  DROP COLUMN IF EXISTS primary_color,
  DROP COLUMN IF EXISTS background_color,
  DROP COLUMN IF EXISTS text_color,
  DROP COLUMN IF EXISTS queue_number_size,
  DROP COLUMN IF EXISTS customer_name_size,
  DROP COLUMN IF EXISTS counter_size,
  DROP COLUMN IF EXISTS next_queue_size,
  DROP COLUMN IF EXISTS media_volume,
  DROP COLUMN IF EXISTS announcement_volume,
  DROP COLUMN IF EXISTS voice_gender,
  DROP COLUMN IF EXISTS media_fit,
  DROP COLUMN IF EXISTS portrait_background,
  DROP COLUMN IF EXISTS rotation_seconds;

-- The empty public storage bucket is retained for deletion through the Storage API.
