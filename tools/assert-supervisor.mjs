/**
 * Bundle the supervisor harnesses, then run them: the publication guard
 * first (its rules and both interception paths), then the scenarios.
 *
 * Same motif as the other harnesses: esbuild turns each `.mts` harness into
 * something node runs. `ajv` stays external and resolves from the repository's
 * node_modules, which is why the bundle is written under `tools/`.
 */
import { buildSync } from "esbuild";
import { mkdtempSync, rmSync } from "fs";
import { join, resolve } from "path";
import { spawnSync } from "child_process";

const work = mkdtempSync(resolve("tools", ".supervisor-harness-"));
const harnesses = ["tools/supervisorGuard.harness.mts", "tools/supervisor.harness.mts"];

let status = 0;
try {
	for (const [index, entry] of harnesses.entries()) {
		const bundle = join(work, `harness-${index}.cjs`);
		buildSync({
			entryPoints: [entry],
			outfile: bundle,
			bundle: true,
			platform: "node",
			format: "cjs",
			target: "node18",
			external: ["obsidian", "fs", "ajv"],
			logLevel: "warning",
		});
		const run = spawnSync(process.execPath, [bundle], { stdio: "inherit" });
		if ((run.status ?? 1) !== 0) status = 1;
	}
} finally {
	rmSync(work, { recursive: true, force: true });
}

process.exit(status);
