import { describe, it, expect } from "vitest";
import {
  defaults,
  validateSave,
  SaveSystem,
} from "../src/game/systems/SaveSystem";
import {
  buySkin,
  buyPet,
  FIREFLY_COIN_PRICE,
  claimShopReward,
  SHOP_REWARDED_COINS,
  creditCoins,
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
import { difficulty } from "../src/game/systems/DifficultySystem";
import { Snake } from "../src/game/entities/Snake";
import { candyCoinSpawnAllowed, candyFinalSpeed, candyObstacleSafe, candyWorldConfig, inCandyRiver, stickySpeedMultiplier } from "../src/game/data/candyWorld";
import { oceanCurrentZones, currentForceAt, oceanMovement, isSafeOceanSpawn, pearlCoinSpawnAllowed, deepTrenchCoinChance, oceanWorldConfig } from "../src/game/data/oceanWorld";
import { B, candyWorldCoinWeights } from "../src/game/data/balance";
import { dailyMissions, missions } from "../src/game/data/missions";
import { addXP } from "../src/game/systems/EconomySystem";
import { levelForXP, totalXPForLevel, xpForNextLevel, xpProgressForLevel } from "../src/game/systems/ExperienceSystem";
import { newRun } from "../src/game/types/game";
import { PortalSystem } from "../src/game/systems/PortalSystem";
import { BossCombatSystem } from "../src/game/systems/BossCombatSystem";
import { eligiblePortalWorlds, reconcileWorldUnlocks, rememberWorld, traversableWorlds, weightedWorldChoice, worldRequirementText, worldStatus } from "../src/game/systems/WorldSystem";
import { worldById, worlds } from "../src/game/data/worlds";
import { bosses } from "../src/game/data/bosses";
import { earnablePetIds, pets } from "../src/game/data/pets";
import { awardAchievement, achievementDefinitions } from "../src/game/systems/AchievementSystem";
import { getSkin, getSkinPreviewConfig, isSkinRarity, isSkinUnlockType, skinRarities, skins, skinsByFamily, skinUnlockStatus } from "../src/game/data/skins";
import { purchases } from "../src/game/services/PurchaseService";
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
  it("unlocks the firefly offer after King Snake and buys it for 12,000 coins", () => {
    const profile = defaults();
    profile.bossesDefeated.push("king-snake");
    const unlocked = validateSave({ saveVersion: 9, bossesDefeated: ["king-snake"] });
    expect(unlocked.availablePets).toContain("firefly");
    expect(unlocked.unlockedPets).not.toContain("firefly");
    expect(buyPet(unlocked, "firefly")).toBe(false);
    expect(unlocked.totalCoins).toBe(0);
    unlocked.totalCoins = FIREFLY_COIN_PRICE - 1;
    expect(buyPet(unlocked, "firefly")).toBe(false);
    unlocked.totalCoins = FIREFLY_COIN_PRICE;
    expect(buyPet(unlocked, "firefly")).toBe(true);
    expect(unlocked.totalCoins).toBe(0);
    expect(unlocked.unlockedPets).toContain("firefly");
    expect(unlocked.selectedPet).toBe("firefly");
    expect(buyPet(unlocked, "firefly")).toBe(true);
    expect(unlocked.totalCoins).toBe(0);
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
  it("applies Candy Blob XP only to the run XP, not coins", () => {
    const p = defaults(), r = newRun();
    p.selectedPet = "candy-blob";
    r.score = 200;
    r.matchCoins = 17;
    finishRun(p, r);
    expect(p.xp).toBe(37);
    expect(p.totalCoins).toBe(17);
  });
});
describe("boss entry hints", () => {
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
    expect(king.entryHint).not.toMatch(/Boss Coins/i);
    expect(king.entryHint).toMatch(/coroa/i);
    expect(king.phases).toContain(2);
  });
  it("configures the Candy Monster's six-hit fight and two-coin aura charge", () => {
    const candy = bosses.find((boss) => boss.id === "candy-monster")!;
    expect(candy.maxHealth).toBe(6);
    expect(candy.phases).toEqual([4, 2]);
    expect(candy.combat.attackChargePerBossCoin).toBe(25);
    expect(candy.combat.auraMaxHits).toBe(1);
    expect(candy.entryHint).toMatch(/Boss Coins/i);
    expect(candy.entryHint).toMatch(/2 HP/);
  });
});
describe("boss attack aura", () => {
  it("stays active without a time limit until its allowed hit is consumed", () => {
    const combat = new BossCombatSystem();
    combat.addCharge(100);
    expect(combat.activateAttackAura({ maxHits: 1, source: "crown-orb", bossId: "king-snake" })).toBe(true);

    combat.update(60 * 60);
    expect(combat.active).toBe(true);
    expect(combat.consumeHit("king-snake")).toBe(true);
    expect(combat.active).toBe(false);
  });

  it("consumes the King Snake aura as protection without applying hit cooldown", () => {
    const combat = new BossCombatSystem();
    combat.addCharge(100);
    expect(combat.activateAttackAura({ maxHits: 1, source: "crown-orb", bossId: "king-snake" })).toBe(true);

    expect(combat.consumeProtectionHit("king-snake")).toBe(true);
    expect(combat.active).toBe(false);
    expect(combat.remainingHits).toBe(0);
    expect(combat.hitInvulnerability).toBe(0);
    expect(combat.consumeProtectionHit("king-snake")).toBe(false);
  });

  it("keeps hit limits and boss matching while aura has no timer", () => {
    const combat = new BossCombatSystem();
    combat.addCharge(100);
    expect(combat.activateAttackAura({ maxHits: 2, source: "sugar_shield", bossId: "candy-monster" })).toBe(true);

    combat.update(120);
    expect(combat.consumeHit("king-snake")).toBe(false);
    expect(combat.consumeHit("candy-monster")).toBe(true);
    combat.update(0.81);
    expect(combat.consumeHit("candy-monster")).toBe(true);
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
    const implementedWorldBossIds = worlds.filter((world) => world.isImplemented).map((world) => world.bossId);
    expect(implementedWorldBossIds.every((bossId) => bosses.some((boss) => boss.id === bossId))).toBe(true);
    expect(bosses.map((boss) => boss.id)).toEqual(["king-snake", "candy-monster", "kraken"]);
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
    expect(worldStatus(worldById("desert"), profile)).toBe("COMING_SOON");
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
  it("Baby Octopus increases magnet duration by five percent and is earned from Kraken", () => {
    const powers = new PowerUpSystem();
    powers.activate("magnet", 0.05);
    expect(powers.magnet).toBeCloseTo(8.4);
    expect(bosses.find((boss) => boss.id === "kraken")?.petReward).toBe("baby-octopus");
    expect(pets.find((pet) => pet.id === "baby-octopus")?.rarity).toBe("EPIC");
  });
  it("new boss pets grant their advertised power-up bonuses", () => {
    const powers = new PowerUpSystem();
    powers.activate("shield", 0.05);
    expect(powers.shield).toBe(true);
    powers.update(6.1);
    expect(powers.shield).toBe(true);
    powers.update(60);
    expect(powers.shield).toBe(true);
    expect(powers.absorb()).toBe(true);
    expect(powers.shield).toBe(false);
    expect(powers.invincible).toBe(B.power.shieldGrace);
    powers.activate("turbo", 0.05);
    expect(powers.turbo).toBeCloseTo(B.power.turboDuration * 1.05);
    expect(bosses.map((boss) => boss.additionalPetRewards)).toEqual([["firefly"], ["snow-pup"], ["tiny-dragon"]]);
  });
  it("save validation accepts earnable pets but never grants the premium pet", () => {
    const profile = validateSave({ saveVersion: 5, unlockedPets: [...earnablePetIds, "crystal-fox", "unknown"] });
    expect(profile.unlockedPets).toEqual(earnablePetIds);
    expect(pets.find((pet) => pet.id === "crystal-fox")?.unlockType).toBe("PREMIUM");
  });
  it("migrates shop reward dates and awards new pets for prior boss victories", () => {
    const profile = validateSave({ saveVersion: 5, rewardedShopDate: "2026-10-08", bossesDefeated: ["king-snake", "unknown"] });
    expect(profile.saveVersion).toBe(9);
    expect(profile.rewardedShopDate).toBe("2026-10-08");
    expect(profile.unlockedPets).toContain("bee");
    expect(profile.availablePets).toContain("firefly");
    expect(profile.unlockedPets).toContain("firefly");
    expect(profile.unlockedPets).not.toContain("snow-pup");
  });
  it("preserves an already-earned firefly from legacy saves without charging again", () => {
    const profile = validateSave({ saveVersion: 8, bossesDefeated: ["king-snake"], selectedPet: "firefly" });
    expect(profile.saveVersion).toBe(9);
    expect(profile.availablePets).toContain("firefly");
    expect(profile.unlockedPets).toContain("firefly");
    expect(profile.selectedPet).toBe("firefly");
  });
  it("awards known achievements once and rejects unknown IDs", () => {
    const profile = defaults(), id = achievementDefinitions[0].id;
    expect(awardAchievement(profile, id)).toBe(true);
    expect(awardAchievement(profile, id)).toBe(false);
    expect(awardAchievement(profile, "not-real")).toBe(false);
    expect(profile.achievements).toEqual([id]);
  });
});
describe("skin collection catalog", () => {
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
    expect(migrated.saveVersion).toBe(9);
    expect(migrated.unlockedSkins).toEqual(["classic", "cat", "fire-dragon"]);
    expect(migrated.selectedSkin).toBe("cat");
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
    expect(migrated.saveVersion).toBe(9);
    expect(migrated.totalCoins).toBe(95);
    expect(migrated.worldsUnlocked).toEqual(["green-valley"]);
    expect(migrated.unlockedPets).toEqual([]);
  });
  it("preserves Candy World and boss progress when loading a current version save", () => {
    const profile = validateSave({ saveVersion: 8, xp: 1150, bossesDefeated: ["king-snake"], worldsUnlocked: ["green-valley", "candy-world"], selectedWorld: "candy-world" });
    expect(profile.playerLevel).toBe(5);
    expect(profile.bossesDefeated).toContain("king-snake");
    expect(profile.worldsUnlocked).toContain("candy-world");
    expect(profile.selectedWorld).toBe("candy-world");
  });
  it("migrates world aliases and selected world while preserving legacy unlocks", () => {
    const migrated = validateSave({ saveVersion: 4, worldsUnlocked: ["green_valley", "candy_world", "ocean_world", "dragon_kingdom"], selectedWorld: "ocean_world", xp: 2500, bossesDefeated: ["king-snake", "candy-monster"] });
    expect(migrated.saveVersion).toBe(9);
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
