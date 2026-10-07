import { chromium } from "@playwright/test";
import process from "node:process";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir("browser-results", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.COIN_BROWSER_EXECUTABLE || undefined,
  args: process.env.COIN_BROWSER_EXECUTABLE
    ? [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ]
    : [],
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
});
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const url = process.env.COIN_TEST_URL || "http://127.0.0.1:5173";
const state = () =>
  page.evaluate(() => {
    const s = window.coinSnake.scene.getScene("Game");
    return {
      id: s.run.id,
      elapsed: s.run.elapsed,
      x: s.snake.x,
      y: s.snake.y,
      angle: s.snake.angle,
      coins: s.run.matchCoins,
      score: s.run.score,
      length: s.snake.length,
      energy: s.turbo.energy,
      active: s.turbo.active,
      halted: s.halted,
      fruit: s.fruit.active,
      fruitCount: s.run.shrinkFruits,
      joystick: s.joystick.direction,
      uses: s.run.turboUses,
    };
  });
async function bounds(selector) {
  const r = await page.locator(selector).boundingBox(),
    v = page.viewportSize();
  assert(
    r &&
      r.x >= -1 &&
      r.y >= -1 &&
      r.x + r.width <= v.width + 1 &&
      r.y + r.height <= v.height + 1,
    `bounds ${selector}`,
  );
  return r;
}
try {
  await page.goto(url);
  await page.waitForSelector('[data-scene="Menu"] #play');
  for (const [width, height] of [
    [360, 640],
    [390, 844],
    [412, 915],
    [720, 1280],
    [1080, 1920],
    [844, 390],
    [915, 412],
    [1280, 720],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    await bounds("#play");
    await bounds("#settings");
    const c = await bounds("canvas");
    assert(
      Math.abs(c.width - width) <= 1 && Math.abs(c.height - height) <= 1,
      "canvas uses whole viewport",
    );
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({ path: "browser-results/menu-landscape.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "browser-results/menu-portrait.png" });
  await page.click("#settings");
  await page.check("#left");
  await page.check("#motion");
  await page.click("#back");
  await page.click("#play");
  await page.getByRole("button", { name: "Vamos jogar", exact: true }).click();
  await page.evaluate(() => {
    const s = window.coinSnake.scene.getScene("Game");
    s.powers.invincible = 999;
  });
  assert(
    await page
      .locator('[data-scene="Game"]')
      .evaluate((e) => e.classList.contains("left-handed")),
  );
  const j = await bounds("#joystick"),
    t = await bounds("#turbo");
  assert(j.x > t.x, "mirrored controls");
  const client = await page.context().newCDPSession(page);
  const x = j.x + j.width * 0.5,
    y = j.y + j.height * 0.6,
    tx = t.x + t.width / 2,
    ty = t.y + t.height / 2;
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 0, x, y }],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ id: 0, x: x + 45, y }],
  });
  assert((await state()).joystick !== null, "floating joystick direction");
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { id: 0, x: x + 45, y },
      { id: 1, x: tx, y: ty },
    ],
  });
  await page.waitForTimeout(220);
  const boosted = await state();
  assert(boosted.active && boosted.energy < 100, "two-finger turbo");
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(80);
  assert(!(await state()).active, "release clears turbo");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("Shift");
  await page.waitForTimeout(150);
  await page.keyboard.up("Shift");
  await page.keyboard.up("ArrowRight");
  assert((await state()).uses >= 2, "keyboard turbo");
  await page.click("#pause");
  const paused = await state();
  await page.waitForTimeout(100);
  assert.equal((await state()).elapsed, paused.elapsed);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  const runId = (await state()).id;
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("heading", { name: "Pausado" }).waitFor();
  assert.equal((await state()).id, runId, "rotate preserves run");
  await page.getByRole("button", { name: "Câmera: Padrão", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "Câmera: Panorâmica", exact: true }).count(), 1, "camera mode toggles while paused");
  const panoramicZoom = await page.evaluate(() => window.coinSnake.scene.getScene("Game").cameras.main.zoom);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.waitForTimeout(350);
  assert.equal(await page.locator(".dialog-backdrop").count(), 0, "continue closes pause after rotation");
  assert.equal((await state()).id, runId, "resume preserves current run");
  assert.equal(await page.evaluate(() => window.coinSnake.scene.getScene("Game").halted), false, "resume unhalts simulation after rotation");
  assert.equal(await page.evaluate(() => window.coinSnake.scene.getScene("Game").cameras.main.zoom), panoramicZoom, "camera mode remains applied after resume");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click("#pause");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("heading", { name: "Pausado" }).waitFor();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.waitForTimeout(350);
  assert.equal(await page.locator(".dialog-backdrop").count(), 0, "continue stays closed after rotating from portrait to landscape");
  assert.equal(await page.evaluate(() => window.coinSnake.scene.getScene("Game").halted), false, "portrait-to-landscape resume unhalts simulation");
  await bounds(".dialog");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await bounds("#pause");
  await bounds("#turbo");
  await bounds("#joystick");
  await page.evaluate(() => {
    const s = window.coinSnake.scene.getScene("Game");
    s.halted = true;
    s.snake.reset(700, 750);
    s.steering.reset(s.snake.angle);
    s.snake.length = 20;
    for (const c of s.coins) c.hide();
    s.powers.turbo = 0;
    s.turbo.energy = 50;
    s.fruit.spawn(s.snake.x + 100, s.snake.y);
    s.powers.magnet = 8;
  });
  // Fruit must stay still under magnet. Then collect through the actual simulation path.
  const fruit = await page.evaluate(() => {
    const s = window.coinSnake.scene.getScene("Game"),
      p = { x: s.fruit.x, y: s.fruit.y };
    s.step(1 / 120);
    return { before: p, after: { x: s.fruit.x, y: s.fruit.y } };
  });
  assert.deepEqual(fruit.before, fruit.after);
  const preFruit = await state();
  await page.evaluate(() => {
    const s = window.coinSnake.scene.getScene("Game");
    s.fruit.spawn(s.snake.x, s.snake.y);
    s.step(1 / 120);
  });
  const postFruit = await state();
  assert.equal(postFruit.length, 15);
  assert.equal(postFruit.score, preFruit.score);
  assert.equal(postFruit.coins, preFruit.coins);
  assert.equal(postFruit.fruitCount, 1);
  await page.evaluate(() => {
    const s = window.coinSnake.scene.getScene("Game");
    s.fruit.spawn(450, 600);
    s.fruit.update(11, s.run.elapsed);
  });
  assert(!(await state()).fruit, "expires");
  await page.evaluate(() => {
    const s = window.coinSnake.scene.getScene("Game");
    s.powers.magnet = 0;
    s.turbo.energy = 30;
    s.coins[0].spawn(s.snake.x, s.snake.y);
    s.step(1 / 120);
  });
  assert((await state()).coins > 0, "coin collection");
  assert((await state()).energy > 30, "coin recharges turbo");
  await page.evaluate(() => {
    const s = window.coinSnake.scene.getScene("Game");
    s.halted = false;
  });
  await page.evaluate(() => window.coinSnake.scene.getScene("Game").enterWorld("ocean"));
  assert.equal(await page.locator("#world-tag").textContent(), "OCEAN WORLD", "HUD displays the active world after switching worlds");
  await page.screenshot({ path: "browser-results/game-landscape.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.screenshot({ path: "browser-results/game-portrait.png" });
  // Simulate safe area once at the app boundary, like a notched WebView.
  await page.evaluate(() => {
    document.querySelector("#app").style.padding = "24px 18px 20px 18px";
  });
  await page.waitForTimeout(200);
  const safe = await bounds("#pause");
  assert(safe.y >= 24 && safe.x >= 18);
  await bounds("#turbo");
  await page.evaluate(() => {
    document.querySelector("#app").style.padding = "";
  });
  await page.evaluate(() => {
    const s = window.coinSnake.scene.getScene("Game");
    s.halted = false;
    s.powers.invincible = 0;
    s.powers.shield = false;
    s.snake.x = 5;
  });
  await page.waitForSelector("#revive");
  await page.click("#revive");
  await page.waitForFunction(
    () =>
      window.coinSnake.scene.isActive("Game") &&
      !window.coinSnake.scene.isActive("GameOver"),
  );
  assert(
    await page.evaluate(
      () => window.coinSnake.scene.getScene("Game").run.revived,
    ),
  );
  await page.evaluate(() => {
    const s = window.coinSnake.scene.getScene("Game");
    s.powers.invincible = 0;
    s.powers.shield = false;
    s.snake.x = 5;
  });
  await page.waitForSelector("#again");
  assert.equal(await page.locator("#revive").count(), 0);
  await page.click("#menu");
  await page.reload();
  await page.waitForSelector("#play");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("CapacitorStorage.coin-snake-v1")),
  );
  assert.equal(saved.saveVersion, 3);
  assert(saved.settings.leftHanded);
  assert.equal(saved.statistics.totalGames, 1);
  assert.equal(saved.statistics.shrinkFruitsCollected, 1);
  // Legacy save exercises the real boot migration without touching personal browser data.
  await page.evaluate(() => {
    const key = "CapacitorStorage.coin-snake-v1",
      p = JSON.parse(localStorage.getItem(key));
    p.saveVersion = 1;
    p.totalCoins = 600;
    p.unlockedSkins = ["classic"];
    p.selectedSkin = "classic";
    p.settings = { muted: true, volume: 0.4, haptics: false };
    p.missions.collector = { progress: 100, claimed: false };
    delete p.hints;
    localStorage.setItem(key, JSON.stringify(p));
  });
  await page.reload();
  await page.waitForSelector("#play");
  await page.click("#shop");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-skin="cat"] [data-view]').click();
  await page.waitForSelector('[data-scene="SkinPreview"]');
  for (const [width, height] of [[360, 640], [390, 844], [844, 390], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    const preview = await page.evaluate(() => {
      const stage = document.querySelector(".skin-preview-stage").getBoundingClientRect();
      const canvas = document.querySelector("#skin-preview-canvas").getBoundingClientRect();
      const info = document.querySelector(".skin-preview-info").getBoundingClientRect();
      const controls = document.querySelector("#skin-preview-controls").getBoundingClientRect();
      return { stage: { left: stage.left, right: stage.right, bottom: stage.bottom }, canvas: { left: canvas.left, right: canvas.right, top: canvas.top, bottom: canvas.bottom }, info: { left: info.left, right: info.right, top: info.top }, controls: { top: controls.top, bottom: controls.bottom }, viewport: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight } };
    });
    assert(preview.canvas.left >= preview.stage.left - 1 && preview.canvas.right <= preview.stage.right + 1, "preview stays inside its stage");
    assert(preview.canvas.right <= preview.viewport.width + 1 && preview.controls.bottom <= preview.viewport.height + 1, "preview controls stay in viewport");
    if (width > 700) assert(preview.canvas.right <= preview.info.left + 1, "desktop preview does not overlap skin details");
    else assert(preview.canvas.bottom <= preview.info.top + 1, "mobile preview does not overlap skin details");
  }
  await page.locator("#back").click();
  await page.locator('[data-filter="OWNED"]').click();
  assert.equal(await page.locator("[data-skin]").count(), 1, "owned filter includes progress-unlocked skins");
  await page.locator('[data-filter="LOCKED"]').click();
  assert.equal(await page.locator("[data-skin]").count(), 0, "locked filter excludes progress-unlocked skins");
  await page.locator('[data-filter="ALL"]').click();
  await page.click("#skin-cat");
  await page.waitForSelector("#skin-cat:disabled");
  await page.setViewportSize({ width: 844, height: 390 });
  await bounds("#back");
  await page.screenshot({ path: "browser-results/shop-landscape.png" });
  await page.click("#back");
  await page.click("#missions");
  await page.click("#claim-collector");
  await page.waitForSelector("#claim-collector:disabled");
  const migrated = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("CapacitorStorage.coin-snake-v1")),
  );
  assert.equal(migrated.totalCoins, 200);
  assert.equal(migrated.selectedSkin, "cat");
  assert.equal(migrated.saveVersion, 3);
  assert.equal(migrated.settings.sfxVolume, 0.4);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: responsive menu, eight viewports, two orientations, rotation during run, safe area, two-finger joystick/turbo, left-handed controls, keyboard, pause, Shrink Fruit, magnet exclusion, coin recharge, one revive, save, v1 migration, shop and missions. No JS exceptions.",
  );
} finally {
  await browser.close();
}
