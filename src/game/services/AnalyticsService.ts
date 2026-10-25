import posthog from "posthog-js";
import { APP_VERSION } from "../version";
export { APP_VERSION } from "../version";

export interface AnalyticsEventMap {
  app_started: { gameVersion: string; buildChannel: string; platform: string };
  main_menu_viewed: { gameVersion: string; platform: string };
  run_started: { gameVersion: string; platform: string; worldId: string; gameMode: string; difficulty: string; orientation: string; controlMode: string; selectedSkin: string; selectedPet: string | null; runNumberInSession: number };
  run_finished: { gameVersion: string; platform: string; mode: string; startingWorld: string; durationSeconds: number; score: number; coinsCollected: number; normalCoins: number; blueCoins: number; diamondCoins: number; goldenCoins: number; specialCoins: number; maxCombo: number; snakeMaxLength: number; turboUses: number; shrinkFruitUses: number; magnetUses: number; shieldUses: number; portalsEntered: number; secretWorldsVisited: number; bossAttempts: number; bossWins: number; deathReason: string; endReason: "death" | "quit" | "restart" | "app_background_timeout" | "unknown"; playerLevel: number; selectedSkin: string; selectedPet: string | null; runNumberInSession: number };
  run_abandoned: { endReason: "quit" | "restart" | "app_background_timeout"; worldId: string; durationSeconds: number };
  player_death: { reason: string; worldId: string; score: number; durationSeconds: number; bossId?: string };
  shrink_fruit_used: { worldId: string };
  turbo_used: { worldId: string; activationCount: number };
  tutorial_started: { tutorialId: string };
  tutorial_completed: { tutorialId: string };
  tutorial_skipped: { tutorialId: string };
  world_entered: { worldId: string; entryType: "normal_portal" | "secret_portal" | "return" };
  world_exited: { worldId: string; timeSpentSeconds: number };
  secret_portal_found: { worldId: string; runNumber: number; playerLevel: number };
  secret_world_discovered: { worldId: string; runNumber: number; playerLevel: number };
  portal_spawned: { portalType: string; destinationWorld: string; bossId?: string };
  portal_entered: { portalType: string; destinationWorld: string; bossId?: string };
  portal_ignored: { portalType: string; destinationWorld: string; bossId?: string };
  first_portal_entered: { destinationWorld: string };
  boss_started: { bossId: string; worldId: string; playerLevel: number; snakeLength: number; attemptNumber: number };
  boss_defeated: { bossId: string; worldId: string; durationSeconds: number; damageTaken: number; attemptNumber: number; rewardPetUnlocked: boolean; remainingSnakeLength: number };
  boss_failed: { bossId: string; worldId: string; durationSeconds: number; phaseReached: number; deathReason: string; attemptNumber: number };
  pet_unlocked: { petId: string; sourceBossId?: string };
  pet_equipped: { petId: string | null; sourceBossId?: string };
  skin_previewed: { skinId: string; rarity: string; unlockType: string };
  premium_skin_previewed: { skinId: string; rarity: string; unlockType: string };
  skin_unlocked: { skinId: string; rarity: string; unlockType: string };
  skin_equipped: { skinId: string; rarity: string; unlockType: string };
  shop_opened: { category: string };
  skin_purchased_with_coins: { skinId: string; coinPrice: number; balanceAfter: number };
  mission_completed: { missionId: string; missionType: string };
  control_mode_changed: { from: string; to: string };
  camera_mode_changed: { from: string; to: string };
  feedback_opened: { gameVersion: string; platform: string };
  session_gameplay_summary: { runs: number; totalPlaySeconds: number; bossAttempts: number; bossWins: number; worldsVisited: number };
}

export type AnalyticsEvent = keyof AnalyticsEventMap;
export type AnalyticsProperties<E extends AnalyticsEvent> = AnalyticsEventMap[E];
export interface AnalyticsProvider {
  initialize(): void | Promise<void>;
  capture<E extends AnalyticsEvent>(event: E, properties: AnalyticsProperties<E>): void;
  shutdown?(): void;
}

export class NoopAnalyticsProvider implements AnalyticsProvider {
  initialize() {}
  capture<E extends AnalyticsEvent>(event: E, properties: AnalyticsProperties<E>) { void event; void properties; }
}

export class PostHogAnalyticsProvider implements AnalyticsProvider {
  private initialized = false;
  private optedOut = true;
  initialize() {
    if (!import.meta.env.VITE_POSTHOG_KEY || !import.meta.env.VITE_POSTHOG_HOST) return;
    if (!this.initialized) {
      posthog.init(import.meta.env.VITE_POSTHOG_KEY, { api_host: import.meta.env.VITE_POSTHOG_HOST, autocapture: false, capture_pageview: false, capture_pageleave: false, disable_session_recording: true, person_profiles: "never", persistence: "memory", opt_out_capturing_by_default: true });
      this.initialized = true;
    }
    if (this.optedOut) { posthog.opt_in_capturing(); this.optedOut = false; }
  }
  capture<E extends AnalyticsEvent>(event: E, properties: AnalyticsProperties<E>) {
    if (this.initialized) posthog.capture(event, properties as Record<string, unknown>);
  }
  shutdown() {
    if (!this.initialized) return;
    posthog.opt_out_capturing();
    this.optedOut = true;
  }
}

export const GAME_VERSION = APP_VERSION;
export const buildChannel = import.meta.env.VITE_BUILD_CHANNEL || (import.meta.env.DEV ? "dev" : "itch-web");
export const platform = buildChannel === "itch-android" ? "android_beta" : buildChannel === "itch-web" ? "web_itch" : "dev";

export class AnalyticsService {
  private provider: AnalyticsProvider = new NoopAnalyticsProvider();
  private completedRuns = 0;
  private startedRuns = 0;
  private abandonedRuns = 0;
  private attemptedBosses = 0;
  private wonBosses = 0;
  private worldsVisited = new Set<string>();
  private consent = false;
  private enabled = false;
  private pendingConsent: boolean | undefined;
  private pendingEvents: Array<{ event: AnalyticsEvent; properties: Record<string, unknown> }> = [];
  private initializing = false;
  private providerInitialized = false;
  private sessionCompleted = false;
  private firstRunStarted = 0;
  private nextRunNumber = 1;
  constructor(private readonly development = import.meta.env.DEV, private readonly test = Boolean(import.meta.env.VITEST), private readonly configured = import.meta.env.VITE_ANALYTICS_ENABLED === "true" && Boolean(import.meta.env.VITE_POSTHOG_KEY && import.meta.env.VITE_POSTHOG_HOST)) {}
  setProvider(provider: AnalyticsProvider) { this.provider.shutdown?.(); this.providerInitialized = false; this.provider = provider; this.applyConsent(); }
  setConsent(enabled: boolean) {
    this.consent = enabled;
    this.pendingConsent = enabled;
    if (!enabled) { this.pendingEvents = []; this.sessionCompleted = false; }
    this.applyConsent();
  }
  private applyConsent() {
    this.enabled = Boolean(this.pendingConsent) && !this.development && !this.test && this.configured;
    if (this.enabled) {
      if (!this.initializing) {
        this.initializing = true;
        void Promise.resolve(this.provider.initialize()).then(() => { this.initializing = false; this.providerInitialized = true; this.flushPending(); }, () => { this.initializing = false; });
      }
    } else { this.initializing = false; this.providerInitialized = false; this.provider.shutdown?.(); }
  }
  private flushPending() {
    if (!this.enabled) return;
    const pending = this.pendingEvents.splice(0);
    for (const { event, properties } of pending) this.captureNow(event, properties);
  }
  getConsent() { return this.consent; }
  isEnabled() { return this.enabled; }
  resetSession() { this.completedRuns = 0; this.startedRuns = 0; this.abandonedRuns = 0; this.attemptedBosses = 0; this.wonBosses = 0; this.worldsVisited.clear(); this.sessionCompleted = false; this.firstRunStarted = 0; this.nextRunNumber = 1; }
  beginRun(runNumber: number) { if (this.startedRuns === 0) this.firstRunStarted = Date.now(); this.nextRunNumber = Math.max(1, Math.floor(runNumber) + 1); }
  getRunNumber() { return this.nextRunNumber; }
  track<E extends AnalyticsEvent>(event: E, properties: AnalyticsProperties<E>) {
    if (!this.enabled) {
      if (this.consent && this.pendingConsent && this.configured && !this.development && !this.test && this.pendingEvents.length < 20) this.pendingEvents.push({ event, properties: properties as Record<string, unknown> });
      return;
    }
    if (this.initializing || !this.providerInitialized) {
      if (this.pendingEvents.length < 20) this.pendingEvents.push({ event, properties: properties as Record<string, unknown> });
      return;
    }
    this.captureNow(event, properties as Record<string, unknown>);
  }
  private captureNow(event: AnalyticsEvent, properties: Record<string, unknown>) {
    if (!this.enabled) return;
    try {
      this.provider.capture(event, properties as AnalyticsProperties<typeof event>);
      if (event === "run_started") { this.startedRuns += 1; this.sessionCompleted = false; this.nextRunNumber = this.startedRuns + 1; }
      if (event === "run_abandoned") {
        this.abandonedRuns += 1;
        if (!this.sessionCompleted && this.completedRuns + this.abandonedRuns === this.startedRuns && this.startedRuns > 0) {
          this.sessionCompleted = true;
          this.provider.capture("session_gameplay_summary", { runs: this.startedRuns, totalPlaySeconds: Math.round((Date.now() - this.firstRunStarted) / 1000), bossAttempts: this.attemptedBosses, bossWins: this.wonBosses, worldsVisited: this.worldsVisited.size });
        }
      }
      if (event === "run_finished") {
        this.completedRuns += 1;
      }
      if (event === "boss_started") this.attemptedBosses += 1;
      if (event === "boss_defeated") this.wonBosses += 1;
      if (event === "world_entered") this.worldsVisited.add((properties as AnalyticsProperties<"world_entered">).worldId);
    }
    catch { /* Analytics must never interrupt gameplay. */ }
  }
}

export class FakeAnalyticsProvider implements AnalyticsProvider {
  readonly events: Array<{ event: AnalyticsEvent; properties: Record<string, unknown> }> = [];
  initialize() {}
  capture<E extends AnalyticsEvent>(event: E, properties: AnalyticsProperties<E>) { this.events.push({ event, properties: properties as Record<string, unknown> }); }
}

export const analytics = new AnalyticsService();