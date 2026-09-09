import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const temporaryDirectory = await mkdtemp(join(tmpdir(), "handbook-tag-widget-"));
const output = join(temporaryDirectory, "assert-tag-widget.mjs");

try {
	await build({
		entryPoints: ["tools/assertTagWidget.harness.mts"],
		bundle: true,
		platform: "node",
		format: "esm",
		outfile: output,
		logLevel: "silent",
	});
	await import(output);
} finally {
	await rm(temporaryDirectory, { recursive: true, force: true });
}
