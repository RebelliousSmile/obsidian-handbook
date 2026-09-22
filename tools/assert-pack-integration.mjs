import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const directory = await mkdtemp(join(tmpdir(), "handbook-pack-integration-"));
const output = join(directory, "assert-pack-integration.cjs");
try {
	await build({
		entryPoints: ["tools/packIntegration.harness.mts"],
		bundle: true,
		platform: "node",
		format: "cjs",
		outfile: output,
		logLevel: "silent",
	});
	await import(pathToFileURL(output).href);
} finally {
	await rm(directory, { recursive: true, force: true });
}
