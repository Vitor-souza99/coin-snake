import { describe, expect, it } from "vitest";
import { AnalyticsService, FakeAnalyticsProvider, NoopAnalyticsProvider } from "../src/game/services/AnalyticsService";
import { sanitizeRunMetrics, SessionMetrics } from "../src/game/services/RunSummary";

describe("beta analytics contracts", () => {
  it("records only events explicitly sent to the offline fake provider", () => {
    const fake = new FakeAnalyticsProvider();
    fake.capture("run_started", { gameVersion: "0.9.0-beta", platform: "web_itch", worldId: "green-valley", gameMode: "standard", difficulty: "normal", orientation: "portrait", controlMode: "touch_right_handed", selectedSkin: "classic", selectedPet: null, runNumberInSession: 1 });
    expect(fake.events).toHaveLength(1);
    expect(fake.events[0]?.event).toBe("run_started");
  });

  it("gates analytics behind opt-in and configuration, and opt-out immediately silences events", async () => {
    const service = new AnalyticsService(false, false, true);
    const fake = new FakeAnalyticsProvider();
    service.setProvider(fake);
    await Promise.resolve();
    service.track("app_started", { gameVersion: "0.9.0-beta", buildChannel: "itch-web", platform: "web_itch" });
    expect(fake.events).toHaveLength(0);
    service.setConsent(true);
    await Promise.resolve();
    expect(service.isEnabled()).toBe(true);
    service.track("app_started", { gameVersion: "0.9.0-beta", buildChannel: "itch-web", platform: "web_itch" });
    expect(fake.events).toHaveLength(1);
    service.setConsent(false);
    await Promise.resolve();
    service.track("app_started", { gameVersion: "0.9.0-beta", buildChannel: "itch-web", platform: "web_itch" });
    expect(fake.events).toHaveLength(1);
  });

  it("flushes a bounded pre-init buffer only after explicit consent and provider initialization", async () => {
    const service = new AnalyticsService(false, false, true);
    const fake = new FakeAnalyticsProvider();
    let initialize!: () => void;
    let ready = false;
    const provider: import("../src/game/services/AnalyticsService").AnalyticsProvider = { initialize: () => new Promise<void>((resolve) => { initialize = () => { ready = true; resolve(); }; }), capture: (event, properties) => { if (ready) fake.capture(event, properties); } };
    service.setProvider(provider);
    service.setConsent(true);
    service.track("app_started", { gameVersion: "0.9.0-beta", buildChannel: "itch-web", platform: "web_itch" });
    expect(fake.events).toHaveLength(0);
    initialize();
    await Promise.resolve();
    expect(fake.events).toHaveLength(1);
  });

  it("reports a session summary exactly once when a run is abandoned", async () => {
    const service = new AnalyticsService(false, false, true);
    const fake = new FakeAnalyticsProvider();
    service.setProvider(fake);
    service.setConsent(true);
    await Promise.resolve();
    service.track("run_started", { gameVersion: "0.9.0-beta", platform: "web_itch", worldId: "green-valley", gameMode: "standard", difficulty: "normal", orientation: "portrait", controlMode: "touch_right_handed", selectedSkin: "classic", selectedPet: null, runNumberInSession: 1 });
    service.track("run_abandoned", { endReason: "quit", worldId: "green-valley", durationSeconds: 25 });
    service.track("run_abandoned", { endReason: "quit", worldId: "green-valley", durationSeconds: 25 });
    expect(fake.events.filter(({ event }) => event === "session_gameplay_summary")).toHaveLength(1);
  });

  it("noop provider never emits or throws", () => {
    expect(() => new NoopAnalyticsProvider().capture("app_started", { gameVersion: "0.9.0-beta", buildChannel: "dev", platform: "dev" })).not.toThrow();
  });

  it("sanitizes non-finite and negative gameplay values and never includes positions", () => {
    const clean = sanitizeRunMetrics({ elapsedSeconds: Number.NaN, score: -1, coinsCollected: 5, coinCounts: { normal: 2 }, maxCombo: 1, maxSnakeLength: 5, turboUses: 0, shrinkFruitUses: 0, magnetUses: 0, portalsEntered: 0, secretWorldsVisited: 0, bossAttempts: 0, bossWins: 0, endReason: "death", deathReason: "collision" });
    expect(clean.elapsedSeconds).toBe(0);
    expect(clean.score).toBe(0);
    expect(clean).not.toHaveProperty("x");
    expect(clean).not.toHaveProperty("position");
  });

  it("keeps run retention and boss rates separated by boss id", () => {
    const session = new SessionMetrics();
    session.recordRun(1); session.recordRun(2);
    session.recordBossAttempt("kraken"); session.recordBossAttempt("kraken"); session.recordBossWin("kraken");
    session.recordBossAttempt("king-snake");
    session.recordSkinPreview("preview-only");
    expect(session.getSecondRunRate()).toBe(0.5);
    expect(session.getBossWinRate("kraken")).toBe(0.5);
    expect(session.getBossWinRate("king-snake")).toBe(0);
    expect(session.cosmeticsUnlocked.has("preview-only")).toBe(false);
    session.recordCosmeticUnlock("earned-skin");
    expect(session.cosmeticsUnlocked.has("earned-skin")).toBe(true);
  });
});