# NexaPos app packaging roadmap

## Target
- Android: installable PWA first; native APK/AAB is a separate follow-up build.
- Windows desktop: Tauri 2 installer (.exe/.msi) as a follow-up.
- Preserve the existing hosted Supabase backend and multi-tenant login.

## Implemented in this branch
- Web app manifest with NexaPos branding and standalone display mode.
- Service worker caches only the app shell/static assets. It deliberately does not cache authentication, Supabase REST, Netlify Functions, or POS transaction data.
- Service worker registration is best-effort; the normal website remains usable if registration fails.

## Before distributing an installer
1. Confirm production URL and environment configuration; never embed service-role keys in client builds.
2. Add generated 192x192 and 512x512 PNG icons (current SVG mark is a temporary scalable icon).
3. Build and test PWA install on Android Chrome and desktop Chromium; test login, tenant selection, queue realtime, receipts, and updates.
4. Add Tauri 2 desktop shell on a separate step and build Windows installer in Windows CI. Set a fixed production URL only after the domain is confirmed.
5. Printer acceptance testing:
   - Browser/PWA printing: standard print dialog; Bluetooth/USB direct printing is not guaranteed.
   - Windows desktop: evaluate USB/serial ESC/POS bridge and device permissions.
   - Android Bluetooth: requires a native plugin/bridge and model-specific testing; do not claim support until tested.
6. Create signed/versioned artifacts and provide checksum/release notes. Do not point installers at preview deployments.
7. Keep app and web versions on the same backend; changes to offline caching must never cache transactional/API responses.

## Current limitations
This branch prepares the existing Vite app for installation as a PWA. It does not yet produce an APK or Windows installer. Direct Bluetooth/USB thermal printing is not implemented by the PWA layer. Those require a native wrapper, platform permissions, and physical printer testing.
