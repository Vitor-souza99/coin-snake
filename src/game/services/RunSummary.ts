export type RunEndReason = "death" | "quit" | "restart" | "app_background_timeout" | "unknown";

export interface RunMetrics {
  elapsedSeconds: number;
  score: number;
  coinsCollected: number;
  coinCounts: Readonly<Record<string, number>>;
  maxCombo: number;
  maxSnakeLength: number;
  turboUses: number;
  shrinkFruitUses: number;
  magnetUses: number;
  portalsEntered: number;
  secretWorldsVisited: number;
  bossAttempts: number;
  bossWins: number;
  endReason: RunEndReason;
  deathReason: string;
}

export function sanitizeRunMetrics(metrics: RunMetrics): RunMetrics {
  const finite = (value: number) => Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  return {
    ...metrics,
    elapsedSeconds: finite(metrics.elapsedSeconds), score: finite(metrics.score), coinsCollected: finite(metrics.coinsCollected),
    coinCounts: Object.fromEntries(Object.entries(metrics.coinCounts).map(([kind, count]) => [kind, finite(count)])),
    maxCombo: finite(metrics.maxCombo), maxSnakeLength: finite(metrics.maxSnakeLength), turboUses: finite(metrics.turboUses),
    shrinkFruitUses: finite(metrics.shrinkFruitUses), magnetUses: finite(metrics.magnetUses), portalsEntered: finite(metrics.portalsEntered),
    secretWorldsVisited: finite(metrics.secretWorldsVisited), bossAttempts: finite(metrics.bossAttempts), bossWins: finite(metrics.bossWins),
    endReason: ["death", "quit", "restart", "app_background_timeout", "unknown"].includes(metrics.endReason) ? metrics.endReason : "unknown",
    deathReason: metrics.deathReason.slice(0, 64),
  };
}

export class SessionMetrics {
  readonly runNumbers: number[] = [];
  readonly worlds = new Set<string>();
  readonly bossesStarted = new Map<string, number>();
  readonly bossesWon = new Map<string, number>();
  readonly skinPreviews = new Map<string, number>();
  readonly cosmeticsUnlocked = new Set<string>();
  recordRun(runNumber: number) { if (Number.isFinite(runNumber) && runNumber > 0) this.runNumbers.push(Math.floor(runNumber)); }
  recordWorld(worldId: string) { this.worlds.add(worldId); }
  recordBossAttempt(bossId: string) { this.bossesStarted.set(bossId, (this.bossesStarted.get(bossId) ?? 0) + 1); }
  recordBossWin(bossId: string) { this.bossesWon.set(bossId, (this.bossesWon.get(bossId) ?? 0) + 1); }
  recordSkinPreview(skinId: string) { this.skinPreviews.set(skinId, (this.skinPreviews.get(skinId) ?? 0) + 1); }
  recordCosmeticUnlock(cosmeticId: string) { this.cosmeticsUnlocked.add(cosmeticId); }
  getSecondRunRate() { return this.runNumbers.filter((run) => run >= 2).length / Math.max(this.runNumbers.length, 1); }
  getBossWinRate(bossId: string) { return (this.bossesWon.get(bossId) ?? 0) / Math.max(this.bossesStarted.get(bossId) ?? 0, 1); }
}