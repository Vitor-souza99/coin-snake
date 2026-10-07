import { shrinkConfig as S } from "../data/controls";
export const shrunkLength = (length: number) =>
  Math.max(S.minimum, Math.floor(length * (1 - S.fraction)));
export const shrinkCooldown = (rng = Math.random) =>
  S.cooldownMin + rng() * (S.cooldownMax - S.cooldownMin);
