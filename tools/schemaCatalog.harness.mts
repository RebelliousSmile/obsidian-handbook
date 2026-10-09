import assert from "node:assert/strict";
import { SCHEMA_CATALOG, readSchemaCatalog } from "../src/games/catalog";
import topology from "../supervisor/topology.json";
import { SchemaCatalogModal } from "../src/settings/schemaCatalogModal";

assert.deepEqual(SCHEMA_CATALOG.map((source) => source.repository).sort(), topology.repos
	.filter((repo) => repo.role === "provider").map((repo) => repo.repository).sort(),
"installable sources must cover the Supervisor providers");
assert.equal(SCHEMA_CATALOG.length, new Set(SCHEMA_CATALOG.map((source) => source.id)).size);
assert.ok(SCHEMA_CATALOG.every((source) => source.reference.kind === "latest"));
assert.deepEqual(readSchemaCatalog({ manifestVersion: 2, sources: SCHEMA_CATALOG }), []);
const valid = { label: "Example", repository: "owner/repo", reference: { kind: "latest" } };
assert.equal(readSchemaCatalog({ manifestVersion: 1, sources: [valid, valid,
	{ ...valid, repository: "../escape" }, { ...valid, label: " " },
	{ ...valid, repository: "owner/branch", reference: { kind: "branch", value: "main" } }, null,
] }).length, 1, "reject malformed, duplicate and unpublished catalogue entries");

type Row = { name: string; button: { text: string; disabled: boolean; click: () => void } };
const ui = (globalThis as unknown as { catalogUI: { rows: Row[]; notices: string[]; title: string } }).catalogUI;
const installed = new Set<string>();
const calls: string[] = [];
let fail = false;
let finish: (() => void) | undefined;
const plugin = {
	readInstalledSchemaSource: async (source: { id: string }) => installed.has(source.id) ? source : null,
	saveSchemaSource: async (source: { id: string }) => {
		calls.push(source.id);
		await new Promise<void>((resolve) => { finish = resolve; });
		if (fail) throw new Error("network unavailable");
		installed.add(source.id);
	},
};
let changed = 0;
const modal = new SchemaCatalogModal({} as never, plugin as never, () => { changed++; });
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
modal.onOpen();
await tick();
assert.equal(ui.title, "Install game packs");
assert.deepEqual(ui.rows.map((row) => row.name), SCHEMA_CATALOG.map((source) => source.label));
assert.ok(ui.rows.every((row) => row.button.text === "Install" && !row.button.disabled));
ui.rows[1].button.click();
ui.rows[2].button.click();
assert.equal(calls.length, 1, "only the chosen schema installs, even with concurrent clicks");
assert.ok(ui.rows.every((row) => row.button.disabled), "disable installation while a source is pending");
finish!();
await tick();
assert.deepEqual(calls, [SCHEMA_CATALOG[1].id]);
assert.equal(changed, 1);
assert.equal(ui.rows[1].button.text, "Installed");
assert.equal(ui.rows[1].button.disabled, true);
assert.equal(ui.rows[0].button.disabled, false, "keep the catalogue open to install another schema");
fail = true;
ui.rows[0].button.click();
finish!();
await tick();
assert.ok(ui.notices.some((notice) => notice.includes("network unavailable")));
assert.equal(ui.rows[0].button.disabled, false, "failed installation allows retry");
fail = false;
ui.rows[0].button.click();
modal.onClose();
finish!();
await tick();
assert.equal(ui.rows.length, 0, "completion after closing must not repopulate the modal");
assert.equal(changed, 2);
console.log("schema catalogue: providers, independent installs, installed state, concurrency and retry passed");
