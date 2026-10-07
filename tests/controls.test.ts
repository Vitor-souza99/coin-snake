import { describe, it, expect } from "vitest";
import { TurboSystem } from "../src/game/systems/TurboSystem";
import { shrunkLength, shrinkCooldown } from "../src/game/systems/ShrinkSystem";
import {
  joystickDirection,
  SteeringSystem,
} from "../src/game/systems/SteeringSystem";
import { defaults, validateSave, SaveSystem } from "../src/game/systems/SaveSystem";
import { finishRun } from "../src/game/systems/EconomySystem";
import { newRun } from "../src/game/types/game";
describe("manual turbo", () => {
  it("drains only when held and recovers after release", () => {
    const t = new TurboSystem();
    t.update(1, true);
    expect(t.active).toBe(true);
    expect(t.energy).toBe(76);
    t.update(0.7, false);
    expect(t.active).toBe(false);
    expect(t.energy).toBeCloseTo(83.7);
  });
  it("requires release after exhaustion, without flickering", () => {
    const t = new TurboSystem();
    t.update(5, true);
    expect(t.active).toBe(false);
    expect(t.exhausted).toBe(true);
    t.update(3, true);
    expect(t.active).toBe(false);
    t.update(1, false);
    t.update(0.1, true);
    expect(t.active).toBe(true);
    expect(t.activations).toBe(2);
  });
  it("charges by coin type and never exceeds 100", () => {
    const t = new TurboSystem();
    t.energy = 0;
    t.charge("normal");
    t.charge("blue");
    t.charge("diamond");
    t.charge("golden");
    expect(t.energy).toBe(27);
    t.fill();
    t.charge("golden");
    expect(t.energy).toBe(100);
  });
  it("preserves energy during collected Turbo power-up", () => {
    const t = new TurboSystem();
    t.energy = 30;
    t.update(2, true, true);
    expect(t.energy).toBe(30);
    expect(t.active).toBe(true);
  });
});
describe("shrink and steering", () => {
  it("reduces 25 percent, rounded down, with five as floor", () => {
    expect(shrunkLength(20)).toBe(15);
    expect(shrunkLength(5)).toBe(5);
    expect(shrunkLength(6)).toBe(5);
    expect(shrunkLength(180)).toBe(135);
  });
  it("bounds cooldown", () => {
    expect(shrinkCooldown(() => 0)).toBe(20);
    expect(shrinkCooldown(() => 1)).toBe(35);
  });
  it("has a dead zone and stable desired angle", () => {
    expect(joystickDirection(2, 2)).toBeNull();
    expect(joystickDirection(50, 0)).toBe(0);
    expect(joystickDirection(0, 50)).toBeCloseTo(Math.PI / 2);
  });
  it("smooths without jumping across angle wrap", () => {
    const s = new SteeringSystem();
    s.reset(Math.PI - 0.01);
    const angle = s.update(-Math.PI + 0.01, 1 / 60);
    expect(Math.abs(angle - (Math.PI - 0.01))).toBeLessThan(0.01);
  });
});
describe("v1 migration", () => {
  it("preserves coins, skins, XP, missions and audio", () => {
    const old = {
      ...defaults(),
      saveVersion: 1,
      totalCoins: 812,
      unlockedSkins: ["classic", "cat"],
      selectedSkin: "cat",
      xp: 900,
      settings: { muted: true, volume: 0.7, haptics: false },
      missions: { collector: { progress: 70, claimed: false } },
    };
    const p = validateSave(old);
    expect(p.saveVersion).toBe(3);
    expect(p.totalCoins).toBe(812);
    expect(p.selectedSkin).toBe("cat");
    expect(p.xp).toBe(900);
    expect(p.missions.collector.progress).toBe(70);
    expect(p.settings.sfxVolume).toBe(0.7);
    expect(p.settings.leftHanded).toBe(false);
    expect(p.hints.joystick).toBe(false);
  });
  it("round-trips current controls and help flags", () => {
    const p = defaults();
    p.settings.leftHanded = true;
    p.hints.shrink = true;
    expect(
      validateSave(JSON.parse(JSON.stringify(p))).settings.leftHanded,
    ).toBe(true);
    expect(validateSave(p).hints.shrink).toBe(true);
  });
  it("counts new statistics once per run", () => {
    const p = defaults(),
      r = newRun();
    r.shrinkFruits = 2;
    r.turboUses = 3;
    finishRun(p, r);
    finishRun(p, r);
    expect(p.statistics.shrinkFruitsCollected).toBe(2);
    expect(p.statistics.turboUses).toBe(3);
  });
});

it('never overwrites a save from a newer version',async()=>{let writes=0;const s=new SaveSystem({get:async()=>JSON.stringify({saveVersion:99,totalCoins:20000}),set:async()=>{writes++;}});await s.load();await s.save();expect(writes).toBe(0);expect(s.error).toContain('versão mais nova');});
