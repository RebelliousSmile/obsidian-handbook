import { buildSync } from "esbuild";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const work = mkdtempSync(join(tmpdir(), "handbook-pbta-coverage-"));
const stub = join(work, "obsidian-stub.mjs");
const bundle = join(work, "harness.mjs");
writeFileSync(stub, "export class Notice {} export class Menu {} export class MenuItem {} export class Editor {} export class Plugin {} export class PluginSettingTab {} export class Setting {} export class Modal {} export class ItemView {} export class TFile {} export function setIcon() {}\n");
try {
	buildSync({ entryPoints: ["tools/pbtaPackCoverage.harness.mts"], outfile: bundle, bundle: true, platform: "node", format: "esm", target: "node16", alias: { obsidian: stub }, external: ["fs", "path"], logLevel: "warning" });
	process.exit(spawnSync(process.execPath, [bundle], { stdio: "inherit" }).status ?? 1);
} finally {
	rmSync(work, { recursive: true, force: true });
}
