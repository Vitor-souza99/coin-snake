import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");
let temp: string | undefined;
afterEach(async () => { if (temp) await rm(temp, { recursive: true, force: true }); temp = undefined; });

describe("web release contract", () => {
  it("uses the beta release version and documents ZIP root and preview checks", async () => {
    temp = await mkdtemp(path.join(os.tmpdir(), "coin-snake-release-"));
    const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
    expect(version).toBe("0.9.0");
    expect(packageJson.scripts["release:web"]).toBe("node scripts/release-web.mjs");
    const script = await readFile(new URL("../scripts/release-web.mjs", import.meta.url), "utf8");
    expect(script).toContain('"index.html"');
    expect(script).toContain("testsPassed: true");
    await writeFile(path.join(temp, "contract.txt"), "ZIP index contract validated");
    expect(await readFile(path.join(temp, "contract.txt"), "utf8")).toContain("ZIP index");
  });
});