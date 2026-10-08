/**
 * A guard that measures a pin, a version or a train holds no frozen figure:
 * it reads the source that declares the value (`guardsByRole.mjs`).
 *
 * First the detector is proved on test guards (the harness, bundled on the
 * motif of the other harnesses), then it reads the guards of the repository.
 */
import { buildSync } from "esbuild";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { join, resolve } from "path";
import { spawnSync } from "child_process";
import { describeLiterals, GUARDS } from "./guardsByRole.mjs";

const work = mkdtempSync(resolve("tools", ".guards-by-role-harness-"));

let status = 0;
try {
	const bundle = join(work, "harness.cjs");
	buildSync({
		entryPoints: ["tools/guardsByRole.harness.mts"],
		outfile: bundle,
		bundle: true,
		platform: "node",
		format: "cjs",
		target: "node18",
		external: ["obsidian", "fs"],
		logLevel: "warning",
	});
	const run = spawnSync(process.execPath, [bundle], { stdio: "inherit" });
	status = run.status ?? 1;
} finally {
	rmSync(work, { recursive: true, force: true });
}

if (status === 0) {
	const files = {};
	for (const path of GUARDS) files[path] = readFileSync(path, "utf8");
	const literals = describeLiterals(files);
	if (literals.length > 0) {
		console.error(literals.join("\n"));
		console.error(`assert:guards-by-role: ${literals.length} frozen figure(s) in ${GUARDS.length} guard(s)`);
		status = 1;
	} else {
		console.log(`assert:guards-by-role: ${GUARDS.length} guard(s) hold no frozen figure.`);
	}
}

process.exit(status);
