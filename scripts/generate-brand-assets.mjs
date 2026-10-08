import { chromium } from "playwright";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const log = console;

const root = process.cwd();
const branding = resolve(root, "assets/branding");
const svg = await readFile(resolve(branding, "coin-snake-symbol.svg"), "utf8");
const browser = await chromium.launch({ headless: true });

async function render(markup, width, height, path) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(markup);
  await page.locator("svg").waitFor();
  await page.screenshot({ path, omitBackground: true });
  await page.close();
}

try {
  const symbolMarkup = `<body style="margin:0;width:100%;height:100%;display:grid;place-items:center;background:transparent">${svg}</body>`;
  await render(symbolMarkup, 512, 512, resolve(branding, "coin-snake-symbol.png"));
  await render(
    `<body style="margin:0;width:100%;height:100%;display:grid;place-items:center;background:#20a79b"><div style="width:74%;height:74%">${svg}</div></body>`,
    512,
    512,
    resolve(branding, "coin-snake-play-store-512.png"),
  );

  const foregroundSvg = svg.replace(/<\?xml[^>]*\?>/g, "");
  const foreground = `<body style="margin:0;width:100%;height:100%;display:grid;place-items:center;background:transparent"><div style="width:68%;height:68%">${foregroundSvg}</div></body>`;
  for (const [name, size] of [["mdpi", 108], ["hdpi", 162], ["xhdpi", 216], ["xxhdpi", 324], ["xxxhdpi", 432]]) {
    await render(foreground, size, size, resolve(root, `android/app/src/main/res/mipmap-${name}/ic_launcher_foreground.png`));
  }

  await writeFile(resolve(root, "android/app/src/main/res/drawable/ic_launcher_background.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="#20A79B" android:pathData="M0,0h108v108h-108z"/><path android:fillColor="#33FFFFFF" android:pathData="M0,0h108v54h-108z"/></vector>\n`);
  await writeFile(resolve(root, "android/app/src/main/res/values/ic_launcher_background.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">#20A79B</color></resources>\n`);
  await writeFile(resolve(root, "android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="512" android:viewportHeight="512"><path android:fillColor="#174A3A" android:pathData="M356,111C323,84 282,72 239,79 143,94 76,178 81,274c4,81 60,147 136,166 31,8 64,7 94,-3l-23,-59c-20,6 -41,7 -61,1 -49,-14 -84,-57 -87,-109 -3,-61 39,-115 98,-124 25,-4 49,1 69,12l-31,32 112,18 12,-112z"/><path android:fillColor="#35A85C" android:pathData="M356,111C323,84 282,72 239,79 143,94 76,178 81,274c4,81 60,147 136,166 31,8 64,7 94,-3l-23,-59c-20,6 -41,7 -61,1 -49,-14 -84,-57 -87,-109 -3,-61 39,-115 98,-124 25,-4 49,1 69,12l-31,32 112,18 12,-112z" android:strokeColor="#174A3A" android:strokeWidth="12"/><path android:fillColor="#174A3A" android:pathData="M294,147a112,112 0,1 0,0 224a112,112 0,1 0,0 -224"/><path android:fillColor="#FFD45B" android:pathData="M294,154a105,105 0,1 0,0 210a105,105 0,1 0,0 -210" android:strokeColor="#FFF2B1" android:strokeWidth="12"/><path android:fillColor="#174A3A" android:pathData="M324,96c24,-19 57,-15 73,8 15,22 8,53 -15,67 -16,11 -39,11 -54,-1l-23,-18 4,-37z"/><path android:fillColor="#35A85C" android:pathData="M324,96c24,-19 57,-15 73,8 15,22 8,53 -15,67 -16,11 -39,11 -54,-1l-23,-18 4,-37z" android:strokeColor="#174A3A" android:strokeWidth="10"/><path android:fillColor="#173E35" android:pathData="M347,119a8,11 0,1 0,16 0a8,11 0,1 0,-16 0 M370,122a8,11 0,1 0,16 0a8,11 0,1 0,-16 0"/></vector>\n`);

  const splashMarkup = `<body style="margin:0;width:100%;height:100%;display:grid;place-items:center;background:#153f36"><div style="width:min(56vw,260px);height:min(56vw,260px)">${svg}</div></body>`;
  const resRoot = resolve(root, "android/app/src/main/res");
  const splashDirectories = ["drawable", ...(await readdir(resRoot)).filter((name) => /^drawable-(land|port)-/.test(name))];
  for (const directory of splashDirectories) {
    const landscape = directory.includes("-land-");
    const width = landscape ? 800 : 480;
    const height = landscape ? 480 : 800;
    const target = resolve(resRoot, directory, "splash.png");
    await render(splashMarkup, width, height, target);
  }

  const launcherSvg = `<body style="margin:0;width:100%;height:100%;display:grid;place-items:center;background:#20A79B"><div style="width:86%;height:86%">${svg}</div></body>`;
  for (const [name, size] of [["mdpi", 48], ["hdpi", 72], ["xhdpi", 96], ["xxhdpi", 144], ["xxxhdpi", 192]]) {
    const path = resolve(root, `android/app/src/main/res/mipmap-${name}`);
    await render(launcherSvg, size, size, resolve(path, "ic_launcher.png"));
    await render(launcherSvg, size, size, resolve(path, "ic_launcher_round.png"));
  }
  log.log("Generated branding raster assets and Android launcher/splash resources.");
} finally {
  await browser.close();
}