import { execFileSync } from "node:child_process";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile, access } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { version } = require("../package.json");
const releaseVersion = process.env.RELEASE_VERSION || `${version}-beta`;
const releaseDir = path.join(root, "release", releaseVersion);
const distDir = path.join(root, "dist");
const zipPath = path.join(releaseDir, `coin-snake-web-${releaseVersion}.zip`);
const npmCommand = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
if (version !== "0.9.0") throw new Error(`Expected package version 0.9.0, got ${version}.`);
if (!releaseVersion.startsWith("0.9.0-beta")) throw new Error(`Unexpected beta release version: ${releaseVersion}`);
if (process.env.VITE_ANALYTICS_ENABLED === "true" && (!process.env.VITE_POSTHOG_KEY || !process.env.VITE_POSTHOG_HOST)) throw new Error("VITE_ANALYTICS_ENABLED=true requires VITE_POSTHOG_KEY and VITE_POSTHOG_HOST.");

const env = { ...process.env, VITE_BUILD_CHANNEL: "itch-web" };
for (const script of ["typecheck", "test", "lint", "build"]) {
  const result = process.platform === "win32"
    ? spawnSync(npmCommand, ["/d", "/s", "/c", "npm", "run", script], { cwd: root, stdio: "inherit", env })
    : spawnSync(npmCommand, ["run", script], { cwd: root, stdio: "inherit", env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (process.env.VITE_FEEDBACK_URL) {
  const feedback = new URL(process.env.VITE_FEEDBACK_URL);
  if (feedback.protocol !== "https:") throw new Error("VITE_FEEDBACK_URL must use HTTPS.");
}
if (process.env.VITE_PRIVACY_URL) {
  const privacy = new URL(process.env.VITE_PRIVACY_URL);
  if (privacy.protocol !== "https:") throw new Error("VITE_PRIVACY_URL must use HTTPS.");
}

const html = await readFile(path.join(distDir, "index.html"), "utf8");
if (!html.trim() || !/<script\b/i.test(html)) throw new Error("dist/index.html is empty or missing the application entry point.");
if (!/<script\b[^>]*src="\.\//i.test(html) || !/<link\b[^>]*href="\.\//i.test(html)) throw new Error("Built script and stylesheet URLs must be relative; check Vite base configuration.");

await mkdir(releaseDir, { recursive: true });
await rm(zipPath, { force: true });
const files = await readdir(distDir, { recursive: true, withFileTypes: true });
const entries = files.filter((entry) => entry.isFile()).map((entry) => ({ entry, relative: path.relative(distDir, path.join(entry.parentPath, entry.name)) }));
if (!entries.some(({ relative }) => relative === "index.html")) throw new Error("dist/index.html must be at the ZIP root.");
for (const entry of entries) await access(path.join(distDir, entry.relative));

execFileSync("powershell.exe", ["-NoProfile", "-Command", `Compress-Archive -Path '${distDir.replaceAll("'", "''")}\\*' -DestinationPath '${zipPath.replaceAll("'", "''")}' -CompressionLevel Optimal`], { cwd: root, stdio: "inherit" });
const zipListing = execFileSync("tar.exe", ["-tf", zipPath], { cwd: root, encoding: "utf8" });
const zipEntries = zipListing.split(/\r?\n/).filter(Boolean).map((entry) => entry.replaceAll("\\", "/"));
const normalizeEntry = (entry) => entry.replaceAll("\\", "/").replace(/^\.\//, "");
if (!zipEntries.includes("index.html")) throw new Error("ZIP validation failed: index.html is not at the archive root.");
for (const entry of entries) if (!zipEntries.includes(normalizeEntry(entry.relative))) throw new Error(`ZIP validation failed: missing ${entry.relative}`);

const commit = (() => { try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); } catch { return null; } })();
const manifest = { version: releaseVersion, buildChannel: "itch-web", buildDate: new Date().toISOString(), gitCommit: commit, testsPassed: true, typecheckPassed: true, lintPassed: true, buildPassed: true, artifact: path.basename(zipPath), sha256: execFileSync("certutil", ["-hashfile", zipPath, "SHA256"], { cwd: root, encoding: "utf8" }).split(/\r?\n/)[1]?.trim() ?? null };
await writeFile(path.join(releaseDir, "release.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Release ZIP created: ${path.relative(root, zipPath)} (index.html at archive root)`);