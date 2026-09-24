import { buildSync } from "esbuild";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const sourceRoot = resolve(process.env.SCHEMA_ADRENALINE_ROOT ?? "../schema-adrenaline");
if (!existsSync(join(sourceRoot, "handbook/adrenaline/pack.json"))) {
	throw new Error(`schema-adrenaline source pack is missing at ${sourceRoot}`);
}
const work = mkdtempSync(join(tmpdir(), "handbook-adrenaline-source-"));
const stub = join(work, "obsidian-stub.mjs");
const bundle = resolve("tools", ".assert-adrenaline-source.mjs");
writeFileSync(stub, `export class Notice {}
export class Menu {}
export class MenuItem {}
export class Editor {}
export class TFile {}
export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
export class Modal {}
export class ItemView {}
export function setIcon() {}
`);
try {
	buildSync({ entryPoints: ["tools/assertAdrenalineSource.harness.mts"], outfile: bundle, bundle: true, platform: "node", format: "esm", target: "node16", external: ["postcss", "postcss-selector-parser"], alias: { obsidian: stub }, logLevel: "warning" });
	const result = spawnSync(process.execPath, [bundle], { stdio: "inherit", env: { ...process.env, SCHEMA_ADRENALINE_ROOT: sourceRoot } });
	process.exitCode = result.status ?? 1;
} finally {
	rmSync(bundle, { force: true });
	rmSync(work, { recursive: true, force: true });
}
