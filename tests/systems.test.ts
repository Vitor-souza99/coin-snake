import { describe, it, expect } from "vitest";
import {
  defaults,
  validateSave,
  SaveSystem,
} from "../src/game/systems/SaveSystem";
import {
  buySkin,
  creditCoins,
  finishRun,
} from "../src/game/systems/EconomySystem";
import { ComboSystem } from "../src/game/systems/ComboSystem";
import {
  ensureDay,
  reportRun,
  claimMission,
} from "../src/game/systems/MissionSystem";
import { PowerUpSystem } from "../src/game/systems/PowerUpSystem";
import { difficulty } from "../src/game/systems/DifficultySystem";
import { Snake } from "../src/game/entities/Snake";
import { B } from "../src/game/data/balance";
import { newRun } from "../src/game/types/game";
import { PortalSystem } from "../src/game/systems/PortalSystem";
import { eligiblePortalWorlds, reconcileWorldUnlocks, weightedWorldChoice, worldRequirementText, worldStatus } from "../src/game/systems/WorldSystem";
import { worldById } from "../src/game/data/worlds";
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
  it("rejects insufficient funds and unknown skins", () => {
    const p = defaults();
    expect(buySkin(p, "cat")).toBe(false);
    expect(buySkin(p, "bad")).toBe(false);
    expect(p.totalCoins).toBe(0);
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
describe("combo and balance", () => {
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
  it("caps difficulty and limits angular velocity", () => {
    expect(difficulty(0, 0, 5).speed).toBe(230);
    expect(difficulty(99999, 99999, 180).level).toBe(B.difficulty.maxLevel);
    expect(turnToward(0, Math.PI, 0.1)).toBeCloseTo(0.1);
  });
});
describe("roadmap progression systems", () => {
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
  });
  it("Bee coin weights add three percentage points to blue without changing other tiers", async () => {
    const { beeCoins } = await import("../src/game/data/balance");
    expect(beeCoins.map(({ id, weight }) => [id, weight])).toEqual([
      ["normal", 72], ["blue", 21], ["diamond", 6], ["golden", 1], ["mythic", 0.1],
    ]);
    expect(beeCoins.reduce((total, coin) => total + coin.weight, 0)).toBe(100.1);
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
    expect(migrated.saveVersion).toBe(5);
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
    expect(p.selectedSkin).toBe("classic");
    expect(p.unlockedSkins).toEqual(["classic", "cat"]);
    expect(p.settings.volume).toBe(1);
    expect(p.settings.muted).toBe(false);
    expect(p.statistics.totalGames).toBe(0);
    expect(p.missions.collector.progress).toBe(100);
  });
  it("migrates legacy saves without inventing unlocked roadmap content", () => {
    const migrated = validateSave({ saveVersion: 2, totalCoins: 95, xp: 500, unlockedPets: ["hacked"], worldsUnlocked: ["ocean", "unknown"] });
    expect(migrated.saveVersion).toBe(5);
    expect(migrated.totalCoins).toBe(95);
    expect(migrated.worldsUnlocked).toEqual(["green-valley"]);
    expect(migrated.unlockedPets).toEqual([]);
  });
  it("migrates world aliases and selected world while preserving legacy unlocks", () => {
    const migrated = validateSave({ saveVersion: 4, worldsUnlocked: ["green_valley", "candy_world", "ocean_world", "dragon_kingdom"], selectedWorld: "ocean_world", xp: 2500, bossesDefeated: ["king-snake", "candy-monster"] });
    expect(migrated.saveVersion).toBe(5);
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
  it("accumulates delta across revives and rewards once", () => {
    const p = defaults(),
      r = newRun();
    r.matchCoins = 60;
    reportRun(p, r);
    reportRun(p, r);
    expect(p.missions.collector.progress).toBe(60);
    r.matchCoins = 110;
    reportRun(p, r);
    expect(claimMission(p, "collector")).toBe(true);
    expect(claimMission(p, "collector")).toBe(false);
    expect(p.totalCoins).toBe(100);
    expect(p.xp).toBe(75);
  });
  it("does not add scores across different runs", () => {
    const p = defaults(),
      a = newRun(),
      b = newRun();
    a.score = 1200;
    b.score = 1100;
    reportRun(p, a);
    reportRun(p, b);
    expect(p.missions.scorer.progress).toBe(1200);
    expect(claimMission(p, "scorer")).toBe(false);
  });
  it("resets progress and claims on local day rollover", () => {
    const p = defaults();
    ensureDay(p, "2026-10-05");
    p.missions.collector = { progress: 100, claimed: true };
    ensureDay(p, "2026-10-06");
    expect(p.missions.collector).toEqual({ progress: 0, claimed: false });
    expect(localDay(new Date(2026, 9, 6))).toBe("2026-10-06");
  });
});
describe("snake and powers", () => {
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
