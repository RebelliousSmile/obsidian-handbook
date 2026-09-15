import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const url = "https://github.com/RebelliousSmile/schema-adrenaline/releases/download/v1.0.0/schema-adrenaline-1.0.0.tgz";
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
assert.equal(packageJson.dependencies["schema-adrenaline"], url);
for (const lock of ["package-lock.json", "pnpm-lock.yaml"]) {
	const content = readFileSync(lock, "utf8");
	assert.ok(content.includes(url), `${lock} must retain the public URL`);
	assert.match(content, /integrity:?[\s\S]{0,120}sha512-|sha512-[A-Za-z0-9+/=]+/, `${lock} must retain SRI`);
	assert.equal(content.includes("release-assets.githubusercontent.com"), false, `${lock} must not persist signed redirects`);
}
const bundle = "tools/.assert-adrenaline-contract.mjs";
const stub = "tools/.obsidian-stub.mjs";
try {
	writeFileSync(stub, "export class Notice {} export class Menu {} export class MenuItem {} export class Editor {} export class Plugin {} export class PluginSettingTab {} export class Setting {} export class Modal {} export class ItemView {} export function setIcon() {}\n");
	buildSync({ entryPoints: ["tools/assertAdrenalineContract.harness.mts"], outfile: bundle, bundle: true, platform: "node", format: "esm", target: "node16", external: ["schema-adrenaline", "postcss", "postcss-selector-parser"], alias: { obsidian: resolve(stub) }, logLevel: "warning" });
	process.exitCode = spawnSync(process.execPath, [bundle], { stdio: "inherit" }).status ?? 1;
} finally { rmSync(bundle, { force: true }); rmSync(stub, { force: true }); }
