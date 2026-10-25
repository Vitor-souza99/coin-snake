import { APP_VERSION } from "../version";

export const releaseConfig = {
  appVersion: APP_VERSION,
  buildChannel: import.meta.env.VITE_BUILD_CHANNEL || (import.meta.env.DEV ? "dev" : "itch-web"),
  analyticsEnabled: import.meta.env.VITE_ANALYTICS_ENABLED === "true",
  posthogKeyConfigured: Boolean(import.meta.env.VITE_POSTHOG_KEY),
  posthogHostConfigured: Boolean(import.meta.env.VITE_POSTHOG_HOST),
  feedbackUrlConfigured: Boolean(import.meta.env.VITE_FEEDBACK_URL),
} as const;

export function assertBetaReleaseConfiguration(config: { appVersion: string; buildChannel: string; analyticsEnabled: boolean; posthogKeyConfigured: boolean; posthogHostConfigured: boolean; feedbackUrlConfigured: boolean } = releaseConfig) {
  if (config.buildChannel !== "itch-web" && config.buildChannel !== "itch-android") throw new Error(`Invalid beta build channel: ${config.buildChannel}`);
  if (config.analyticsEnabled && (!config.posthogKeyConfigured || !config.posthogHostConfigured)) throw new Error("Analytics enabled without PostHog project configuration.");
  if (!config.appVersion.startsWith("0.9.0-beta")) throw new Error(`Invalid beta version: ${config.appVersion}`);
}