import assert from "node:assert/strict";
import { PBTA_VISUAL_CALLOUTS } from "schema-pbta";
import { log } from "../src/utils/logger";
import { NATIVE_CALLOUTS } from "../src/features/callouts/nativeCallouts";
import { isCalloutAvailable } from "../src/features/callouts/types";
import { normalizeSettings } from "../src/settings/types";
import { getAvailableCalloutInsertions, insertCallout } from "../src/features/callouts/contextMenu";
import { initGameRegistry } from "../src/games/registry";
import { EMPTY_STYLE } from "../src/games/types";

log.setLevel("warn");

// Fresh vault: no calloutAliases, no callouts -> all native entries with
// their default aliases.
{
	const settings = normalizeSettings(undefined);
	assert.equal(settings.callouts.length, NATIVE_CALLOUTS.length);
	assert.deepEqual(
		settings.callouts.map((c) => c.id),
		NATIVE_CALLOUTS.map((c) => c.id),
	);
	for (const native of NATIVE_CALLOUTS) {
		const migrated = settings.callouts.find((c) => c.id === native.id);
		assert.ok(migrated);
		assert.deepEqual(migrated.aliases, native.aliases);
		assert.equal(migrated.native, true);
	}
}

// Portable callouts follow the manifest capability, independently of game id.
{
	const pbta = NATIVE_CALLOUTS.filter((entry) => entry.capability === "style:pbta");
	assert.equal(pbta.length, 8);
	assert.deepEqual(
		pbta.filter((entry) => PBTA_VISUAL_CALLOUTS.some((definition) => definition.id === entry.id)).map((entry) => entry.id),
		PBTA_VISUAL_CALLOUTS.map((definition) => definition.id),
	);
	assert.equal(pbta.every((entry) => !isCalloutAvailable(entry, "unknown-game", [])), true);
	assert.equal(pbta.every((entry) => isCalloutAvailable(entry, "unknown-game", ["style:pbta"])), true);
}

// Existing saved settings gain the new native entries without changing their
// aliases. A user alias that already claims a default gets priority.
{
	const oldNative = NATIVE_CALLOUTS.filter((entry) => !PBTA_VISUAL_CALLOUTS.some((definition) => definition.id === entry.id));
	const settings = normalizeSettings({
		callouts: [
			...oldNative,
			{ id: "user-clock", name: "My clock", aliases: ["pbta-clock"], scope: "all", template: "title-body", font: "text", color: { kind: "theme" }, native: false, styleKey: "user-clock" },
		],
	});
	assert.equal(settings.callouts.length, NATIVE_CALLOUTS.length + 1);
	assert.deepEqual(settings.callouts.find((entry) => entry.id === "user-clock")?.aliases, ["pbta-clock"]);
	assert.deepEqual(settings.callouts.find((entry) => entry.id === "pbta-clock")?.aliases, ["pbta-clock-2"]);
	for (const definition of PBTA_VISUAL_CALLOUTS) assert.ok(settings.callouts.some((entry) => entry.id === definition.id));
}

// The same published catalogue drives insertions for any installed PbtA pack.
{
	initGameRegistry([
		{ pack: { id: "pbta-test", label: "PbtA test", style: EMPTY_STYLE }, installation: { version: "1.0.0", root: "pbta-test", minimumHandbookVersion: "2.8.0", requires: ["style:pbta"] } },
		{ pack: { id: "other-test", label: "Other test", style: EMPTY_STYLE }, installation: { version: "1.0.0", root: "other-test", minimumHandbookVersion: "2.8.0", requires: [] } },
	]);
	const settings = normalizeSettings(undefined);
	const inPbta = getAvailableCalloutInsertions(settings, "pbta-test");
	const inOther = getAvailableCalloutInsertions(settings, "other-test");
	for (const definition of PBTA_VISUAL_CALLOUTS) {
		const insertion = inPbta.find((entry) => entry.alias === definition.id);
		assert.ok(insertion, `${definition.id} is missing from a PbtA pack`);
		assert.equal(insertion.template, "title-body");
		assert.ok(!inOther.some((entry) => entry.alias === definition.id));
	}
	let markdown = "";
	const editor = {
		getCursor: () => ({ line: 0, ch: 0 }),
		replaceRange: (value: string) => { markdown = value; },
		setSelection: () => undefined,
	};
	insertCallout(editor as never, "pbta-clock", "title-body");
	assert.match(markdown, /^> \[!PBTA-CLOCK\] /);
}

// Old shape with custom aliases on move and redClue migrates exactly onto
// the matching native entries, without touching the others.
{
	const settings = normalizeSettings({
		calloutAliases: {
			cityOfMist: {
				note: ["note", "aside"],
				move: ["move", "action"],
				description: ["description", "read-aloud"],
				clue: ["clue"],
				redClue: ["danger", "red-clue"],
			},
			legendInTheMist: {
				note: ["note"],
				readAloud: ["read-aloud"],
			},
		},
	});

	const move = settings.callouts.find((c) => c.id === "city-of-mist-move");
	const redClue = settings.callouts.find((c) => c.id === "city-of-mist-red-clue");
	const clue = settings.callouts.find((c) => c.id === "city-of-mist-clue");

	assert.deepEqual(move?.aliases, ["move", "action"]);
	assert.deepEqual(redClue?.aliases, ["danger", "red-clue"]);
	assert.deepEqual(clue?.aliases, ["clue"]);
}

// An unsafe scope is discarded and warned once; a safe plugin id is allowed
// even when that plugin is absent, so uninstalling it does not erase data.
{
	const warnings: unknown[][] = [];
	const originalWarn = console.warn;
	console.warn = (...args: unknown[]) => warnings.push(args);

	const settings = normalizeSettings({
		callouts: [
			...NATIVE_CALLOUTS,
			{
				id: "user-secret",
				name: "Secret de faction",
				aliases: ["secret"],
				scope: "../not-a-game",
				template: "body-only",
				font: "text",
				color: { kind: "fixed", hex: "#e2c6c5" },
				native: false,
				styleKey: "user-secret",
			},
		],
	});

	console.warn = originalWarn;

	assert.equal(settings.callouts.length, NATIVE_CALLOUTS.length);
	assert.equal(warnings.length, 1);
	assert.ok(
		settings.callouts.every((c) => c.id !== "user-secret"),
	);
}

{
	const settings = normalizeSettings({
		callouts: [
			...NATIVE_CALLOUTS,
			{
				id: "adrenaline-action",
				name: "Action Adrenaline",
				aliases: ["action-adrenaline"],
				scope: "adrenaline",
				template: "body-only",
				font: "text",
				color: { kind: "theme" },
				native: false,
				styleKey: "adrenaline-action",
			},
		],
	});

	const pluginEntry = settings.callouts.find((c) => c.id === "adrenaline-action");
	assert.ok(pluginEntry);
	assert.equal(pluginEntry.scope, "adrenaline");
}

// A valid user entry at scope "all" survives, keeps its id and gets
// styleKey === id.
{
	const settings = normalizeSettings({
		callouts: [
			...NATIVE_CALLOUTS,
			{
				id: "secret-de-faction",
				name: "Secret de faction",
				aliases: ["secret"],
				scope: "all",
				template: "body-only",
				font: "text",
				color: { kind: "fixed", hex: "#e2c6c5" },
				native: false,
				styleKey: "secret-de-faction",
			},
		],
	});

	const userEntry = settings.callouts.find((c) => c.id === "secret-de-faction");
	assert.ok(userEntry);
	assert.equal(userEntry.styleKey, userEntry.id);
	assert.equal(settings.callouts.length, NATIVE_CALLOUTS.length + 1);
}

// A user entry without a recognized id gets a stable slug generated from its
// name, deduplicated against ids and styleKeys already taken (native
// included), and styleKey is set to that same value.
{
	const settings = normalizeSettings({
		callouts: [
			...NATIVE_CALLOUTS,
			{
				name: "Note",
				aliases: ["custom-note"],
				scope: "otherscape",
				template: "body-only",
				font: "text",
				color: { kind: "theme" },
				native: false,
			},
		],
	});

	const generated = settings.callouts.find(
		(c) => !c.native && c.aliases.includes("custom-note"),
	);
	assert.ok(generated);
	assert.equal(generated.id, "note-2");
	assert.equal(generated.styleKey, "note-2");
}

console.log("Callout migration assertions passed.");
