-- Require a PIN-verified operational session for privileged dashboard writes.
-- Several legacy permissive RLS policies checked only the super_admins table or
-- membership role; those checks could bypass the application's PIN gate.

DROP POLICY IF EXISTS "Super Admins can delete site promotions" ON public.site_promotions;
CREATE POLICY "Super Admins can delete site promotions"
  ON public.site_promotions FOR DELETE TO authenticated
  USING (private.is_super_admin());

DROP POLICY IF EXISTS "Super Admins can insert site promotions" ON public.site_promotions;
CREATE POLICY "Super Admins can insert site promotions"
  ON public.site_promotions FOR INSERT TO authenticated
  WITH CHECK (private.is_super_admin());

DROP POLICY IF EXISTS "Super Admins can update site promotions" ON public.site_promotions;
CREATE POLICY "Super Admins can update site promotions"
  ON public.site_promotions FOR UPDATE TO authenticated
  USING (private.is_super_admin())
  WITH CHECK (private.is_super_admin());

DROP POLICY IF EXISTS "Anyone can view active site promotions" ON public.site_promotions;
CREATE POLICY "Anyone can view active site promotions"
  ON public.site_promotions FOR SELECT TO anon, authenticated
  USING (is_active = true OR private.is_super_admin());

DROP POLICY IF EXISTS "Super admins manage subscription plans" ON public.site_subscription_plans;
CREATE POLICY "Super admins manage subscription plans"
  ON public.site_subscription_plans FOR ALL TO authenticated
  USING (private.is_super_admin())
  WITH CHECK (private.is_super_admin());

DROP POLICY IF EXISTS "Super admins can insert support channels" ON public.support_channel_settings;
CREATE POLICY "Super admins can insert support channels"
  ON public.support_channel_settings FOR INSERT TO authenticated
  WITH CHECK (private.is_super_admin());

DROP POLICY IF EXISTS "Super admins can update support channels" ON public.support_channel_settings;
CREATE POLICY "Super admins can update support channels"
  ON public.support_channel_settings FOR UPDATE TO authenticated
  USING (private.is_super_admin())
  WITH CHECK (private.is_super_admin());

-- TV settings/media are private workspace controls; the public TV uses the
-- separate token-gated get_public_tv_display RPC.
DROP POLICY IF EXISTS "Store managers add TV links" ON public.store_tv_media;
CREATE POLICY "Store managers add TV links"
  ON public.store_tv_media FOR INSERT TO authenticated
  WITH CHECK (
    media_type = 'link'
    AND private.is_store_operational(store_id)
    AND EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = store_tv_media.store_id
        AND sm.user_id = (SELECT auth.uid())
        AND sm.is_active = true
        AND sm.disabled_at IS NULL
        AND sm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Store managers delete TV links" ON public.store_tv_media;
CREATE POLICY "Store managers delete TV links"
  ON public.store_tv_media FOR DELETE TO authenticated
  USING (
    media_type = 'link'
    AND private.is_store_operational(store_id)
    AND EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = store_tv_media.store_id
        AND sm.user_id = (SELECT auth.uid())
        AND sm.is_active = true
        AND sm.disabled_at IS NULL
        AND sm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Store managers read TV media" ON public.store_tv_media;
CREATE POLICY "Store managers read TV media"
  ON public.store_tv_media FOR SELECT TO authenticated
  USING (
    private.is_store_operational(store_id)
    AND EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = store_tv_media.store_id
        AND sm.user_id = (SELECT auth.uid())
        AND sm.is_active = true
        AND sm.disabled_at IS NULL
        AND sm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Store managers manage TV settings" ON public.store_tv_settings;
CREATE POLICY "Store managers manage TV settings"
  ON public.store_tv_settings FOR ALL TO authenticated
  USING (
    private.is_store_operational(store_id)
    AND EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = store_tv_settings.store_id
        AND sm.user_id = (SELECT auth.uid())
        AND sm.is_active = true
        AND sm.disabled_at IS NULL
        AND sm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    private.is_store_operational(store_id)
    AND EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = store_tv_settings.store_id
        AND sm.user_id = (SELECT auth.uid())
        AND sm.is_active = true
        AND sm.disabled_at IS NULL
        AND sm.role IN ('owner', 'admin')
    )
  );

-- Apply the PIN-verified support-chat policy on the live schema as well as the
-- branch migration, dropping legacy permissive policies because permissive RLS
-- policies combine with OR.
DROP POLICY IF EXISTS "Customers and Super Admins can read support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Customers and Super Admins can send support messages" ON public.support_messages;
DROP POLICY IF EXISTS support_messages_read_own_or_admin ON public.support_messages;
DROP POLICY IF EXISTS support_messages_insert_customer_or_admin ON public.support_messages;
DROP POLICY IF EXISTS support_messages_read_pin_verified ON public.support_messages;
DROP POLICY IF EXISTS support_messages_insert_pin_verified ON public.support_messages;

REVOKE ALL ON public.support_messages FROM anon, PUBLIC;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;

CREATE POLICY support_messages_read_pin_verified
  ON public.support_messages FOR SELECT TO authenticated
  USING (
    private.is_pin_verified()
    AND (user_id = (SELECT auth.uid()) OR private.is_super_admin())
  );

CREATE POLICY support_messages_insert_pin_verified
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    private.is_pin_verified()
    AND sender_id = (SELECT auth.uid())
    AND (
      (sender_role = 'customer' AND user_id = (SELECT auth.uid()))
      OR (sender_role = 'support' AND private.is_super_admin())
    )
  );

NOTIFY pgrst, 'reload schema';
