import { buildSync } from "esbuild";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

// The bundle sits in tools/ so that the external postcss resolves from the project.
const work = mkdtempSync(join(tmpdir(), "handbook-pbta-playbook-styles-"));
const stub = join(work, "obsidian-stub.mjs");
const bundle = resolve("tools", ".assert-pbta-playbook-styles.mjs");
writeFileSync(stub, "export class Notice {} export class Menu {} export class MenuItem {} export class Editor {} export class Plugin {} export class PluginSettingTab {} export class Setting {} export class Modal {} export class ItemView {} export class TFile {} export function setIcon() {} export function getLanguage() { return \"en\"; }\n");
try {
	buildSync({ entryPoints: ["tools/pbtaPlaybookStyles.harness.mts"], outfile: bundle, bundle: true, platform: "node", format: "esm", target: "node16", external: ["fs", "path", "postcss"], alias: { obsidian: stub }, logLevel: "warning" });
	process.exitCode = spawnSync(process.execPath, [bundle], { stdio: "inherit" }).status ?? 1;
} finally {
	rmSync(bundle, { force: true });
	rmSync(work, { recursive: true, force: true });
}
