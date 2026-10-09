import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const directory = await mkdtemp(join(tmpdir(), "handbook-schema-catalog-"));
const output = join(directory, "harness.mjs");
try {
	await build({
		entryPoints: ["tools/schemaCatalog.harness.mts"], bundle: true,
		platform: "node", format: "esm", outfile: output, logLevel: "silent",
		plugins: [{ name: "obsidian-harness", setup(context) {
			context.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "harness" }));
			context.onLoad({ filter: /.*/, namespace: "harness" }, () => ({ contents: `
				const ui = globalThis.catalogUI = { rows: [], notices: [] };
				export const getLanguage = () => "en";
				export class Modal {
					contentEl = { empty: () => { ui.rows = []; }, createEl: () => ({}) };
					setTitle(value) { ui.title = value; }
				}
				export class Notice { constructor(text) { ui.notices.push(text); } hide() {} }
				export class Setting {
					constructor() { ui.rows.push(this); }
					setName(value) { this.name = value; return this; }
					setDesc(value) { this.description = value; return this; }
					addButton(callback) {
						this.button = {
							setButtonText(value) { this.text = value; return this; },
							setDisabled(value) { this.disabled = value; return this; },
							onClick(value) { this.click = value; return this; }
						};
						callback(this.button); return this;
					}
				}
			`, loader: "js" }));
		} }],
	});
	await import(pathToFileURL(output).href);
} finally {
	await rm(directory, { recursive: true, force: true });
}
