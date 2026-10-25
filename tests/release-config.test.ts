import { describe, expect, it } from "vitest";
import { assertBetaReleaseConfiguration } from "../src/game/config/release";

describe("beta release configuration", () => {
  it("accepts a configured web beta", () => {
    expect(() => assertBetaReleaseConfiguration({ appVersion: "0.9.0-beta", buildChannel: "itch-web", analyticsEnabled: true, posthogKeyConfigured: true, posthogHostConfigured: true, feedbackUrlConfigured: true })).not.toThrow();
  });
  it("rejects analytics enabled without provider credentials", () => {
    expect(() => assertBetaReleaseConfiguration({ appVersion: "0.9.0-beta", buildChannel: "itch-web", analyticsEnabled: true, posthogKeyConfigured: false, posthogHostConfigured: true, feedbackUrlConfigured: false })).toThrow(/PostHog/);
  });
  it("rejects accidental development or wrong-version beta releases", () => {
    expect(() => assertBetaReleaseConfiguration({ appVersion: "1.1.0", buildChannel: "dev", analyticsEnabled: false, posthogKeyConfigured: false, posthogHostConfigured: false, feedbackUrlConfigured: false })).toThrow(/channel/);
    expect(() => assertBetaReleaseConfiguration({ appVersion: "1.1.0", buildChannel: "itch-web", analyticsEnabled: false, posthogKeyConfigured: false, posthogHostConfigured: false, feedbackUrlConfigured: false })).toThrow(/version/);
  });
});