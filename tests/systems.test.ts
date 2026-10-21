import { describe, it, expect, vi } from "vitest";
import {
  defaults,
  validateSave,
  SaveSystem,
} from "../src/game/systems/SaveSystem";
import {
  buySkin,
  buyPet,
  addXP,
  creditBossCoins,
  claimShopReward,
  SHOP_REWARDED_COINS,
  creditCoins,
  coinCollectionXP,
  bossCoinCollectionXP,
  finishRun,
} from "../src/game/systems/EconomySystem";
import { ComboSystem } from "../src/game/systems/ComboSystem";
import {
  ensureDay,
  reportRun,
  startMissionRun,
  updateMissionDay,
} from "../src/game/systems/MissionSystem";
import { PowerUpSystem } from "../src/game/systems/PowerUpSystem";
import { dragonAttackCooldown, dragonAttackDuration, dragonBossDamage, dragonCanDamageBoss } from "../src/game/systems/DragonPetSystem";
import { attractSpiderlingCoin, spiderlingCoinRadius, spiderlingCoinSpeed } from "../src/game/systems/SpiderlingSystem";
import { bossAttackTiming, bossDifficultyProfile, bossMovementSpeed, candyTelegraphTiming, difficulty, difficultyProfiles, powerUpSpawnInterval } from "../src/game/systems/DifficultySystem";
import { Snake } from "../src/game/entities/Snake";
import { candyCoinSpawnAllowed, candyFinalSpeed, candyObstacleSafe, candyWorldConfig, inCandyRiver, stickySpeedMultiplier } from "../src/game/data/candyWorld";
import { oceanCurrentZones, currentForceAt, oceanMovement, isSafeOceanSpawn, pearlCoinSpawnAllowed, deepTrenchCoinChance, containKrakenArenaPoint, isOutsideKrakenArena, krakenAttackTarget, krakenHitZone, oceanWorldConfig, oceanRegions } from "../src/game/data/oceanWorld";
import { containDesertArenaPoint, blockDesertArenaCrossing, isDesertArenaPickupAccessible, desertGustAt, desertGusts, desertRouteGustAt, desertRegions, desertRouteAt, desertRareCoinSpots, inDesertOasis } from "../src/game/data/desertWorld";
import { B, candyWorldCoinWeights } from "../src/game/data/balance";
import { dailyMissions, missions } from "../src/game/data/missions";
import { levelForXP, totalXPForLevel, xpForNextLevel, xpProgressForLevel } from "../src/game/systems/ExperienceSystem";
import { newRun } from "../src/game/types/game";
import { PortalSystem } from "../src/game/systems/PortalSystem";
import { activateCandyAura, BossCombatSystem, bossAuraPickupKind, bossUsesTimedCoins, regularCoinAuraCharge, resolveCandyAuraHit } from "../src/game/systems/BossCombatSystem";
import { eligiblePortalWorlds, reconcileWorldUnlocks, rememberWorld, traversableWorlds, weightedWorldChoice, worldRequirementText, worldStatus } from "../src/game/systems/WorldSystem";
import { worldById, worlds } from "../src/game/data/worlds";
import { bosses } from "../src/game/data/bosses";
import { earnablePetIds, pets } from "../src/game/data/pets";
import { awardAchievement, achievementDefinitions } from "../src/game/systems/AchievementSystem";
import { logoLayout } from "../src/game/ui/LogoLayout";
import { getSkin, getSkinPreviewConfig, isSkinRarity, isSkinUnlockType, isMysterySkin, skinMysteryClues, skinRarities, skins, skinsByFamily, skinUnlockStatus } from "../src/game/data/skins";
import { purchases } from "../src/game/services/PurchaseService";
import { clearDevRunSnapshot, loadDevRunSnapshot, saveDevRunSnapshot, validateDevRunSnapshot } from "../src/game/systems/DevRunSnapshot";

describe("development run snapshots", () => {
  const freshSnapshot = () => {
    const run = newRun();
    return {
      world: "green-valley", run,
      snake: { x: 360, y: 690, angle: -Math.PI / 2, length: B.snake.initial },
      lives: B.power.initialLives,
      combo: { value: 1, remaining: 0, max: 1 },
      turbo: { energy: 100, exhausted: false, activations: 0 },
      powers: { magnet: 0, turbo: 0, precision: 0, luckyStar: 0, ghost: 0, shield: false, invincible: 0, slowed: 0 },
      coins: [{ x: 500, y: 400, kind: "normal" }],
    };
  };

  it("saves and restores a valid development snapshot", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    try {
      saveDevRunSnapshot(true, freshSnapshot());
      const restored = loadDevRunSnapshot(true);
      expect(restored).toMatchObject({ version: 2, world: "green-valley", run: { score: 0 }, coins: [{ kind: "normal" }] });
      expect(validateDevRunSnapshot(restored)).toBe(true);
      clearDevRunSnapshot(true);
      expect(loadDevRunSnapshot(true)).toBeUndefined();
    } finally { vi.unstubAllGlobals(); }
  });

  it("rejects malformed snapshots and never accesses storage when disabled", () => {
    expect(validateDevRunSnapshot({ version: 1 })).toBe(false);
    const getItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem });
    try {
      expect(loadDevRunSnapshot(false)).toBeUndefined();
      saveDevRunSnapshot(false, freshSnapshot());
      clearDevRunSnapshot(false);
      expect(getItem).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
});
describe("Spiderling coin assistance", () => {
  it("attracts nearby common coins toward the snake at a capped speed", () => {
    const coin = { x: 100, y: 0, kind: { id: "normal" } };
    expect(attractSpiderlingCoin(coin, { x: 0, y: 0 }, 0.25)).toBe(true);
    expect(coin.x).toBe(100 - spiderlingCoinSpeed * 0.25);
    expect(coin.y).toBe(0);
  });

  it("does not attract distant, special, stationary, or invalid-step coins", () => {
    for (const id of ["mythic", "candy_coin", "pearl_coin"]) {
      const coin = { x: 10, y: 0, kind: { id } };
      expect(attractSpiderlingCoin(coin, { x: 0, y: 0 }, 1)).toBe(false);
      expect(coin.x).toBe(10);
    }
    const distant = { x: spiderlingCoinRadius + 1, y: 0, kind: { id: "normal" } };
    expect(attractSpiderlingCoin(distant, { x: 0, y: 0 }, 1)).toBe(false);
    expect(attractSpiderlingCoin({ x: 10, y: 0, kind: { id: "normal" } }, { x: 0, y: 0 }, 0)).toBe(false);
  });

  it("advertises the Spiderling's coin-attraction ability", () => {
    expect(pets.find((pet) => pet.id === "spiderling")?.description).toContain("atrai moedas comuns");
  });
});
import {
  distance,
  weighted,
  turnToward,
  localDay,
} from "../src/game/utils/math";
describe("economy", () => {
  it("resets the snake at a portal with the destination heading and aligned body trail", () => {
    const snake = new Snake();
    snake.length = 6;
    snake.reset(120, 240, 0);
    expect(snake.x).toBe(120);
    expect(snake.y).toBe(240);
    expect(snake.angle).toBe(0);
    expect(snake.body[0]).toEqual({ x: 120, y: 240 });
    expect(snake.body[1].x).toBeLessThan(snake.body[0].x);
    expect(snake.body.slice(0, snake.length).every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
  });
  it("uses the progressive XP curve and derives progress from total XP", () => {
    expect([xpForNextLevel(1), xpForNextLevel(2), xpForNextLevel(3), xpForNextLevel(4)]).toEqual([175, 250, 325, 400]);
    expect(totalXPForLevel(5)).toBe(1150);
    expect(levelForXP(174)).toBe(1);
    expect(levelForXP(175)).toBe(2);
    expect(levelForXP(1149)).toBe(4);
    expect(levelForXP(1150)).toBe(5);
    expect(xpProgressForLevel(500)).toEqual({ current: 75, required: 325 });
  });
  it("preserves accumulated XP while advancing levels", () => {
    const profile = defaults();
    addXP(profile, 1149);
    expect(profile.xp).toBe(1149);
    expect(profile.playerLevel).toBe(4);
    addXP(profile, 1);
    expect(profile.xp).toBe(1150);
    expect(profile.playerLevel).toBe(5);
  });
  it("buys each new coin skin once and keeps existing balances/prices unchanged", () => {
    const profile = defaults();
    profile.totalCoins = 16_000;
    for (const id of ["sakura", "storm", "magma", "prism"]) expect(buySkin(profile, id)).toBe(true);
    expect(profile.totalCoins).toBe(0);
    expect(profile.unlockedSkins).toEqual(expect.arrayContaining(["sakura", "storm", "magma", "prism"]));
    expect(skins.find((skin) => skin.id === "cat")?.coinPrice).toBe(500);
  });
  it("grants the shop rewarded-ad coins once per local day", () => {
    const profile = defaults();
    expect(claimShopReward(profile, "2026-10-08")).toBe(true);
    expect(profile.totalCoins).toBe(SHOP_REWARDED_COINS);
    expect(claimShopReward(profile, "2026-10-08")).toBe(false);
    expect(profile.totalCoins).toBe(SHOP_REWARDED_COINS);
    expect(claimShopReward(profile, "2026-10-09")).toBe(true);
  });
  it("rejects insufficient funds and unknown skins", () => {
    const p = defaults();
    expect(buySkin(p, "cat")).toBe(false);
    expect(buySkin(p, "bad")).toBe(false);
    expect(p.totalCoins).toBe(0);
  });
  it("unlocks the firefly offer after King Snake and buys it with 50 Boss Coins", () => {
    const profile = defaults();
    profile.bossesDefeated.push("king-snake");
    const unlocked = validateSave({ saveVersion: 10, bossesDefeated: ["king-snake"] });
    expect(unlocked.availablePets).toContain("firefly");
    expect(unlocked.unlockedPets).not.toContain("firefly");
    expect(buyPet(unlocked, "firefly")).toBe(false);
    expect(unlocked.bossCoinBalance).toBe(0);
    unlocked.bossCoinBalance = 49;
    expect(buyPet(unlocked, "firefly")).toBe(false);
    unlocked.bossCoinBalance = 50;
    expect(buyPet(unlocked, "firefly")).toBe(true);
    expect(unlocked.bossCoinBalance).toBe(0);
    expect(unlocked.selectedPet).toBe("firefly");
    expect(buyPet(unlocked, "firefly")).toBe(true);
    expect(unlocked.bossCoinBalance).toBe(0);
  });
  it("buys Candy Blob for 50 Boss Coins and credits boss coin drops persistently", () => {
    const profile = validateSave({ saveVersion: 10, bossesDefeated: ["candy-monster"] });
    expect(profile.availablePets).toContain("candy-blob");
    expect(profile.unlockedPets).toContain("bee");
    expect(profile.unlockedPets).not.toContain("candy-blob");
    creditBossCoins(profile, 40);
    expect(profile.bossCoinBalance).toBe(40);
    expect(buyPet(profile, "candy-blob")).toBe(false);
    creditBossCoins(profile, 10);
    expect(buyPet(profile, "candy-blob")).toBe(true);
    expect(profile.bossCoinBalance).toBe(0);
  });
  it("uses combat Boss Coins for both aura charge and the persistent shop balance", () => {
    const profile = defaults();
    const combat = new BossCombatSystem();
    combat.addCharge(bosses[0].combat.attackChargePerBossCoin);
    creditBossCoins(profile, 1);
    expect(combat.attackCharge).toBe(25);
    expect(profile.bossCoinBalance).toBe(1);
  });
  it("keeps premium skins unpurchasable and unequippable even with abundant Coins", () => {
    const p = defaults();
    p.totalCoins = 999_999;
    expect(buySkin(p, "fire-dragon")).toBe(false);
    expect(buySkin(p, "ancient-dragon")).toBe(false);
    expect(p.totalCoins).toBe(999_999);
    expect(p.selectedSkin).toBe("classic");
    expect(p.unlockedSkins).not.toContain("fire-dragon");
  });
  it("purchases once and selects unlocked skin for free", () => {
    const p = defaults();
    p.totalCoins = 550;
    expect(buySkin(p, "cat")).toBe(true);
    expect(p.totalCoins).toBe(50);
    buySkin(p, "classic");
    buySkin(p, "cat");
    expect(p.totalCoins).toBe(50);
    expect(p.selectedSkin).toBe("cat");
  });
  it("credits only new coins after revive and finalizes once", () => {
    const p = defaults(),
      r = newRun();
    r.matchCoins = 25;
    r.score = 300;
    creditCoins(p, r);
    creditCoins(p, r);
    expect(p.totalCoins).toBe(25);
    r.matchCoins = 40;
    r.score = 500;
    creditCoins(p, r);
    finishRun(p, r);
    finishRun(p, r);
    expect(p.totalCoins).toBe(40);
    expect(p.statistics.totalGames).toBe(1);
    expect(p.statistics.totalCoinsCollected).toBe(40);
    expect(p.xp).toBe(50);
    expect(p.bestScore).toBe(500);
  });
  it("awards coin XP by coin value and diminishing Boss Coin XP without a cap", () => {
    expect([1, 5, 20, 50, 100].map(coinCollectionXP)).toEqual([1, 5, 20, 50, 100]);
    expect(bossCoinCollectionXP(0)).toBe(5);
    expect(bossCoinCollectionXP(9)).toBe(5);
    expect(bossCoinCollectionXP(10)).toBe(2);
    expect(bossCoinCollectionXP(0, 12)).toBe(54);
    const p = defaults(), run = newRun();
    run.coinXP = 126;
    run.bossCoinXP = 54;
    run.coinXPCredited = 126;
    run.bossCoinXPCredited = 54;
    finishRun(p, run);
    expect(p.xp).toBe(B.xp.perRun);
  });
  it("does not credit collected coin XP twice when a run finishes", () => {
    const p = defaults(), run = newRun();
    const firstCoinXP = coinCollectionXP(5);
    run.coinXP += firstCoinXP;
    addXP(p, firstCoinXP);
    run.coinXPCredited = run.coinXP;
    const firstBossCoinXP = bossCoinCollectionXP(run.bossCoins);
    run.bossCoins++;
    run.bossCoinXP += firstBossCoinXP;
    addXP(p, firstBossCoinXP);
    run.bossCoinXPCredited = run.bossCoinXP;
    const secondCoinXP = coinCollectionXP(20);
    run.coinXP += secondCoinXP;
    addXP(p, secondCoinXP);
    run.coinXPCredited = run.coinXP;
    finishRun(p, run);
    expect(p.xp).toBe(B.xp.perRun + 30);
  });
  it("applies Candy Blob XP only to the run XP, not coins", () => {
    const p = defaults(), r = newRun();
    p.selectedPet = "candy-blob";
    r.score = 200;
    r.matchCoins = 17;
    finishRun(p, r);
    expect(p.xp).toBe(37);
    expect(p.totalCoins).toBe(17);
  });
  it("applies the celestial serpent's ten-percent run XP bonus", () => {
    const p = defaults(), r = newRun();
    p.selectedPet = "celestial-serpent";
    r.score = 200;
    finishRun(p, r);
    expect(p.xp).toBe(39);
  });
});
describe("boss entry hints", () => {
  it("scales Candy's attack warning to snake speed while keeping it readable", () => {
    const slow = candyTelegraphTiming(0.8, 80, 64);
    const normal = candyTelegraphTiming(0.8, 160, 64);
    const fast = candyTelegraphTiming(0.8, 320, 64);

    expect(slow).toBeCloseTo(1.72125);
    expect(normal).toBeGreaterThanOrEqual(1.15);
    expect(fast).toBeCloseTo(1.15);
    expect(candyTelegraphTiming(0.8, 1, 64)).toBe(1.8);
  });

  it("provides an actionable hint for every implemented boss", () => {
    expect(bosses.length).toBeGreaterThan(0);
    for (const boss of bosses) {
      expect(boss.entryHint.trim().length).toBeGreaterThan(20);
    }
  });
  it("keeps the first boss accessible to beginners", () => {
    const king = bosses.find((boss) => boss.id === "king-snake")!;
    expect(king.maxHealth).toBe(6);
    expect(king.movementSpeed).toBe(50);
    expect(king.combat.attackCooldown).toBe(6);
    expect(king.combat.telegraphDuration).toBe(1.3);
    expect(king.combat.stunDuration).toBe(3.5);
    expect(king.entryHint).toMatch(/4 Boss Coins/i);
    expect(king.entryHint).toMatch(/25\/100/i);
    expect(king.entryHint).toMatch(/coroa/i);
    expect(king.phases).toContain(2);
  });
  it("configures the Candy Monster's six-hit fight, faster attacks, and four-coin aura charge", () => {
    const candy = bosses.find((boss) => boss.id === "candy-monster")!;
    expect(candy.maxHealth).toBe(6);
    expect(candy.phases).toEqual([4, 2]);
    expect(candy.combat.attackCooldown).toBe(4);
    expect(candy.attackInterval).toBe(4);
    expect(candy.combat.attackChargePerBossCoin).toBe(25);
    expect(candy.combat.auraMaxHits).toBe(1);
    expect(candy.entryHint).toMatch(/Boss Coins/i);
    expect(candy.entryHint).toMatch(/cada batida.*1 HP/i);
    expect(candy.entryHint).toMatch(/gradualmente/i);
  });
});
describe("boss attack aura", () => {
  it("defines one matching aura pickup kind for each boss", () => {
    expect(bossAuraPickupKind("king-snake")).toBe("crown-orb");
    expect(bossAuraPickupKind("candy-monster")).toBe("candy-aura");
    expect(bossAuraPickupKind("kraken")).toBe("attack-pearl");
    expect(bossAuraPickupKind("scorpion-king")).toBe("crown-orb");
    expect(bossAuraPickupKind("spider-queen")).toBe("crown-orb");
    expect(bossAuraPickupKind("unknown-boss")).toBeUndefined();
  });

  it("does not activate from a mismatched boss aura pickup", () => {
    for (const boss of bosses) {
      const combat = new BossCombatSystem();
      combat.addCharge(100);
      const wrongSource = bossAuraPickupKind(boss.id) === "crown-orb" ? "attack-pearl" : "crown-orb";
      expect(combat.activateAttackAura({ maxHits: 1, source: wrongSource, bossId: boss.id })).toBe(false);
      expect(combat.attackCharge).toBe(100);
      expect(combat.active).toBe(false);
    }
  });

  it("spawns timed Boss Coins for Candy Monster as well as the other bosses", () => {
    expect(bossUsesTimedCoins("candy-monster")).toBe(true);
    expect(bossUsesTimedCoins("king-snake")).toBe(true);
    expect(bossUsesTimedCoins("spider-queen")).toBe(false);
  });

  it("does not charge King Snake's aura from regular coins", () => {
    const combat = new BossCombatSystem();
    for (const coinId of ["normal", "blue", "diamond", "golden", "mythic"]) {
      combat.addCharge(regularCoinAuraCharge("king-snake", coinId, 25));
    }
    expect(combat.attackCharge).toBe(0);
    expect(combat.activateAttackAura({ maxHits: 1, source: "crown-orb", bossId: "king-snake" })).toBe(false);
  });

  it("charges King Snake only from four Boss Coins before making the crown collectible", () => {
    const combat = new BossCombatSystem();
    for (let coin = 1; coin <= 4; coin++) {
      combat.addCharge(25);
      expect(combat.attackCharge).toBe(coin * 25);
      expect(combat.attackCharge >= 100).toBe(coin === 4);
    }
    expect(combat.activateAttackAura({ maxHits: 1, source: "crown-orb", bossId: "king-snake" })).toBe(true);
  });

  it("does not charge any boss aura from regular coins", () => {
    for (const bossId of ["king-snake", "candy-monster", "kraken", "scorpion-king"]) {
      for (const coinId of ["normal", "blue", "diamond", "golden", "mythic", "candy_coin", "pearl_coin"]) {
        expect(regularCoinAuraCharge(bossId, coinId, 25)).toBe(0);
      }
    }
  });

  it("charges the combat aura only when a Boss Coin pickup is collected", () => {
    const combat = new BossCombatSystem();
    for (const coinId of ["normal", "golden", "mythic"]) {
      combat.addCharge(regularCoinAuraCharge("candy-monster", coinId, 25));
    }
    expect(combat.attackCharge).toBe(0);
    combat.addCharge(bosses.find((boss) => boss.id === "kraken")!.combat.attackChargePerBossCoin);
    expect(combat.attackCharge).toBe(25);
  });

  it("requires four Boss Coins, resets charge on collection, and repeats after a hit", () => {
    const combat = new BossCombatSystem();
    for (let i = 1; i <= 3; i++) {
      expect(combat.addCharge(25)).toBe(i * 25);
      expect(combat.activateAttackAura({ maxHits: 1, source: "crown-orb", bossId: "king-snake" })).toBe(false);
    }
    expect(combat.addCharge(25)).toBe(100);
    expect(combat.activateAttackAura({ maxHits: 1, source: "crown-orb", bossId: "king-snake" })).toBe(true);
    expect(combat.attackCharge).toBe(0);
    expect(combat.consumeHit("king-snake")).toBe(true);
    expect(combat.addCharge(75)).toBe(75);
    expect(combat.addCharge(25)).toBe(100);
    expect(combat.activateAttackAura({ maxHits: 1, source: "crown-orb", bossId: "king-snake" })).toBe(true);
  });

  it("requires collecting the Spider Queen aura after four Boss Coins", () => {
    const combat = new BossCombatSystem();
    const spider = bosses.find((boss) => boss.id === "spider-queen")!;

    for (let coin = 0; coin < 4; coin++) {
      combat.addCharge(spider.combat.attackChargePerBossCoin);
    }

    expect(combat.attackCharge).toBe(100);
    expect(combat.activateAttackAura({ maxHits: 1, source: "crown-orb", bossId: spider.id })).toBe(true);
    expect(combat.consumeHit("king-snake")).toBe(false);
    expect(combat.consumeHit(spider.id)).toBe(true);
    expect(combat.consumeHit(spider.id)).toBe(false);
    expect(combat.active).toBe(false);
  });

  it("activates Candy aura as a pursuit state and clears a pending attack", () => {
    const combat = new BossCombatSystem();
    combat.addCharge(100);

    expect(activateCandyAura(combat, "candy-monster")).toBe(true);
    expect(combat.active).toBe(true);
    expect(combat.source).toBe("candy-aura");
    expect(activateCandyAura(combat, "candy-monster")).toBe(false);
  });

  it("consumes Candy aura only for a matching boss hit, then enters a distinct flee state", () => {
    const combat = new BossCombatSystem();
    combat.addCharge(100);
    expect(activateCandyAura(combat, "candy-monster")).toBe(true);

    expect(resolveCandyAuraHit(combat, "king-snake")).toBe(false);
    expect(combat.active).toBe(true);
    expect(resolveCandyAuraHit(combat, "candy-monster")).toBe(true);
    expect(combat.active).toBe(false);
    expect(resolveCandyAuraHit(combat, "candy-monster")).toBe(false);
  });

  it("stays active without a time limit until its allowed hit is consumed", () => {
    const combat = new BossCombatSystem();
    combat.addCharge(100);
    expect(combat.activateAttackAura({ maxHits: 1, source: "crown-orb", bossId: "king-snake" })).toBe(true);

    combat.update(60 * 60);
    expect(combat.active).toBe(true);
    expect(combat.consumeHit("king-snake")).toBe(true);
    expect(combat.active).toBe(false);
  });

  it("keeps the King Snake attack aura after blocking a charge, then consumes it on damage", () => {
    const combat = new BossCombatSystem();
    combat.addCharge(100);
    expect(combat.activateAttackAura({ maxHits: 1, source: "crown-orb", bossId: "king-snake" })).toBe(true);

    expect(combat.consumeProtectionHit("king-snake")).toBe(true);
    expect(combat.active).toBe(true);
    expect(combat.remainingHits).toBe(1);
    expect(combat.hitInvulnerability).toBe(0);
    expect(combat.consumeHit("king-snake")).toBe(true);
    expect(combat.active).toBe(false);
  });

  it("allows consecutive King Snake hits after charging and collecting a fresh aura", () => {
    const combat = new BossCombatSystem();
    for (let hp = 0; hp < 6; hp++) {
      expect(combat.addCharge(25)).toBe((hp % 4 + 1) * 25);
      if (hp % 4 === 3) {
        expect(combat.activateAttackAura({ maxHits: 1, source: "crown-orb", bossId: "king-snake" })).toBe(true);
        expect(combat.consumeHit("king-snake")).toBe(true);
      }
    }
    expect(combat.active).toBe(false);
    expect(combat.attackCharge).toBe(50);
  });

  it("does not allow a King Snake aura to damage the boss outside its stun window", () => {
    const combat = new BossCombatSystem();
    combat.addCharge(100);
    expect(combat.activateAttackAura({ maxHits: 1, source: "crown-orb", bossId: "king-snake" })).toBe(true);
    expect(combat.consumeHit("king-snake")).toBe(true);
  });

  it("keeps hit limits and boss matching for the Scorpion's aura", () => {
    const combat = new BossCombatSystem();
    combat.addCharge(100);
    expect(combat.activateAttackAura({ maxHits: 1, source: "crown-orb", bossId: "scorpion-king" })).toBe(true);

    combat.update(120);
    expect(combat.consumeHit("king-snake")).toBe(false);
    expect(combat.consumeHit("scorpion-king")).toBe(true);
    expect(combat.active).toBe(false);
  });

  it("caps Candy Boss Coin charge at 100 and requires a fresh charge after its aura is spent", () => {
    const combat = new BossCombatSystem();
    expect(combat.addCharge(25)).toBe(25);
    expect(combat.addCharge(25)).toBe(50);
    expect(combat.addCharge(25)).toBe(75);
    expect(combat.addCharge(25)).toBe(100);
    expect(combat.addCharge(25)).toBe(100);
    expect(combat.activateAttackAura({ maxHits: 1, source: "candy-aura", bossId: "candy-monster" })).toBe(true);
    expect(combat.consumeHit("candy-monster")).toBe(true);
    expect(combat.active).toBe(false);
    expect(combat.attackCharge).toBe(0);
    expect(combat.activateAttackAura({ maxHits: 1, source: "candy-aura", bossId: "candy-monster" })).toBe(false);
  });
});
describe("combo and balance", () => {
  it("starts slow and increases speed gradually with growth, with a firm cap", () => {
    const start = difficulty(0, 0, B.snake.initial).speed;
    const grown = difficulty(0, 0, B.snake.initial + 20).speed;
    const capped = difficulty(10_000, 1_000_000, B.snake.max).speed;

    expect(start).toBe(B.snake.speed);
    expect(start).toBeLessThan(200);
    expect(grown).toBeGreaterThan(start);
    expect(grown - start).toBeLessThan(50);
    expect(capped).toBe(B.snake.maxSpeed);
  });
  it("keeps the initial speed approachable while limiting growth and level acceleration", () => {
    const start = difficulty(0, 0, B.snake.initial).speed;
    const afterOneLevel = difficulty(B.difficulty.secondsPerLevel, 0, B.snake.initial).speed;
    expect(start).toBe(160);
    expect(afterOneLevel).toBe(165);
    expect(difficulty(0, 0, B.snake.initial + 20).speed).toBe(180);
  });
  it("applies game difficulty to speed and collection frequency while preserving progression", () => {
    const start = difficulty(0, 0, B.snake.initial);
    expect(difficultyProfiles.easy.speedMultiplier).toBe(0.85);
    expect(difficulty(0, 0, B.snake.initial, "easy").speed).toBeCloseTo(start.speed * 0.85);
    expect(difficulty(0, 0, B.snake.initial, "normal").speed).toBe(start.speed);
    expect(difficulty(0, 0, B.snake.initial, "hard").speed).toBeCloseTo(start.speed * 1.12);
    expect(powerUpSpawnInterval("easy")).toBeLessThan(powerUpSpawnInterval("normal"));
    expect(powerUpSpawnInterval("normal")).toBe(B.power.interval);
    expect(powerUpSpawnInterval("hard")).toBeGreaterThan(powerUpSpawnInterval("normal"));
    expect(difficulty(B.difficulty.secondsPerLevel, 0, B.snake.initial, "easy").speed).toBeGreaterThan(difficulty(0, 0, B.snake.initial, "easy").speed);
    expect(difficulty(100_000, 1_000_000, B.snake.max, "hard").speed).toBe(B.snake.maxSpeed * 1.12);
  });
  it("scales boss movement and attack pacing by game difficulty with reaction floors", () => {
    expect(bossDifficultyProfile("easy")).toEqual({ movementMultiplier: 0.85, timingMultiplier: 1.2 });
    expect(bossDifficultyProfile("normal")).toEqual({ movementMultiplier: 1, timingMultiplier: 1 });
    expect(bossMovementSpeed(100, "hard")).toBeCloseTo(115);
    expect(bossAttackTiming(4, "easy")).toBeCloseTo(4.8);
    expect(bossAttackTiming(0.9, "hard", 0.7)).toBe(0.765);
    expect(bossAttackTiming(1, "hard", 1.5)).toBe(1.5);
  });
  it("uses the increased base speed and raises the cap through growth and levels", () => {
    const start = difficulty(0, 0, B.snake.initial);
    const levelUp = difficulty(B.difficulty.secondsPerLevel, 0, B.snake.initial);
    const grown = difficulty(0, 0, B.snake.initial + 10);

    expect(start.speed).toBe(160);
    expect(levelUp.speed).toBeGreaterThan(start.speed);
    expect(grown.speed).toBeGreaterThan(start.speed);
    expect(B.snake.maxSpeed).toBe(300);
    expect(difficulty(100_000, 1_000_000, B.snake.max).speed).toBe(300);
  });
  it("caps and expires at 2.5 seconds", () => {
    const c = new ComboSystem();
    expect(c.collect()).toBe(1);
    for (let i = 0; i < 8; i++) c.collect();
    expect(c.value).toBe(5);
    c.update(2.49);
    expect(c.value).toBe(5);
    c.update(0.02);
    expect(c.value).toBe(1);
    expect(c.collect()).toBe(1);
    expect(c.max).toBe(5);
  });
  it("selects each weighted tier at boundaries", () => {
    expect(B.coins.reduce((s, c) => s + c.weight, 0)).toBe(100.1);
    expect(weighted(B.coins, () => 0).value).toBe(1);
    expect(weighted(B.coins, () => 0.75).value).toBe(5);
    expect(weighted(B.coins, () => 0.93).value).toBe(20);
    expect(weighted(B.coins, () => 0.999).value).toBe(50);
    expect(weighted(B.coins, () => 0.9995).value).toBe(100);
  });
  it("makes higher-value common coins more likely only with Candy World weights", () => {
    const candyCoins = candyWorldCoinWeights(B.coins);
    expect(weighted(candyCoins, () => 0).value).toBe(1);
    expect(weighted(candyCoins, () => 0.35).value).toBe(5);
    expect(weighted(candyCoins, () => 0.8).value).toBe(20);
    expect(weighted(B.coins, () => 0).value).toBe(1);
    expect(candyCoins.reduce((sum, coin) => sum + coin.weight, 0)).toBeGreaterThan(0);
  });
  it("requires 400 Boss Energy for Candy and preserves the other boss thresholds", () => {
    expect(B.boss.candyWorldEnergyRequired).toBe(400);
    expect(B.boss.greenValleyEnergyRequired).toBe(350);
    expect(B.boss.oceanEnergyRequired).toBe(450);
    expect(B.boss.desertEnergyRequired).toBe(500);
    expect(B.boss.defaultEnergyRequired).toBe(500);
  });
  it("caps difficulty and limits angular velocity", () => {
    expect(difficulty(0, 0, B.snake.initial).speed).toBe(B.snake.speed);
    expect(difficulty(99999, 99999, 180).level).toBe(B.difficulty.maxLevel);
    expect(difficulty(99999, 99999, 180).speed).toBe(B.snake.maxSpeed);
    expect(turnToward(0, Math.PI, 0.1)).toBeCloseTo(0.1);
  });
});
describe("roadmap progression systems", () => {
  it("defines a boss for every implemented world and allows the Ocean Kraken save ID", () => {
    const implementedWorldBossIds = worlds.filter((world) => world.isImplemented && world.category !== "SECRET").map((world) => world.bossId);
    expect(implementedWorldBossIds.every((bossId) => bosses.some((boss) => boss.id === bossId))).toBe(true);
    expect(bosses.map((boss) => boss.id)).toEqual(["king-snake", "candy-monster", "kraken", "scorpion-king", "spider-queen"]);
    expect(validateSave({ saveVersion: 5, bossesDefeated: ["kraken", "unknown"] }).bossesDefeated).toEqual(["kraken"]);
  });
  it("unlocks Candy after level and King Snake, then Ocean after Candy Monster", () => {
    const profile = defaults();
    profile.playerLevel = 10;
    expect(reconcileWorldUnlocks(profile).map((world) => world.id)).toEqual([]);
    profile.bossesDefeated.push("king-snake");
    expect(reconcileWorldUnlocks(profile).map((world) => world.id)).toEqual(["candy-world"]);
    expect(worldRequirementText(worldById("ocean"), profile)).toContain("Candy Monster");
    profile.bossesDefeated.push("candy-monster");
    expect(reconcileWorldUnlocks(profile).map((world) => world.id)).toEqual(["ocean"]);
    expect(reconcileWorldUnlocks(profile)).toEqual([]);
  });
  it("does not unlock Candy below level 5 after King Snake, then unlocks it upon reaching level 5", () => {
    const profile = defaults();
    profile.playerLevel = 4;
    profile.bossesDefeated.push("king-snake");
    expect(reconcileWorldUnlocks(profile).map((world) => world.id)).toEqual([]);
    expect(profile.worldsUnlocked).not.toContain("candy-world");

    profile.playerLevel = 5;
    expect(reconcileWorldUnlocks(profile).map((world) => world.id)).toEqual(["candy-world"]);
    expect(profile.worldsUnlocked).toContain("candy-world");
    expect(traversableWorlds(profile, "green-valley").map((world) => world.id)).toContain("candy-world");
  });
  it("unlocks Desert only after level 15, Kraken, and Ocean access, and migrates it", () => {
    const profile = defaults();
    profile.playerLevel = 15;
    profile.bossesDefeated.push("king-snake", "candy-monster", "kraken");
    expect(reconcileWorldUnlocks(profile).map((world) => world.id)).toEqual(["candy-world", "ocean", "silent-abyss", "desert"]);
    expect(profile.worldsUnlocked).toContain("desert");
    expect(eligiblePortalWorlds(profile, "ocean").map((world) => world.id)).toContain("desert");
    const desertSave = validateSave({ saveVersion: 11, playerLevel: 15, bossesDefeated: ["king-snake", "candy-monster", "kraken"], worldsUnlocked: ["green-valley", "candy-world", "ocean", "desert"], selectedWorld: "desert" });
    expect(desertSave.selectedWorld).toBe("desert");
    expect(validateSave({ saveVersion: 11, playerLevel: 14, bossesDefeated: ["kraken"], worldsUnlocked: ["ocean"] }).worldsUnlocked).not.toContain("desert");
  });
  it("keeps the Abyss secret, unlocks it after Kraken, and persists its challenge reward", () => {
    const profile = defaults();
    profile.worldsUnlocked.push("ocean", "candy-world");
    profile.playerLevel = 10;
    profile.bossesDefeated.push("king-snake", "candy-monster");
    expect(traversableWorlds(profile, "ocean").map((world) => world.id)).not.toContain("silent-abyss");
    expect(eligiblePortalWorlds(profile, "ocean").map((world) => world.id)).not.toContain("silent-abyss");
    profile.bossesDefeated.push("kraken");
    reconcileWorldUnlocks(profile);
    expect(profile.worldsUnlocked).toContain("silent-abyss");
    expect(traversableWorlds(profile, "silent-abyss").map((world) => world.id)).toEqual(["ocean"]);
    expect(profile.unlockedSkins).not.toContain("abyssal-serpent");
    const completed = validateSave({ saveVersion: 11, bossesDefeated: ["kraken"], worldsUnlocked: ["ocean", "candy-world", "silent-abyss"], abyssChallengeBest: 90, abyssChallengeCompleted: true });
    expect(completed.abyssChallengeBest).toBe(90);
    expect(completed.abyssChallengeCompleted).toBe(true);
    expect(completed.unlockedSkins).toContain("abyssal-serpent");
    expect(traversableWorlds(completed, "silent-abyss").map((world) => world.id)).toEqual(["ocean"]);
  });
  it("unlocks the Spider Lair only after Scorpion King victory, persists it and keeps it off portals", () => {
    const profile = defaults();
    expect(reconcileWorldUnlocks(profile).map((world) => world.id)).not.toContain("spider-lair");
    profile.bossesDefeated.push("scorpion-king");
    expect(reconcileWorldUnlocks(profile).map((world) => world.id)).toContain("spider-lair");
    expect(traversableWorlds(profile, "green-valley").map((world) => world.id)).not.toContain("spider-lair");
    expect(eligiblePortalWorlds(profile, "green-valley").map((world) => world.id)).not.toContain("spider-lair");
    const migrated = validateSave({ saveVersion: 11, bossesDefeated: ["scorpion-king"], worldsUnlocked: ["green-valley"] });
    expect(migrated.worldsUnlocked).toContain("spider-lair");
    expect(migrated.unlockedSkins).not.toContain("royal-spider");
    expect(migrated.availablePets).not.toContain("spiderling");
    expect(migrated.unlockedPets).not.toContain("spiderling");
  });
  it("keeps portal candidates implemented, unlocked, weighted and non-premium", () => {
    const profile = defaults();
    profile.worldsUnlocked.push("candy-world", "ocean");
    profile.bossesDefeated.push("king-snake", "candy-monster");
    profile.playerLevel = 10;
    expect(eligiblePortalWorlds(profile, "green-valley").map((world) => world.id)).toEqual(["candy-world", "ocean"]);
    expect(eligiblePortalWorlds(profile, "candy-world").map((world) => world.id)).toEqual(["ocean"]);
    expect(weightedWorldChoice([worldById("candy-world"), worldById("ocean")], "", () => 0.99)?.id).toBe("ocean");
    expect(weightedWorldChoice([worldById("dragon_kingdom")], "", () => 0)).toBeUndefined();
  });
  it("offers permanent passages only to unlocked implemented worlds and updates after unlock", () => {
    const profile = defaults();
    expect(traversableWorlds(profile, "green-valley")).toEqual([]);
    profile.playerLevel = 10;
    profile.bossesDefeated.push("king-snake", "candy-monster");
    reconcileWorldUnlocks(profile);
    expect(traversableWorlds(profile, "green-valley").map((world) => world.id)).toEqual(["candy-world", "ocean"]);
    expect(traversableWorlds(profile, "ocean").map((world) => world.id)).toEqual(["green-valley", "candy-world"]);
    expect(traversableWorlds(profile, "green-valley").some((world) => ["desert", "dragon_kingdom"].includes(world.id))).toBe(false);
  });
  it("remembers the last implemented unlocked world visited through a portal", () => {
    const profile = defaults();
    profile.worldsUnlocked.push("candy-world");
    expect(rememberWorld(profile, "candy-world")).toBe(true);
    expect(profile.selectedWorld).toBe("candy-world");
    expect(rememberWorld(profile, "green-valley")).toBe(true);
    expect(profile.selectedWorld).toBe("green-valley");
    expect(rememberWorld(profile, "ocean")).toBe(false);
    expect(profile.selectedWorld).toBe("green-valley");
  });
  it("classifies locked, premium, future and selected world cards", () => {
    const profile = defaults();
    expect(worldStatus(worldById("candy-world"), profile)).toBe("LOCKED");
    expect(worldStatus(worldById("dragon_kingdom"), profile)).toBe("PREMIUM_LOCKED");
    expect(worldStatus(worldById("desert"), profile)).toBe("LOCKED");
    expect(worldStatus(worldById("green-valley"), profile)).toBe("SELECTED");
  });
  it("keeps boss energy separate from virtual coins and maps coin values", () => {
    const portal = new PortalSystem(), before = defaults();
    expect(portal.bossEnergy("normal")).toBe(1);
    expect(portal.bossEnergy("blue")).toBe(5);
    expect(portal.bossEnergy("diamond")).toBe(20);
    expect(portal.bossEnergy("golden")).toBe(50);
    expect(portal.bossEnergy("mythic")).toBe(100);
    expect(portal.bossEnergy("boss")).toBe(0);
    expect(before.totalCoins).toBe(0);
    expect(B.boss.greenValleyEnergyRequired).toBe(350);
    expect(B.boss.defaultEnergyRequired).toBe(500);
  });
  it("Bee coin weights add three percentage points to blue without changing other tiers", async () => {
    const { beeCoins } = await import("../src/game/data/balance");
    expect(beeCoins.map(({ id, weight }) => [id, weight])).toEqual([
      ["normal", 72], ["blue", 21], ["diamond", 6], ["golden", 1], ["mythic", 0.1],
    ]);
    expect(beeCoins.reduce((total, coin) => total + coin.weight, 0)).toBe(100.1);
  });
  it("Baby Octopus extends magnet to twelve seconds and is earned from Kraken", () => {
    const powers = new PowerUpSystem();
    powers.activate("magnet", 0, B.power.octopusMagnetDuration);
    expect(powers.magnet).toBe(12);
    expect(bosses.find((boss) => boss.id === "kraken")?.petReward).toBe("baby-octopus");
    expect(pets.find((pet) => pet.id === "baby-octopus")?.rarity).toBe("EPIC");
  });
  it("new boss pets grant their advertised power-up bonuses", () => {
    const powers = new PowerUpSystem();
    expect(powers.activateTimedShield(B.power.turtleShieldDuration)).toBe(true);
    expect(powers.shield).toBe(true);
    powers.update(B.power.turtleShieldDuration - 1);
    expect(powers.shield).toBe(true);
    powers.update(1);
    expect(powers.shield).toBe(false);
    expect(powers.activateTimedShield(B.power.turtleShieldDuration)).toBe(true);
    powers.update(60);
    expect(powers.shield).toBe(false);
    powers.activate("shield");
    powers.update(60);
    expect(powers.shield).toBe(true);
    expect(powers.absorb()).toBe(true);
    expect(powers.shield).toBe(false);
    expect(powers.invincible).toBe(B.power.shieldGrace);
    powers.activate("turbo", 0.05);
    expect(powers.turbo).toBeCloseTo(B.power.turboDuration * 1.05);
    expect(bosses.map((boss) => boss.bossCoinDrop)).toEqual([10, 25, 4, 40, 45]);
    expect(bosses.find((boss) => boss.id === "king-snake")?.petReward).toBe("tiny-dragon");
    expect(bosses.find((boss) => boss.id === "candy-monster")?.petReward).toBe("bee");
    expect(bosses.find((boss) => boss.id === "candy-monster")?.additionalPetRewards).toEqual(["candy-blob", "snow-pup"]);
    expect(pets.find((pet) => pet.id === "tidal-turtle")?.rarity).toBe("EPIC");
    expect(pets.find((pet) => pet.id === "phoenix")?.rarity).toBe("LEGENDARY");
    expect(pets.find((pet) => pet.id === "celestial-serpent")?.rarity).toBe("MYTHIC");
    expect(new PowerUpSystem(B.power.initialLives + 1).lives).toBe(3);
    powers.activate("ghost", 0, B.power.turtleGhostDuration);
    expect(powers.ghost).toBe(5);
    const phoenix = new PowerUpSystem(0);
    expect(phoenix.reviveWithLife()).toBe(true);
    expect(phoenix.lives).toBe(1);
    expect(phoenix.loseLife()).toBe(true);
    expect(phoenix.reviveWithLife()).toBe(false);
  });
  it("gives Tiny Dragon a bounded attack cadence and preserves every boss vulnerability rule", () => {
    expect(dragonAttackCooldown).toBe(5.5);
    expect(dragonAttackDuration).toBeLessThan(dragonAttackCooldown);
    expect(dragonBossDamage).toBe(1);
    expect(dragonCanDamageBoss("king-snake", "STUNNED")).toBe(true);
    expect(dragonCanDamageBoss("king-snake", "ATTACK_MODE")).toBe(false);
    expect(dragonCanDamageBoss("kraken", "EXPOSED")).toBe(true);
    expect(dragonCanDamageBoss("kraken", "STUNNED")).toBe(false);
    expect(dragonCanDamageBoss("scorpion-king", "STUNNED")).toBe(true);
    expect(dragonCanDamageBoss("candy-monster", "ATTACK_MODE")).toBe(true);
    expect(dragonCanDamageBoss("candy-monster", "CHASE")).toBe(false);
    expect(dragonCanDamageBoss("spider-queen", "EXPOSED")).toBe(false);
  });
  it("unlocks the Kraken offers but reserves the Mythic pet for Silent Abyss sanctuaries", () => {
    const kraken = validateSave({ saveVersion: 10, bossesDefeated: ["kraken"] });
    expect(kraken.availablePets).toContain("tidal-turtle");
    expect(kraken.availablePets).toContain("phoenix");
    expect(kraken.availablePets).not.toContain("celestial-serpent");
    const allBosses = validateSave({ saveVersion: 10, bossesDefeated: ["king-snake", "candy-monster", "kraken"] });
    expect(allBosses.availablePets).not.toContain("celestial-serpent");
    const sanctuariesComplete = validateSave({ ...allBosses, saveVersion: 16, abyssSanctuaryProgress: 3 });
    expect(sanctuariesComplete.availablePets).toContain("celestial-serpent");
    expect(sanctuariesComplete.unlockedPets).toContain("celestial-serpent");
    expect(allBosses.unlockedPets).not.toContain("phoenix");
    expect(buyPet(allBosses, "crystal-fox")).toBe(false);
  });
  it("persists Desert expedition checkpoints and keeps the dragon offer behind the relic", () => {
    const scorpion = validateSave({ saveVersion: 14, bossesDefeated: ["scorpion-king"], desertExpeditionCheckpoint: 1 });
    expect(scorpion.desertExpeditionCheckpoint).toBe(1);
    expect(scorpion.desertRelicFound).toBe(false);
    expect(scorpion.availablePets).not.toContain("tiny-dragon");
    expect(buyPet({ ...scorpion, bossCoinBalance: 500, availablePets: ["tiny-dragon"] }, "tiny-dragon")).toBe(false);
    const relic = validateSave({ ...scorpion, saveVersion: 16, desertRelicFound: true, desertExpeditionCheckpoint: 3 });
    expect(relic.desertRelicFound).toBe(true);
    expect(relic.desertExpeditionCheckpoint).toBe(3);
    expect(relic.availablePets).toContain("tiny-dragon");
    const buyer = { ...relic, bossCoinBalance: 150 };
    expect(buyPet(buyer, "tiny-dragon")).toBe(true);
    expect(buyer.bossCoinBalance).toBe(0);
    expect(buyer.unlockedPets).toContain("tiny-dragon");
  });
  it("does not unlock Tiny Dragon when migrating an old King Snake reward save", () => {
    const profile = validateSave({ saveVersion: 13, bossesDefeated: ["king-snake"] });
    expect(profile.availablePets).not.toContain("tiny-dragon");
    expect(profile.unlockedPets).not.toContain("tiny-dragon");
  });
  it("tracks Silent Abyss sanctuaries separately from the Abyssal Serpent skin challenge", () => {
    const profile = validateSave({ saveVersion: 13, abyssChallengeCompleted: false, abyssSanctuaryProgress: 2 });
    expect(profile.abyssSanctuaryProgress).toBe(2);
    expect(profile.abyssChallengeCompleted).toBe(false);
    expect(profile.unlockedPets).not.toContain("celestial-serpent");
    const completed = validateSave({ saveVersion: 14, abyssChallengeCompleted: false, abyssSanctuaryProgress: 3 });
    expect(completed.unlockedPets).toContain("celestial-serpent");
    expect(completed.unlockedSkins).not.toContain("abyssal-serpent");
    expect(completed.abyssChallengeCompleted).toBe(false);
    expect(validateSave({ saveVersion: 14, abyssSanctuaryProgress: 99 }).abyssSanctuaryProgress).toBe(3);
  });
  it("save validation accepts earnable pets but never grants the premium pet", () => {
    const profile = validateSave({ saveVersion: 16, desertRelicFound: true, bossesDefeated: ["king-snake", "candy-monster", "kraken", "scorpion-king"], unlockedPets: [...earnablePetIds, "crystal-fox", "unknown"] });
    expect(profile.unlockedPets).toEqual(earnablePetIds);
    expect(pets.find((pet) => pet.id === "crystal-fox")?.unlockType).toBe("PREMIUM");
  });
  it("unlocks the always-active lucky leprechaun only after four persisted clovers", () => {
    const incomplete = validateSave({ saveVersion: 12, cloverGardenProgress: 3, unlockedPets: ["lucky-leprechaun"] });
    const complete = validateSave({ saveVersion: 12, cloverGardenProgress: 4 });
    expect(incomplete.unlockedPets).not.toContain("lucky-leprechaun");
    expect(complete.unlockedPets).toContain("lucky-leprechaun");
    expect(pets.find((pet) => pet.id === "lucky-leprechaun")?.description).toContain("+2 pontos percentuais");
  });
  it("migrates legacy clover totals into the single garden and preserves prior guardian victories", () => {
    const legacy = validateSave({ saveVersion: 15, cloverGardenProgress: 3 });
    expect(legacy.cloverGardenProgressByOrigin).toEqual({ "candy-world": 3, ocean: 0 });
    const current = validateSave({ saveVersion: 16, cloverGardenProgress: 1, cloverGardenProgressByOrigin: { "candy-world": 1, ocean: 2 }, cloverGardenBossesDefeated: ["ocean-garden-guardian", "unknown"] });
    expect(current.cloverGardenProgressByOrigin).toEqual({ "candy-world": 3, ocean: 0 });
    expect(current.cloverGardenProgress).toBe(3);
    expect(current.cloverGardenBossesDefeated).toEqual(["candy-garden-guardian"]);
    expect(current.cloverGardenCollected).toEqual([0, 1, 2]);
    expect(current.saveVersion).toBe(18);
  });
  it("preserves individual clovers collected in any order in v18 saves", () => {
    const current = validateSave({ saveVersion: 17, cloverGardenProgress: 2, cloverGardenCollected: [3, 1, 1, 7, -1], cloverGardenBossesDefeated: ["candy-garden-guardian"] });
    expect(current.cloverGardenCollected).toEqual([1, 3]);
    expect(current.cloverGardenProgress).toBe(2);
    const reloaded = validateSave(JSON.parse(JSON.stringify(current)));
    expect(reloaded.cloverGardenCollected).toEqual([1, 3]);
    expect(reloaded.cloverGardenProgress).toBe(2);
  });
  it("migrates shop reward dates and awards new pets for prior boss victories", () => {
    const profile = validateSave({ saveVersion: 5, rewardedShopDate: "2026-10-08", bossesDefeated: ["king-snake", "unknown"] });
    expect(profile.saveVersion).toBe(18);
    expect(profile.rewardedShopDate).toBe("2026-10-08");
    expect(profile.unlockedPets).not.toContain("tiny-dragon");
    expect(profile.availablePets).toContain("firefly");
    expect(profile.unlockedPets).toContain("firefly");
    expect(profile.unlockedPets).not.toContain("snow-pup");
  });
  it("preserves an already-earned firefly from legacy saves without charging again", () => {
    const profile = validateSave({ saveVersion: 8, bossesDefeated: ["king-snake"], selectedPet: "firefly" });
    expect(profile.saveVersion).toBe(18);
    expect(profile.availablePets).toContain("firefly");
    expect(profile.unlockedPets).toContain("firefly");
    expect(profile.selectedPet).toBe("firefly");
  });
  it("keeps a previously purchased firefly from a v10 save without granting it to other v10 saves", () => {
    const owned = validateSave({ saveVersion: 10, bossesDefeated: ["king-snake"], unlockedPets: ["firefly"], selectedPet: "firefly" });
    const notOwned = validateSave({ saveVersion: 10, bossesDefeated: ["king-snake"] });
    expect(owned.unlockedPets).toContain("firefly");
    expect(owned.selectedPet).toBe("firefly");
    expect(notOwned.unlockedPets).not.toContain("firefly");
  });
  it("awards known achievements once and rejects unknown IDs", () => {
    const profile = defaults(), id = achievementDefinitions[0].id;
    expect(awardAchievement(profile, id)).toBe(true);
    expect(awardAchievement(profile, id)).toBe(false);
    expect(awardAchievement(profile, "not-real")).toBe(false);
    expect(profile.achievements).toEqual([id]);
  });
});
describe("logo intro responsive layout", () => {
  it.each([[844, 390], [390, 844], [1280, 720], [320, 240]])("keeps logo and title centered in %ix%i viewports", (width, height) => {
    const layout = logoLayout(width, height);
    expect(layout.centerX).toBe(width / 2);
    expect(layout.logoSize).toBeLessThanOrEqual(Math.min(260, width * (width > height ? 0.3 : 0.52), height * (width > height ? 0.38 : 0.34)));
    expect(layout.logoY).toBeGreaterThan(layout.logoSize * 0.71);
    expect(layout.titleY).toBeLessThan(height - layout.titleFontSize);
    expect(layout.titleY - layout.logoY).toBeGreaterThan(layout.logoSize * 0.35);
  });
});

describe("Desert world mechanics", () => {
  it("creates arena-scaled routes, oasis, and gusts that apply only inside their lanes", () => {
    const regions = desertRegions(0, 0, 1000, 800), gusts = desertGusts(0, 0, 1000, 800);
    const oasis = regions.find((region) => region.id === "oasis")!;
    expect(inDesertOasis({ x: oasis.x, y: oasis.y }, regions)).toBe(true);
    expect(inDesertOasis({ x: 0, y: 0 }, regions)).toBe(false);
    expect(desertRouteAt({ x: oasis.x, y: oasis.y }, regions)).toBe("oasis");
    expect(desertRouteAt({ x: 260, y: 200 }, regions)).toBe("ruins");
    expect(desertRouteAt({ x: 900, y: 700 }, regions)).toBe("dunes");
    const rareSpots = desertRareCoinSpots(regions);
    expect(rareSpots).toHaveLength(3);
    expect(rareSpots.every((point) => desertRouteAt(point, regions) === "ruins")).toBe(true);
    expect(desertRareCoinSpots([])).toEqual([]);
    expect(desertGustAt({ x: gusts[0].x, y: gusts[0].y }, 0, gusts).x).toBeGreaterThan(0);
    expect(desertRouteGustAt({ x: oasis.x, y: oasis.y }, 0, gusts, regions)).toEqual({ x: 0, y: 0 });
    expect(desertGustAt({ x: 0, y: 0 }, 0, gusts)).toEqual({ x: 0, y: 0 });
    expect(desertGustAt({ x: gusts[2].x, y: gusts[2].y }, 0, gusts).x).toBeLessThan(0);
  });
  it("keeps the Scorpion arena radius and contains only points inside its boundary", () => {
    const center = { x: 500, y: 400 }, radius = 100;
    expect(containDesertArenaPoint({ x: 650, y: 400 }, center, radius, 10)).toBeNull();
    const contained = containDesertArenaPoint({ x: 530, y: 440 }, center, radius, 10)!;
    expect(Math.hypot(contained.x - center.x, contained.y - center.y)).toBeCloseTo(110);
    expect(blockDesertArenaCrossing({ x: 650, y: 400 }, { x: 350, y: 400 }, center, radius, 10)).toEqual({ x: 650, y: 400 });
    expect(blockDesertArenaCrossing({ x: 530, y: 400 }, { x: 650, y: 400 }, center, radius, 10)).toEqual({ x: 610, y: 400 });
    expect(blockDesertArenaCrossing({ x: 650, y: 400 }, { x: 640, y: 400 }, center, radius, 10)).toBeNull();
    expect(isDesertArenaPickupAccessible(center, center, radius, 22)).toBe(false);
    expect(isDesertArenaPickupAccessible({ x: 622, y: 400 }, center, radius, 22)).toBe(true);
    expect(desertRegions(0, 0, 1000, 800).find((region) => region.id === "scorpion_arena")?.x).toBe(760);
  });
});
describe("skin collection catalog", () => {
  it("keeps the Abyssal Serpent mysterious until its challenge skin is unlocked", () => {
    const profile = defaults();
    const abyssal = getSkin("abyssal-serpent")!;
    expect(isMysterySkin(abyssal)).toBe(true);
    expect(skinUnlockStatus(abyssal, profile).unlocked).toBe(false);
    expect(skinMysteryClues.subtle).not.toContain("90 segundos");
    expect(skinMysteryClues.clear).toContain("90 segundos");

    profile.unlockedSkins.push("abyssal-serpent");
    expect(skinUnlockStatus(abyssal, profile).unlocked).toBe(true);
    expect(isMysterySkin(getSkin("royal-spider")!)).toBe(false);
  });
  it("defines every rarity and validates rarity/unlock metadata", () => {
    expect(skinRarities).toEqual(["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"]);
    expect(isSkinRarity("MYTHIC")).toBe(true);
    expect(isSkinRarity("INVALID")).toBe(false);
    expect(isSkinUnlockType("PREMIUM")).toBe(true);
    expect(isSkinUnlockType("INVALID")).toBe(false);
    expect(skins.some((entry) => entry.id === "dragon" && entry.rarity === "EPIC")).toBe(true);
  });
  it("keeps premium preview metadata visible and grouped in the dragon family", () => {
    expect(getSkinPreviewConfig("ancient-dragon")?.showTurbo).toBe(true);
    expect(skinsByFamily("dragon").map((entry) => entry.id)).toEqual(expect.arrayContaining(["dragon", "fire-dragon", "ancient-dragon", "celestial-dragon", "candy-dragon"]));
    const profile = defaults();
    expect(skinUnlockStatus(getSkin("ancient-dragon")!, profile)).toEqual({ unlocked: false, label: "Premium — em breve" });
  });
  it("assigns boss skins to King Snake, Candy Monster, and Kraken", () => {
    const profile = defaults();
    const kingSkin = getSkin("king-snake")!, candySkin = getSkin("candy-dragon")!, ghostSkin = getSkin("ghost")!;
    expect(kingSkin.bossRewardId).toBe("king-snake");
    expect(candySkin.bossRewardId).toBe("candy-monster");
    expect(ghostSkin.bossRewardId).toBe("kraken");
    expect(skinUnlockStatus(kingSkin, profile).unlocked).toBe(false);
    profile.bossesDefeated.push("king-snake");
    expect(skinUnlockStatus(kingSkin, profile).unlocked).toBe(true);
    expect(skinUnlockStatus(candySkin, profile).unlocked).toBe(false);
    profile.bossesDefeated.push("candy-monster");
    expect(skinUnlockStatus(candySkin, profile).unlocked).toBe(true);
    expect(skinUnlockStatus(ghostSkin, profile).unlocked).toBe(false);
    profile.bossesDefeated.push("kraken");
    expect(skinUnlockStatus(ghostSkin, profile).unlocked).toBe(true);
  });
  it("migrates previously defeated bosses into their skin rewards", () => {
    const profile = validateSave({ saveVersion: 5, bossesDefeated: ["king-snake", "kraken"] });
    expect(profile.unlockedSkins).toEqual(expect.arrayContaining(["king-snake", "ghost"]));
    expect(profile.unlockedSkins).not.toContain("candy-dragon");
  });
  it("preserves existing skin coin prices and equips already-owned skins", () => {
    const profile = defaults();
    expect(getSkin("cat")?.coinPrice).toBe(500);
    expect(getSkin("robot")?.coinPrice).toBe(1000);
    expect(getSkin("dino")?.coinPrice).toBe(2000);
    expect(getSkin("dragon")?.coinPrice).toBe(5000);
    profile.unlockedSkins.push("cat");
    profile.totalCoins = 1;
    expect(buySkin(profile, "cat")).toBe(true);
    expect(profile.selectedSkin).toBe("cat");
    expect(profile.totalCoins).toBe(1);
  });
  it("provides a no-op purchase boundary without real billing", async () => {
    expect(purchases.isAvailable()).toBe(false);
    expect(purchases.getProduct("coinsnake.skin.ancient_dragon")?.type).toBe("non-consumable");
    expect(await purchases.purchase("coinsnake.skin.ancient_dragon")).toEqual({ status: "notAvailable", productId: "coinsnake.skin.ancient_dragon" });
    expect(await purchases.restorePurchases()).toEqual({ status: "notAvailable" });
  });
});
describe("save validation and I/O", () => {
  it("falls back on unsupported or corrupt structures", () => {
    expect(validateSave(null)).toEqual(defaults());
    expect(validateSave({ saveVersion: 99, totalCoins: 900 })).toEqual(
      defaults(),
    );
  });
  it("migrates v3 ownership into v5 without trusting local premium entitlements", () => {
    const migrated = validateSave({ saveVersion: 3, unlockedSkins: ["classic", "cat", "fire-dragon"], selectedSkin: "cat", premiumEntitlements: ["fire-dragon"] });
    expect(migrated.saveVersion).toBe(18);
    expect(migrated.unlockedSkins).toEqual(["classic", "cat", "fire-dragon"]);
    expect(migrated.premiumEntitlements).toEqual([]);
  });
  it("sanitizes nested fields and derives level from XP", () => {
    const p = validateSave({
      saveVersion: 1,
      totalCoins: -3,
      bestScore: NaN,
      xp: 600,
      selectedSkin: "dragon",
      unlockedSkins: ["cat", "cat", "hacked"],
      settings: { muted: "false", volume: 8 },
      statistics: { totalGames: Infinity },
      missions: { collector: { progress: 999, claimed: true } },
    });
    expect(p.totalCoins).toBe(0);
    expect(p.playerLevel).toBe(3);
    expect(p.xp).toBe(600);
    expect(p.selectedSkin).toBe("classic");
    expect(p.unlockedSkins).toEqual(["classic", "cat"]);
    expect(p.settings.volume).toBe(1);
    expect(p.settings.muted).toBe(false);
    expect(p.statistics.totalGames).toBe(0);
    expect(p.missions.collector.progress).toBe(100);
  });
  it("migrates legacy saves without inventing unlocked roadmap content", () => {
    const migrated = validateSave({ saveVersion: 2, totalCoins: 95, xp: 500, unlockedPets: ["hacked"], worldsUnlocked: ["ocean", "unknown"] });
    expect(migrated.saveVersion).toBe(18);
    expect(migrated.totalCoins).toBe(95);
    expect(migrated.worldsUnlocked).toEqual(["green-valley"]);
    expect(migrated.unlockedPets).toEqual([]);
  });
  it("preserves Candy World and boss progress when loading a current version save", () => {
    const profile = validateSave({ saveVersion: 8, xp: 1150, bossesDefeated: ["king-snake"], worldsUnlocked: ["green-valley", "candy-world"], selectedWorld: "candy-world" });
    expect(profile.saveVersion).toBe(18);
    expect(profile.bossesDefeated).toContain("king-snake");
    expect(profile.worldsUnlocked).toContain("candy-world");
    expect(profile.selectedWorld).toBe("candy-world");
  });
  it("migrates world aliases and selected world while preserving legacy unlocks", () => {
    const migrated = validateSave({ saveVersion: 4, worldsUnlocked: ["green_valley", "candy_world", "ocean_world", "dragon_kingdom"], selectedWorld: "ocean_world", xp: 2500, bossesDefeated: ["king-snake", "candy-monster"] });
    expect(migrated.saveVersion).toBe(18);
    expect(migrated.worldsUnlocked).toEqual(["green-valley", "candy-world", "ocean"]);
    expect(migrated.selectedWorld).toBe("ocean");
    const old = validateSave({ saveVersion: 3, worldsUnlocked: ["ocean"] });
    expect(old.worldsUnlocked).toContain("ocean");
    expect(old.selectedWorld).toBe("green-valley");
  });
  it("recovers malformed JSON and reports write failure", async () => {
    const s = new SaveSystem({
      get: async () => "{invalid",
      set: async () => {
        throw Error("disk");
      },
    });
    await s.load();
    expect(s.profile.totalCoins).toBe(0);
    await s.save();
    expect(s.error).toContain("não salvo");
  });
  it("serializes writes so newer saves win", async () => {
    const values: string[] = [];
    const s = new SaveSystem({
      get: async () => null,
      set: async (v) => {
        values.push(v);
      },
    });
    s.profile.totalCoins = 1;
    const first = s.save();
    s.profile.totalCoins = 2;
    await s.save();
    await first;
    expect(JSON.parse(values[1]).totalCoins).toBe(2);
  });
});
describe("missions", () => {
  it("selects the same three varied missions for a day and a different set on another day", () => {
    const first = dailyMissions("2026-10-08"), repeated = dailyMissions("2026-10-08"), next = dailyMissions("2026-10-09");
    expect(first.map((mission) => mission.id)).toEqual(repeated.map((mission) => mission.id));
    expect(new Set(first.map((mission) => mission.difficulty)).size).toBe(3);
    expect(next.map((mission) => mission.id)).not.toEqual(first.map((mission) => mission.id));
    expect(first).toHaveLength(3);
  });
  it("migrates fixed-mission saves without losing their current progress", () => {
    const profile = validateSave({ saveVersion: 7, missionDate: "2026-10-08", missions: { collector: { progress: 70, claimed: false }, scorer: { progress: 800, claimed: false } } });
    expect(profile.dailyMissionIds).toEqual(["collector", "scorer", "explorer"]);
    expect(profile.missions.collector.progress).toBe(70);
    expect(profile.missions.scorer.progress).toBe(800);
  });
  it("migrates legacy claimed missions without paying them twice", () => {
    const profile = validateSave({ saveVersion: 7, missionDate: "2026-10-08", missions: { collector: { progress: 100, claimed: true } } });
    const run = newRun();
    startMissionRun(profile, run, "2026-10-08");
    run.matchCoins = 150;
    expect(reportRun(profile, run)).toEqual([]);
    expect(profile.totalCoins).toBe(0);
    expect(profile.xp).toBe(0);
  });
  it("accumulates delta across revives and rewards once", () => {
    const p = defaults(), r = newRun();
    ensureDay(p, "2026-10-08");
    p.dailyMissionIds = ["collector", "scorer", "explorer"];
    p.missions = Object.fromEntries(p.dailyMissionIds.map((id) => [id, { progress: 0, claimed: false }]));
    startMissionRun(p, r, "2026-10-08");
    r.matchCoins = 60;
    expect(reportRun(p, r)).toEqual([]);
    expect(reportRun(p, r)).toEqual([]);
    expect(p.missions.collector.progress).toBe(60);
    r.matchCoins = 110;
    expect(reportRun(p, r)).toEqual(["collector"]);
    expect(reportRun(p, r)).toEqual([]);
    expect(p.totalCoins).toBe(100);
    expect(p.xp).toBe(75);
  });
  it("does not add scores across different runs", () => {
    const p = defaults(), a = newRun(), b = newRun();
    ensureDay(p, "2026-10-08");
    p.dailyMissionIds = ["collector", "scorer", "explorer"];
    p.missions = Object.fromEntries(p.dailyMissionIds.map((id) => [id, { progress: 0, claimed: false }]));
    startMissionRun(p, a, "2026-10-08");
    startMissionRun(p, b, "2026-10-08");
    a.score = 1200;
    b.score = 1100;
    reportRun(p, a);
    reportRun(p, b);
    expect(p.missions.scorer.progress).toBe(1200);
    expect(p.totalCoins).toBe(0);
  });
  it("keeps a run tied to its start day and starts fresh on the next run", () => {
    const p = defaults();
    ensureDay(p, "2026-10-05");
    p.dailyMissionIds = ["collector", "scorer", "explorer"];
    p.missions = Object.fromEntries(p.dailyMissionIds.map((id) => [id, { progress: 0, claimed: false }]));
    const run = newRun();
    startMissionRun(p, run, "2026-10-05");
    run.matchCoins = 60;
    reportRun(p, run);
    updateMissionDay(p, "2026-10-06");
    expect(p.missions["daily-player"]).toEqual({ progress: 0, claimed: false });
    run.matchCoins = 100;
    expect(reportRun(p, run)).toEqual([]);
    expect(p.missions["daily-player"].progress).toBe(0);
    const nextRun = newRun();
    startMissionRun(p, nextRun, "2026-10-06");
    expect(nextRun.missionDate).toBe("2026-10-06");
    expect(localDay(new Date(2026, 9, 6))).toBe("2026-10-06");
  });
  it("rejects invalid or duplicate mission IDs in a version 8 save", () => {
    const profile = validateSave({ saveVersion: 8, missionDate: "2026-10-08", dailyMissionIds: ["collector", "collector", "hacked"], missions: { collector: { progress: 90, claimed: false } } });
    expect(profile.dailyMissionIds).toHaveLength(3);
    expect(profile.dailyMissionIds).not.toContain("hacked");
    expect(profile.missions.collector.progress).toBe(90);
    expect(missions.length).toBeGreaterThan(profile.dailyMissionIds.length);
  });
  it("counts finalized runs once toward daily play missions", () => {
    const p = defaults();
    ensureDay(p, "2026-10-08");
    p.dailyMissionIds = ["daily-player", "explorer", "scorer"];
    p.missions = Object.fromEntries(p.dailyMissionIds.map((id) => [id, { progress: 0, claimed: false }]));
    const firstRun = newRun();
    startMissionRun(p, firstRun, "2026-10-08");
    expect(reportRun(p, firstRun, true)).toEqual([]);
    expect(reportRun(p, firstRun, true)).toEqual([]);
    expect(p.missions["daily-player"].progress).toBe(1);
    const secondRun = newRun();
    startMissionRun(p, secondRun, "2026-10-08");
    expect(reportRun(p, secondRun, true)).toEqual(["daily-player"]);
    expect(p.totalCoins).toBe(100);
  });
});
describe("snake and powers", () => {
  it("always keeps the snake outside the Kraken arena barrier", () => {
    const center = { x: 500, y: 600 };
    expect(containKrakenArenaPoint({ x: 500, y: 650 }, center, 100, 14)).toEqual({ x: 500, y: 714 });
    expect(containKrakenArenaPoint({ x: 500, y: 650 }, center, 100, 14)!.y).toBeGreaterThan(center.y + 100);
    expect(containKrakenArenaPoint({ x: 500, y: 710 }, center, 100, 14)).toEqual({ x: 500, y: 714 });
    expect(containKrakenArenaPoint({ x: 500, y: 710 }, center, 100, 14)!.y).toBeGreaterThan(center.y + 100);
    expect(containKrakenArenaPoint({ x: 500, y: 690 }, center, 100, 14)).toEqual({ x: 500, y: 714 });
    expect(containKrakenArenaPoint({ x: 500, y: 714 }, center, 100, 14)).toBeNull();
  });
  it("keeps Kraken boss portals outside the arena with clearance", () => {
    const arena = oceanRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom).find((region) => region.id === "kraken_arena")!;
    const radius = Math.min(B.arena.right - B.arena.left, B.arena.bottom - B.arena.top) * oceanWorldConfig.krakenArena.radius;
    expect(isOutsideKrakenArena(arena, arena, radius, 90)).toBe(false);
    expect(isOutsideKrakenArena({ x: arena.x + radius + 91, y: arena.y }, arena, radius, 90)).toBe(true);
    expect(isOutsideKrakenArena({ x: arena.x + radius + 89, y: arena.y }, arena, radius, 90)).toBe(false);
  });
  it("places the Coral Lagoon aura at the map center, away from the Kraken arena center", () => {
    const regions = oceanRegions(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom);
    const lagoon = regions.find((region) => region.id === "coral_lagoon")!;
    const krakenArena = regions.find((region) => region.id === "kraken_arena")!;
    expect(lagoon).toMatchObject({ x: (B.arena.left + B.arena.right) / 2, y: (B.arena.top + B.arena.bottom) / 2 });
    expect(lagoon.x).not.toBe(krakenArena.x);
    expect(lagoon.y).not.toBe(krakenArena.y);
  });
  it("aims Kraken attacks at the snake outside its arena and within map bounds", () => {
    const center = { x: 500, y: 500 }, radius = 110;
    const bounds = { left: 0, top: 0, right: 1000, bottom: 1000 };
    const snake = { x: 620, y: 500 };
    const target = krakenAttackTarget(snake, bounds, 96);
    expect(target).toEqual(snake);
    expect(isOutsideKrakenArena(target, center, radius)).toBe(true);
    expect(target.x).toBeLessThanOrEqual(bounds.right - 96);
    expect(krakenAttackTarget({ x: -100, y: 500 }, bounds, 96)).toEqual({ x: 96, y: 500 });
  });
  it("distinguishes Kraken hits on the snake head, body, and empty space", () => {
    const head = { x: 100, y: 100 };
    const body = [head, { x: 80, y: 100 }, { x: 60, y: 100 }];
    expect(krakenHitZone({ x: 105, y: 100 }, head, body, 10)).toBe("head");
    expect(krakenHitZone({ x: 80, y: 110 }, head, body, 10)).toBe("body");
    expect(krakenHitZone({ x: 150, y: 150 }, head, body, 10)).toBe("miss");
  });
  it("applies regional Ocean currents additively while preserving player input and clamping Turbo speed", () => {
    const spawn = { x: 700, y: 750 };
    const zones = oceanCurrentZones(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom, spawn);
    const strong = zones.find((zone) => zone.type === "STRONG")!;
    const force = currentForceAt({ x: strong.x, y: strong.y }, [strong]);
    expect(force.x).toBeGreaterThan(0);
    const input = { x: -250, y: 0 };
    const against = oceanMovement(input, force, oceanWorldConfig.maxEffectiveSpeed);
    expect(against.x).toBeGreaterThan(input.x);
    const withCurrent = oceanMovement({ x: 300, y: 0 }, force, oceanWorldConfig.maxEffectiveSpeed);
    expect(Math.hypot(withCurrent.x, withCurrent.y)).toBeLessThanOrEqual(oceanWorldConfig.maxEffectiveSpeed);
    const snake = new Snake();
    const before = { x: snake.x, y: snake.y };
    snake.moveVector(1 / 120, 0, 340, { x: 36, y: 0 }, B.snake.rotation, oceanWorldConfig.maxEffectiveSpeed);
    expect(Math.hypot(snake.x - before.x, snake.y - before.y) * 120).toBeLessThanOrEqual(oceanWorldConfig.maxEffectiveSpeed);
    expect(["SOFT", "STRONG", "RAPID"]).toEqual(expect.arrayContaining(zones.map((zone) => zone.type)));
  });
  it("keeps Pearl Coin Ocean-only and uses MatchCoins value without a separate wallet", () => {
    const pearl = B.coins.find((coin) => coin.id === "pearl_coin");
    expect(pearl).toMatchObject({ value: 30, score: 1500, weight: 0 });
    expect(pearlCoinSpawnAllowed("green-valley", 0, 1)).toBe(false);
    expect(pearlCoinSpawnAllowed("ocean", 0.07, oceanWorldConfig.pearlCoinChance)).toBe(true);
    expect(pearlCoinSpawnAllowed("ocean", 0.09, oceanWorldConfig.pearlCoinChance)).toBe(false);
    expect(pearlCoinSpawnAllowed("ocean", 0.1, oceanWorldConfig.pearlCoinChance, true)).toBe(true);
  });
  it("rejects coral collision spawns and does not place strong current on snake spawn", () => {
    const spawn = { x: 700, y: 750 };
    const zones = oceanCurrentZones(B.arena.left, B.arena.top, B.arena.right, B.arena.bottom, spawn);
    expect(zones.some((zone) => zone.type !== "SOFT" && spawn.x >= zone.x - zone.width / 2 && spawn.x <= zone.x + zone.width / 2 && spawn.y >= zone.y - zone.height / 2 && spawn.y <= zone.y + zone.height / 2)).toBe(false);
    expect(isSafeOceanSpawn({ x: 500, y: 500 }, spawn, [{ x: 500, y: 500, radius: 30, kind: "coralRock" }], zones)).toBe(false);
    expect(deepTrenchCoinChance(0, true)).toBe(oceanWorldConfig.deepTrenchRareCoinBonus);
    expect(deepTrenchCoinChance(0, false)).toBe(0);
  });
  it("applies Candy sticky slow and smoothly recovers after leaving", () => {
    const slowed = stickySpeedMultiplier(1, true, 0.1);
    expect(slowed).toBeLessThan(1);
    expect(stickySpeedMultiplier(slowed, false, 0.1)).toBeGreaterThan(slowed);
    expect(candyWorldConfig.sticky.slowMultiplier).toBe(0.75);
    expect(candyFinalSpeed(230, 1.4, 0.75)).toBe(241.5);
  });
  it("keeps Candy Coin exclusive to Candy World with the configured value", () => {
    expect(B.coins.find((coin) => coin.id === "candy_coin")?.value).toBe(25);
    expect(B.coins.find((coin) => coin.id === "candy_coin")?.score).toBe(1000);
    expect(candyCoinSpawnAllowed("green-valley", 0, 1)).toBe(false);
    expect(candyCoinSpawnAllowed("candy-world", 0.2, 0.35)).toBe(true);
  });
  it("models wafer crossings and rejects unsafe obstacle positions", () => {
    expect(inCandyRiver({ x: 720, y: 1150 }, B.arena.left, B.arena.top, B.arena.right, B.arena.bottom)).toBe(true);
    expect(inCandyRiver({ x: 400, y: 1150 }, B.arena.left, B.arena.top, B.arena.right, B.arena.bottom)).toBe(false);
    expect(candyObstacleSafe({ x: 100, y: 100 }, { x: 110, y: 110 }, undefined, [], 100)).toBe(false);
    expect(candyObstacleSafe({ x: 500, y: 500 }, { x: 100, y: 100 }, undefined, [{ x: 500, y: 500, radius: 60 }], 100)).toBe(false);
  });
  it("keeps body spaced at different frame rates", () => {
    for (const hz of [30, 60, 120]) {
      const s = new Snake();
      for (let i = 0; i < hz; i++) s.move(1 / hz, -Math.PI / 2, 230);
      expect(s.y).toBeCloseTo(460);
      for (let i = 1; i < s.length; i++)
        expect(distance(s.body[i - 1], s.body[i])).toBeCloseTo(18, 1);
    }
  });
  it("caps growth and starts without self-collision", () => {
    const s = new Snake();
    expect(s.selfCollision()).toBe(false);
    for (let i = 0; i < 300; i++) s.grow();
    expect(s.length).toBe(180);
  });
  it("extends the tail from its current position when growing", () => {
    const s = new Snake();
    s.move(0.5, -Math.PI / 2, 230);
    const previousTail = { ...s.body[s.length - 1] };
    const newSegmentIndex = s.length;

    s.grow();

    expect(s.length).toBe(newSegmentIndex + 1);
    expect(s.body[newSegmentIndex]).toEqual(previousTail);
  });
  it("shield consumes once, gives grace, then exposes collision", () => {
    const p = new PowerUpSystem();
    expect(p.absorb()).toBe(false);
    p.activate("shield");
    expect(p.absorb()).toBe(true);
    expect(p.shield).toBe(false);
    expect(p.absorb()).toBe(true);
    p.update(2);
    expect(p.absorb()).toBe(false);
  });
  it("lets Kraken attacks be blocked by ghost, shield, or active invincibility", () => {
    const ghost = new PowerUpSystem();
    ghost.activate("ghost");
    expect(ghost.blocksAttack()).toBe(true);
    expect(ghost.ghostActive).toBe(true);

    const shield = new PowerUpSystem();
    shield.activate("shield");
    expect(shield.blocksAttack()).toBe(true);
    expect(shield.shield).toBe(false);
    expect(shield.invincible).toBe(B.power.shieldGrace);

    const invincible = new PowerUpSystem();
    invincible.invincible = 0.5;
    expect(invincible.blocksAttack()).toBe(true);
    expect(invincible.invincible).toBe(0.5);

    expect(new PowerUpSystem().blocksAttack()).toBe(false);
  });
  it("starts with two lives, caps rare pickups, and consumes lives", () => {
    const p = new PowerUpSystem();
    expect(p.lives).toBe(2);
    expect(p.gainLife()).toBe(true);
    expect(p.gainLife()).toBe(true);
    expect(p.gainLife()).toBe(false);
    expect(p.lives).toBe(B.power.maxLives);
    expect(p.loseLife()).toBe(true);
    expect(p.loseLife()).toBe(true);
    expect(p.loseLife()).toBe(true);
    expect(p.loseLife()).toBe(true);
    expect(p.loseLife()).toBe(false);
    expect(p.lives).toBe(0);
  });
  it("magnet and turbo expire on game time", () => {
    const p = new PowerUpSystem();
    p.activate("magnet");
    p.activate("turbo");
    p.update(5);
    expect(p.turbo).toBe(0);
    expect(p.magnet).toBe(3);
    p.update(4);
    expect(p.magnet).toBe(0);
  });
  it("activates and expires the three new timed power-ups", () => {
    const p = new PowerUpSystem();
    p.activate("precision");
    p.activate("lucky-star");
    p.activate("ghost");
    expect([p.precision, p.luckyStar, p.ghost]).toEqual([4, 8, 3]);
    p.update(3);
    expect(p.ghost).toBe(0);
    expect([p.precision, p.luckyStar, p.ghost]).toEqual([1, 5, 0]);
    expect(p.ghostGrace).toBeLessThanOrEqual(B.power.ghostClearanceGrace);
    p.update(1);
    expect(p.precision).toBe(0);
    expect(p.luckyStar).toBe(4);
  });
  it("exposes ghost protection only while the power-up itself is active", () => {
    const p = new PowerUpSystem();
    expect(p.ghostActive).toBe(false);
    p.activate("ghost");
    expect(p.ghostActive).toBe(true);
    p.update(3);
    expect(p.ghostActive).toBe(false);
    expect(p.ghostGrace).toBeGreaterThan(0);
  });
  it("keeps ghost collision immunity only until clear or the 0.5-second cap", () => {
    const p = new PowerUpSystem();
    p.activate("ghost");
    p.update(3);
    expect(p.updateGhost(1 / 120, true)).toBe(true);
    expect(p.updateGhost(0.49, true)).toBe(true);
    expect(p.updateGhost(0.02, true)).toBe(false);
    p.activate("ghost");
    p.update(3);
    expect(p.updateGhost(1 / 120, false)).toBe(false);
    expect(p.ghostGrace).toBe(0);
  });
  it("increases the relative weights of valuable coins during lucky star", () => {
    const normal = B.coins.reduce((sum, coin) => sum + coin.weight, 0);
    const lucky = [65, 24, 9, 2, 0.1].reduce((sum, weight) => sum + weight, 0);
    expect(1 - 75 / normal).toBeLessThan(1 - 65 / lucky);
    expect(1 - 75 / normal).toBeCloseTo(0.251, 2);
    expect(1 - 65 / lucky).toBeCloseTo(0.351, 2);
  });
  it("poison slows movement temporarily and refreshes instead of stacking", () => {
    const p = new PowerUpSystem();
    p.applyPoison();
    expect(p.slowed).toBe(B.hazard.poisonDuration);
    p.update(1.5);
    expect(p.slowed).toBeCloseTo(B.hazard.poisonDuration - 1.5);
    p.applyPoison();
    expect(p.slowed).toBe(B.hazard.poisonDuration);
    p.update(B.hazard.poisonDuration);
    expect(p.slowed).toBe(0);
  });
  it("adds a very rare 100-value coin tier", () => {
    const mythic = B.coins.find((coin) => coin.id === "mythic");
    expect(mythic?.value).toBe(100);
    expect(mythic?.weight).toBeLessThan(1);
    expect(B.coins.reduce((total, coin) => total + coin.weight, 0)).toBe(100.1);
  });
});
