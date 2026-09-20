import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

/* Read the pin, do not restate it: the lockfiles are checked against package.json, not against a literal. */
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const url = packageJson.dependencies["schema-adrenaline"];
assert.ok(
	url.startsWith("https://github.com/") &&
		url.includes("/schema-adrenaline/releases/download/v") &&
		url.endsWith(".tgz"),
	`schema-adrenaline must be pinned to a public release asset, found ${url}`,
);
/* pnpm-lock.yaml is the only lockfile this repo tracks, so it is the only one a clean checkout has.
   Asserting on package-lock.json passed here and could never pass in CI: an untracked file cannot be
   read by a job that never wrote it. */
const lock = "pnpm-lock.yaml";
const content = readFileSync(lock, "utf8");
const redirectEntry = content.slice(
	content.lastIndexOf("schema-adrenaline@"),
	content.indexOf("\n  schema-in-the-mist@", content.lastIndexOf("schema-adrenaline@")),
);
assert.ok(content.includes(url), `${lock} must retain the public URL`);
assert.match(content, /integrity:?[\s\S]{0,120}sha512-|sha512-[A-Za-z0-9+/=]+/, `${lock} must retain SRI`);
assert.equal(redirectEntry.includes("release-assets.githubusercontent.com"), false, `${lock} must not persist signed redirects for schema-adrenaline`);
const bundle = "tools/.assert-adrenaline-contract.mjs";
const stub = "tools/.obsidian-stub.mjs";
try {
	writeFileSync(stub, "export class Notice {} export class Menu {} export class MenuItem {} export class Editor {} export class Plugin {} export class PluginSettingTab {} export class Setting {} export class Modal {} export class ItemView {} export class TFile {} export function setIcon() {}\n");
	buildSync({ entryPoints: ["tools/assertAdrenalineContract.harness.mts"], outfile: bundle, bundle: true, platform: "node", format: "esm", target: "node16", external: ["schema-adrenaline", "postcss", "postcss-selector-parser"], alias: { obsidian: resolve(stub) }, logLevel: "warning" });
	process.exitCode = spawnSync(process.execPath, [bundle], { stdio: "inherit" }).status ?? 1;
} finally { rmSync(bundle, { force: true }); rmSync(stub, { force: true }); }
