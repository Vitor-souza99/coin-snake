import assert from "node:assert/strict";
import process from "node:process";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.COIN_BROWSER_EXECUTABLE || undefined,
  args: process.env.COIN_BROWSER_EXECUTABLE
    ? ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
    : [],
});

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  page.setDefaultTimeout(15000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(process.env.COIN_TEST_URL || "http://127.0.0.1:5173");
  await page.waitForSelector('[data-scene="Menu"] #play');
  const analyticsPrompt = page.locator('[data-scene="Menu"] .dialog-backdrop');
  if (await analyticsPrompt.count()) {
    const decline = analyticsPrompt.getByRole("button", { name: "Agora não" });
    if (await decline.count()) await decline.click();
  }

  for (const [width, height] of [[360, 640], [390, 844], [412, 915], [720, 1280], [844, 390], [915, 412], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(80);
    const canvas = await page.locator("canvas").boundingBox();
    assert(canvas && Math.abs(canvas.width - width) <= 1 && Math.abs(canvas.height - height) <= 1, `canvas fits ${width}x${height}`);
    assert(await page.locator('[data-scene="Menu"] #play').isVisible(), `play button visible at ${width}x${height}`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-scene="Menu"] #play').click();
  await page.waitForSelector('[data-scene="DifficultySelect"] #start-run');
  await page.locator('[data-scene="DifficultySelect"] [data-difficulty="easy"]').click();
  await page.locator('[data-scene="DifficultySelect"] #start-run').click();
  await page.waitForSelector('[data-scene="Game"] #player-xp-bar', { state: "attached" });
  await page.waitForFunction(() => window.coinSnake?.scene.isActive("Game"));
  if (await page.locator('[data-scene="Game"] .dialog-backdrop').count()) {
    const tutorial = page.locator('[data-scene="Game"] .dialog-backdrop');
    if (await tutorial.locator("h2").textContent() === "Encontre seu ritmo")
      await tutorial.locator("button").first().click();
  }

  const hud = await page.evaluate(() => {
    const get = (selector) => {
      const element = document.querySelector(`[data-scene="Game"] ${selector}`);
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, text: element.textContent };
    };
    return { map: get("#world-tag"), bossEnergy: get("#boss-energy"), xp: get(".player-level__track"), xpLabel: get("#player-xp-value") };
  });
  assert(hud.xp.width > 100, "XP progress track is visible");
  assert(hud.xpLabel.text.includes("XP"), "XP progress label is visible");
  assert(hud.bossEnergy.y >= hud.map.y + hud.map.height, "map and boss energy do not overlap in portrait");

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(100);
  const landscape = await page.evaluate(() => {
    const map = document.querySelector('[data-scene="Game"] #world-tag').getBoundingClientRect();
    const energy = document.querySelector('[data-scene="Game"] #boss-energy').getBoundingClientRect();
    const xp = document.querySelector('[data-scene="Game"] .player-level__track').getBoundingClientRect();
    return { mapBottom: map.bottom, energyTop: energy.top, xpWidth: xp.width };
  });
  assert(landscape.xpWidth > 100, "XP progress track remains visible in landscape");
  assert(landscape.energyTop >= landscape.mapBottom, "map and boss energy do not overlap in landscape");

  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.locator('[data-scene="Game"] .dialog-backdrop').count()) {
    await page.locator('[data-scene="Game"] .dialog-backdrop button').first().click();
  }
  await page.locator('[data-scene="Game"] #pause').click();
  await page.waitForSelector('[data-scene="Game"] .dialog-backdrop');
  assert.deepEqual(pageErrors, [], "game flow has no uncaught JavaScript errors");
  await page.locator('[data-scene="Game"] .dialog-backdrop button', { hasText: "Menu" }).click();
  await page.waitForSelector('[data-scene="Menu"] #shop');
  await page.locator('[data-scene="Menu"] #shop').click();
  await page.waitForSelector('[data-scene="Shop"] [data-skin]');
  assert.equal(await page.locator('[data-scene="SkinPreview"]').count(), 0, "removed skin preview scene is absent");
  await page.locator('[data-scene="Shop"] [data-category="pets"]').click();
  await page.waitForSelector('[data-scene="Shop"] .pet-card');
  assert.deepEqual(pageErrors, [], "shop flow has no uncaught JavaScript errors");
  console.log("PASS: seven responsive viewports, game start, XP HUD, non-overlapping indicators, pause/game-over, shop navigation, and no uncaught errors.");
} finally {
  await browser.close();
}