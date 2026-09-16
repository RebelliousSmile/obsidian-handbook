import { build } from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const temporaryDirectory = await mkdtemp(
	join(tmpdir(), "handbook-layout-regions-"),
);
const output = join(temporaryDirectory, "assert-layout-regions.mjs");
const stylesheet = join(temporaryDirectory, "styles.css");

try {
	await build({
		entryPoints: ["tools/layoutRegions.harness.mts"],
		bundle: true,
		platform: "node",
		format: "esm",
		outfile: output,
		logLevel: "silent",
	});
	await import(pathToFileURL(output).href);
	await build({
		entryPoints: ["src/styles/styles.scss"],
		outfile: stylesheet,
		bundle: true,
		loader: { ".scss": "css" },
		plugins: [sassPlugin({ type: "css" })],
		logLevel: "silent",
	});
	const css = await readFile(stylesheet, "utf8");
	for (const fragment of [
		".handbook-layout-region {",
		"--handbook-layout-columns: 1",
		"grid-template-columns: repeat(var(--handbook-layout-columns), minmax(0, 1fr))",
		".handbook-layout-region > .handbook-layout-column",
		".markdown-preview-section:has(> .handbook-layout-region)",
		"container-type: inline-size",
		"@container (max-width: 640px)",
		"grid-template-columns: minmax(0, 1fr)",
	]) {
		if (!css.includes(fragment)) {
			throw new Error(`Missing layout-region CSS: ${fragment}`);
		}
	}
} finally {
	await rm(temporaryDirectory, { recursive: true, force: true });
}
