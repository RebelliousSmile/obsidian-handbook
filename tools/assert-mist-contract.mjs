import { buildSync } from "esbuild";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";

const work = mkdtempSync(join(tmpdir(), "handbook-mist-contract-"));
const stub = join(work, "obsidian-stub.mjs");
const bundle = join(work, "harness.cjs");
writeFileSync(stub, `export class Notice { constructor() {} }
export class Menu {}
export class MenuItem {}
export class Editor {}
export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
export class Modal {}
export class ItemView {}
export function setIcon() {}
`);

try {
    buildSync({
        entryPoints: ["tools/assertMistContract.harness.mts"],
        outfile: bundle,
        bundle: true,
        platform: "node",
        format: "cjs",
        target: "node16",
        alias: { obsidian: stub },
        external: ["fs", "path", "module"],
        logLevel: "warning",
    });
    const run = spawnSync(process.execPath, [bundle], { stdio: "inherit" });
    process.exit(run.status ?? 1);
} finally {
    rmSync(work, { recursive: true, force: true });
}
