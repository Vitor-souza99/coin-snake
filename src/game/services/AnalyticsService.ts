export type GameEvent = "gameStarted" | "gameEnded" | "coinCollected" | "portalEntered" | "bossDefeated" | "petUnlocked" | "skinPurchased" | "shrinkCollected" | "turboActivated" | "coinRushEnded";
/** Local no-op analytics boundary; no personal data leaves the device. */
export class AnalyticsService {
  private events: GameEvent[] = [];
  track(event: GameEvent, _properties: Record<string, string | number> = {}) {
    if (import.meta.env.DEV) this.events.push(event);
    void _properties;
  }
  getDebugEvents() { return [...this.events]; }
}
export const analytics = new AnalyticsService();