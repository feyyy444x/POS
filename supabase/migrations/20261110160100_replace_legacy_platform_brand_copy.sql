-- Replace retired product branding only in platform-managed catalogue/help copy.
-- Customer-owned company, tenant, transaction and historical conversation data is preserved.
CREATE OR REPLACE FUNCTION pg_temp.acopos_brand_copy(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(
    regexp_replace(
      regexp_replace(value, 'NexaSpace', 'Pusat Kendali Perusahaan', 'gi'),
      'NexaBot', 'Joeclyn', 'gi'
    ),
    '(NexaPos|ChillPos)', 'acoPos', 'gi'
  );
$$;

UPDATE public.site_activation_packages
SET features = CASE
  WHEN features IS NULL THEN NULL
  ELSE ARRAY(
    SELECT pg_temp.acopos_brand_copy(feature)
    FROM unnest(features) WITH ORDINALITY AS item(feature, position)
    ORDER BY position
  )
END;

UPDATE public.site_subscription_plans
SET features = CASE
  WHEN features IS NULL THEN NULL
  ELSE ARRAY(
    SELECT pg_temp.acopos_brand_copy(feature)
    FROM unnest(features) WITH ORDINALITY AS item(feature, position)
    ORDER BY position
  )
END;

UPDATE public.support_knowledge_base
SET category = pg_temp.acopos_brand_copy(category),
    question = pg_temp.acopos_brand_copy(question),
    answer = pg_temp.acopos_brand_copy(answer),
    keywords = CASE
      WHEN keywords IS NULL THEN NULL
      ELSE ARRAY(
        SELECT pg_temp.acopos_brand_copy(keyword)
        FROM unnest(keywords) WITH ORDINALITY AS item(keyword, position)
        ORDER BY position
      )
    END
WHERE concat_ws(' ', category, question, answer, array_to_string(keywords, ' '))
  ~* '(nexapos|nexa|chillpos)';
