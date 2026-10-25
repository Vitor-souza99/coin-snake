# Public beta on itch.io

1. Create a project page on itch.io and keep visibility **Draft/Restricted** while testing.
2. Choose **Kind of project = HTML**.
3. Run `npm run release:web`; upload `release/0.9.0-beta/coin-snake-web-0.9.0-beta.zip` as the browser build. The ZIP must contain `index.html` directly at its root.
4. Enable **This file will be played in the browser** / HTML5.
5. Test the embedded frame and fullscreen mode on desktop browsers.
6. Mark **Mobile Friendly** only after testing touch controls on actual mobile browsers.
7. Add the signed APK as a separate Android download, not as the HTML5 browser artifact.
8. Keep status **In Development** during beta. Test restricted access and both builds before publishing.
9. When ready, change visibility to **Public** manually.

The release script currently packages the Web build only. Export Android separately in Android Studio as documented in `ITCH_ANDROID_RELEASE.md` and upload the signed APK as a second downloadable file.

Publishing is deliberately manual. No itch.io password, API token, or Butler credential is stored in the repository. Butler may be evaluated for future releases but is not configured for this beta.