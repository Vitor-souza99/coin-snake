# Android — Coin Snake Beta 0.9.0

1. Configure `.env.local` with `VITE_BUILD_CHANNEL=itch-android`. To enable optional remote analytics, separately configure `VITE_ANALYTICS_ENABLED=true` and the beta PostHog project key/host. Consent still defaults to off in game Settings. Do not commit environment or signing credentials.
2. From the repository root run:

   ```sh
   npm run build
   npx cap sync android
   npx cap open android
   ```

3. In Android Studio select **Build → Generate Signed App Bundle / APK → APK → release**.
4. Select an existing keystore or create one locally in Android Studio, enter credentials in its protected prompts, then generate the APK.
5. The likely output directory is `android/app/build/outputs/apk/release/`. Copy the signed APK manually to `release/0.9.0-beta/coin-snake-android-0.9.0-beta.apk` for distribution.

Never commit `.jks`, `.keystore`, `key.properties`, passwords, or credentials. The Android release build and physical-device QA must be completed in Android Studio/on target devices; `cap sync` alone does not produce or validate a signed APK.