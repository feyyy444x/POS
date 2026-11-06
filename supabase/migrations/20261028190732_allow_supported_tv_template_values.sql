-- Keep TV template constraint aligned with all templates supported by TvDisplaySettings.
ALTER TABLE public.store_tv_settings
  DROP CONSTRAINT IF EXISTS store_tv_settings_template_check;

ALTER TABLE public.store_tv_settings
  ADD CONSTRAINT store_tv_settings_template_check
  CHECK (
    template = ANY (
      ARRAY[
        'modern-blue',
        'minimal-light',
        'premium-dark',
        'queue-media',
        'professional',
        'nexa-cinema',
        'nexa-showcase',
        'nexa-queue',
        'nexa-grid',
        'nexa-overlay',
        'nexa-carousel',
        'nexa-smart-loop'
      ]::text[]
    )
  );
