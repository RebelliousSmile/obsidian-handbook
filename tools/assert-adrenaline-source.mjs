import { buildSync } from "esbuild";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = process.cwd();
const candidates = [];
if (process.env.SCHEMA_ADRENALINE_ROOT) {
	candidates.push(resolve(process.env.SCHEMA_ADRENALINE_ROOT));
}
candidates.push(resolve(projectRoot, "..", "schema-adrenaline"));

const common = spawnSync("git", ["rev-parse", "--git-common-dir"], {
	cwd: projectRoot,
	encoding: "utf8",
});
if (common.status === 0) {
	const commonDirectory = resolve(projectRoot, common.stdout.trim());
	candidates.push(resolve(dirname(dirname(commonDirectory)), "schema-adrenaline"));
}

const sourceRoot = candidates.find((candidate) =>
	existsSync(join(candidate, "src", "zod", "constants.ts")),
);
if (!sourceRoot) {
	console.error(
		`schema-adrenaline was not found. Tried:\n${candidates.join("\n")}\nSet SCHEMA_ADRENALINE_ROOT to its checkout.`,
	);
	process.exit(1);
}

const tsx = join(sourceRoot, "node_modules", ".bin", "tsx");
if (!existsSync(tsx)) {
	console.error(
		`schema-adrenaline dependencies are missing at ${sourceRoot}. Run npm ci there after obtaining permission, then retry.`,
	);
	process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), "handbook-adrenaline-source-"));
const stub = join(work, "obsidian-stub.mjs");
const bundle = join(work, "assert.mjs");
writeFileSync(
	stub,
	`export class Notice { constructor() {} }
export class Menu {}
export class MenuItem {}
export class Editor {}
export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
export class Modal {}
export class ItemView {}
export function setIcon() {}
`,
);

try {
	buildSync({
		entryPoints: ["tools/assertAdrenalineSource.harness.mts"],
		outfile: bundle,
		bundle: true,
		platform: "node",
		format: "esm",
		target: "node16",
		alias: { obsidian: stub },
		logLevel: "warning",
	});
	const run = spawnSync(tsx, [bundle], {
		stdio: "inherit",
		env: { ...process.env, SCHEMA_ADRENALINE_ROOT: sourceRoot },
	});
	process.exitCode = run.status ?? 1;
} finally {
	rmSync(work, { recursive: true, force: true });
}
