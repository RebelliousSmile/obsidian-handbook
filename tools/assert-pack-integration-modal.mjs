import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const directory = await mkdtemp(join(tmpdir(), "handbook-pack-integration-modal-"));
const output = join(directory, "assert-pack-integration-modal.cjs");
try {
	await build({
		entryPoints: ["tools/packIntegrationModal.harness.mts"],
		bundle: true,
		platform: "node",
		format: "cjs",
		outfile: output,
		logLevel: "silent",
		plugins: [{
			name: "obsidian-harness",
			setup(buildContext) {
				buildContext.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "harness" }));
				buildContext.onLoad({ filter: /.*/, namespace: "harness" }, () => ({
					contents: `
						const events = globalThis.packIntegrationModalEvents || (globalThis.packIntegrationModalEvents = []);
						class Modal {
							constructor() { this.contentEl = { empty: () => { events.length = 0; }, createEl: (_tag, options) => { events.push((options && options.text) || ""); return {}; } }; }
						}
						class Setting {
							constructor() {}
							setName(value) { events.push(value); return this; }
							setDesc(value) { events.push(value); return this; }
							addButton(callback) { callback({ setButtonText: (value) => { events.push(value); return { onClick: () => undefined }; } }); return this; }
						}
						module.exports = { Modal, Setting };
					`,
					loader: "js",
				}));
			},
		}],
	});
	await import(pathToFileURL(output).href);
} finally {
	await rm(directory, { recursive: true, force: true });
}
