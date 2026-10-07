export const controls = {
  joystickRadius: 54,
  deadZone: 9,
  smoothing: 24,
  turnSpeed: 6.2,
  turboTurnMultiplier: 0.84,
  lookAhead: 82,
  turboLookAhead: 140,
  cameraSmoothing: 7,
  minZoom: 0.65,
  maxZoom: 1.3,
} as const;
export const turboConfig = {
  capacity: 100,
  drain: 24,
  regeneration: 11,
  regenerationDelay: 0.6,
  restartEnergy: 15,
  multiplier: 1.4, // Must match B.power.turboSpeed: manual and pickup Turbo share speed.
  coinCharge: { normal: 1, blue: 3, diamond: 8, golden: 15, mythic: 30, candy_coin: 15, pearl_coin: 15 },
} as const;
export const shrinkConfig = {
  fraction: 0.25,
  minimum: 5,
  lifetime: 10,
  cooldownMin: 20,
  cooldownMax: 35,
  minimumSpawnLength: 8,
} as const;
