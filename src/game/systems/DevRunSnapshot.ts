import type { CoinKind } from "../data/balance";
import { B } from "../data/balance";
import type { GameDifficulty, RunState } from "../types/game";

const KEY = "coin-snake:dev-run:v2";
const VERSION = 2;
const difficulties: GameDifficulty[] = ["easy", "normal", "hard"];
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export interface DevRunSnapshot {
  version: number;
  savedAt: number;
  world: string;
  run: RunState;
  snake: { x: number; y: number; angle: number; length: number };
  lives: number;
  combo: { value: number; remaining: number; max: number };
  turbo: { energy: number; exhausted: boolean; activations: number };
  powers: {
    magnet: number; turbo: number; precision: number; luckyStar: number;
    ghost: number; shield: boolean; invincible: number; slowed: number;
  };
  coins: Array<{ x: number; y: number; kind: string }>;
}

export function validateDevRunSnapshot(value: unknown): value is DevRunSnapshot {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<DevRunSnapshot>;
  if (s.version !== VERSION || !finite(s.savedAt) || typeof s.world !== "string") return false;
  if (!s.run || typeof s.run !== "object" || typeof s.run.id !== "string" || !s.run.id ||
      s.run.finished !== false || !difficulties.includes(s.run.gameDifficulty) ||
      !["score", "matchCoins", "maxCombo", "elapsed", "powerups", "shrinkFruits", "turboUses", "golden", "magnet", "creditedCoins", "bossEnergy", "bossCoins", "coinXP", "bossCoinXP", "coinXPCredited", "bossCoinXPCredited", "portalsUsed", "bossDefeats", "rushRemaining"].every((key) => finite((s.run as unknown as Record<string, unknown>)[key]))) return false;
  if (!s.snake || ![s.snake.x, s.snake.y, s.snake.angle, s.snake.length].every(finite) || s.snake.length < 1 || s.snake.length > B.snake.max) return false;
  if (!finite(s.lives) || s.lives < 0 || s.lives > B.power.maxLives) return false;
  if (!s.combo || ![s.combo.value, s.combo.remaining, s.combo.max].every(finite)) return false;
  if (!s.turbo || !finite(s.turbo.energy) || !finite(s.turbo.activations) || typeof s.turbo.exhausted !== "boolean") return false;
  if (!s.powers || ![s.powers.magnet, s.powers.turbo, s.powers.precision, s.powers.luckyStar, s.powers.ghost, s.powers.invincible, s.powers.slowed].every(finite) || typeof s.powers.shield !== "boolean") return false;
  if (!Array.isArray(s.coins) || s.coins.length > B.difficulty.maxCoins || s.coins.some((coin) => !coin || !finite(coin.x) || !finite(coin.y) || typeof coin.kind !== "string" || !B.coins.some((kind) => kind.id === coin.kind))) return false;
  const r = s.run as RunState;
  return typeof r.missionDate === "string" && typeof r.rushMode === "boolean" && typeof r.revived === "boolean" &&
    typeof r.missionFinalized === "boolean" && !!r.reported && [r.reported.coins, r.reported.powerups, r.reported.golden, r.reported.magnet].every(finite);
}

export function loadDevRunSnapshot(enabled: boolean): DevRunSnapshot | undefined {
  if (!enabled || typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (validateDevRunSnapshot(parsed)) return parsed;
  } catch { /* Ignore inaccessible storage and malformed JSON. */ }
  clearDevRunSnapshot(enabled);
  return undefined;
}

export function saveDevRunSnapshot(enabled: boolean, snapshot: Omit<DevRunSnapshot, "version" | "savedAt">) {
  if (!enabled || typeof localStorage === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify({ ...snapshot, version: VERSION, savedAt: Date.now() })); }
  catch { /* Development persistence must never interrupt gameplay. */ }
}

export function clearDevRunSnapshot(enabled: boolean) {
  if (!enabled || typeof localStorage === "undefined") return;
  try { localStorage.removeItem(KEY); } catch { /* Ignore inaccessible storage. */ }
}

export function isCoinKindId(id: string): id is CoinKind["id"] {
  return B.coins.some((kind) => kind.id === id);
}