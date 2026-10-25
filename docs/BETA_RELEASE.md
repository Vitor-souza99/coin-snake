# Coin Snake 0.9.0-beta release checklist

1. Confirm `npm ci` and review `git status`; preserve unrelated work.
2. Supply external beta project configuration locally: `VITE_BUILD_CHANNEL=itch-web`, `VITE_ANALYTICS_ENABLED=true`, PostHog key/host only if approved, plus HTTPS feedback and privacy URLs. Otherwise keep analytics disabled and note those services are unavailable.
3. Run `npm run release:web`; it performs typecheck, tests, lint and build, verifies relative asset paths, and validates every dist entry plus root-level `index.html` in the ZIP. Review `release.json` and SHA-256.
4. Preview locally with `npm run preview`; test the actual itch iframe/fullscreen/touch on target devices.
5. Separately sync/build/sign Android in Android Studio using `ITCH_ANDROID_RELEASE.md`; test the signed APK.
6. Upload Web ZIP and Android APK as separate artifacts in a restricted itch project; confirm downloads and embedded game before public launch.
7. Check event definitions in PostHog with a consented test profile only. Test default-off, opt-in, opt-out and no transmission while off. Do not collect test events from real players until privacy and service configuration are reviewed.
8. Keep a copy of the exact artifacts, manifest/hash, tested devices, known issues and rollback build. Publishing/visibility changes remain manual.