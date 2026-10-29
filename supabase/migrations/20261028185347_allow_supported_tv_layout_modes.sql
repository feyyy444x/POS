-- Keep the TV layout constraint aligned with every layout exposed by TvDisplaySettings.
-- Legacy values remain accepted so existing tenant settings can be read and normalized.
ALTER TABLE public.store_tv_settings
  DROP CONSTRAINT IF EXISTS store_tv_settings_layout_mode_check;

ALTER TABLE public.store_tv_settings
  ADD CONSTRAINT store_tv_settings_layout_mode_check
  CHECK (
    layout_mode = ANY (
      ARRAY[
        'split-left',
        'media-top',
        'media-bottom',
        'media-fullscreen',
        'alternate',
        'queue-only',
        'queue-grid',
        'overlay',
        'carousel',
        'smart-loop'
      ]::text[]
    )
  );
