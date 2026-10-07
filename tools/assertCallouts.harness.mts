import assert from "node:assert/strict";
import { ADRENALINE_VISUAL_CALLOUTS } from "schema-adrenaline/presentation";
import { PBTA_PACK_CALLOUTS, PBTA_VISUAL_CALLOUTS } from "schema-pbta";
import { log } from "../src/utils/logger";
import { NATIVE_CALLOUTS } from "../src/features/callouts/nativeCallouts";
import { isCalloutAvailable } from "../src/features/callouts/types";
import { findAliasCollision } from "../src/features/callouts/collisions";
import { normalizeSettings } from "../src/settings/types";
import { getAvailableCalloutInsertions, insertCallout } from "../src/features/callouts/contextMenu";
import { initGameRegistry } from "../src/games/registry";
import { EMPTY_STYLE } from "../src/games/types";

log.setLevel("warn");

function settingsAliases(id: string): string[] | undefined {
	return normalizeSettings(undefined).callouts.find((entry) => entry.id === id)?.aliases;
}

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
	const pbta = NATIVE_CALLOUTS.filter((entry) => entry.capability === "style:pbta" && entry.scope === "all");
	// Every PbtA callout is published by the schema; none is declared locally.
	assert.equal(pbta.length, PBTA_VISUAL_CALLOUTS.length);
	assert.deepEqual(
		pbta.filter((entry) => PBTA_VISUAL_CALLOUTS.some((definition) => definition.id === entry.id)).map((entry) => entry.id),
		PBTA_VISUAL_CALLOUTS.map((definition) => definition.id),
	);
	assert.equal(pbta.every((entry) => !isCalloutAvailable(entry, "unknown-game", [])), true);
	assert.equal(pbta.every((entry) => isCalloutAvailable(entry, "unknown-game", ["style:pbta"])), true);
}

// A pack publishes its own callouts: each one is visible under its pack with the
// style capability, and nowhere else. The list is read, never counted.
{
	const packIds = PBTA_PACK_CALLOUTS.map((definition): string => definition.pack);
	const ids = PBTA_PACK_CALLOUTS.map((definition): string => definition.id);
	assert.equal(new Set(ids).size, ids.length, "a pack callout id is published once");
	for (const definition of PBTA_PACK_CALLOUTS) {
		const id: string = definition.id;
		const pack: string = definition.pack;
		const entry = NATIVE_CALLOUTS.find((candidate) => candidate.id === id);
		assert.ok(entry, `${id} is published but not defined`);
		assert.equal(entry.scope, pack);
		assert.equal(entry.name, definition.label);
		assert.equal(entry.styleKey, id);
		assert.equal(entry.template, definition.template);
		assert.equal(entry.capability, definition.capability);
		assert.equal(typeof entry.icon, "string");
		assert.deepEqual(entry.aliases, [id]);
		assert.ok(isCalloutAvailable(entry, pack, [definition.capability]), `${id} is missing under ${pack}`);
		assert.ok(!isCalloutAvailable(entry, pack, []), `${id} needs ${definition.capability}`);
		assert.ok(!isCalloutAvailable(entry, "unknown-game", [definition.capability]), `${id} leaks outside ${pack}`);
		for (const other of packIds) {
			if (other !== pack) assert.ok(!isCalloutAvailable(entry, other, [definition.capability]), `${id} leaks into ${other}`);
		}
	}
	// Every native callout scoped to a publishing pack comes from the published list.
	const scoped = NATIVE_CALLOUTS.filter((entry) => packIds.indexOf(entry.scope) !== -1);
	assert.deepEqual(scoped.map((entry) => entry.id), ids);
}

// Saved settings from before the pack callouts gain them, aliases untouched.
{
	const packCalloutIds = PBTA_PACK_CALLOUTS.map((definition): string => definition.id);
	const older = NATIVE_CALLOUTS.filter((entry) => packCalloutIds.indexOf(entry.id) === -1)
		.map((entry) => entry.id === NATIVE_CALLOUTS[0].id ? { ...entry, aliases: ["kept-by-the-user"] } : entry);
	const settings = normalizeSettings({ callouts: older });
	assert.equal(settings.callouts.length, NATIVE_CALLOUTS.length);
	assert.deepEqual(settings.callouts.find((entry) => entry.id === NATIVE_CALLOUTS[0].id)?.aliases, ["kept-by-the-user"]);
	for (const id of packCalloutIds) {
		assert.deepEqual(settings.callouts.find((entry) => entry.id === id)?.aliases, [id]);
	}
}

// The insertion menu of a pack offers its own callouts and none of another pack.
{
	const packIds = PBTA_PACK_CALLOUTS.map((definition): string => definition.pack)
		.filter((pack, index, all) => all.indexOf(pack) === index);
	initGameRegistry(packIds.map((pack) => ({
		pack: { id: pack, label: pack, style: EMPTY_STYLE },
		installation: { version: "1.0.0", root: pack, minimumHandbookVersion: "2.8.0", requires: ["style:pbta"] },
	})));
	const settings = normalizeSettings(undefined);
	for (const pack of packIds) {
		const insertions = getAvailableCalloutInsertions(settings, pack);
		for (const definition of PBTA_PACK_CALLOUTS) {
			const offered = insertions.some((entry) => entry.alias === definition.id);
			assert.equal(offered, definition.pack === pack, `${definition.id} under ${pack}`);
		}
		for (const definition of PBTA_VISUAL_CALLOUTS) {
			assert.ok(insertions.some((entry) => entry.alias === definition.id), `${definition.id} is missing under ${pack}`);
		}
	}
}

// Adrenaline callouts carry the schema's ids and aliases, and need both the
// Adrenaline game and its style capability: their aliases are plain words.
{
	const adrenaline = NATIVE_CALLOUTS.filter((entry) => entry.capability === "style:adrenaline");
	assert.deepEqual(
		adrenaline.map((entry) => [entry.id, entry.styleKey, entry.aliases]),
		ADRENALINE_VISUAL_CALLOUTS.map((definition) => [definition.id, definition.id, [...definition.aliases]]),
	);
	assert.deepEqual(
		settingsAliases("adrenaline-exemple"),
		["exemple", "example"],
	);
	assert.equal(adrenaline.every((entry) => isCalloutAvailable(entry, "adrenaline", ["style:adrenaline"])), true);
	assert.equal(adrenaline.every((entry) => !isCalloutAvailable(entry, "adrenaline", [])), true);
	assert.equal(adrenaline.every((entry) => !isCalloutAvailable(entry, "city-of-mist", ["style:adrenaline"])), true);
}

// Saved settings from before the Adrenaline callouts gain them. A default
// alias the user already claimed is dropped, the other ones are kept.
{
	const adrenalineIds = ADRENALINE_VISUAL_CALLOUTS.map((definition) => definition.id as string);
	const older = NATIVE_CALLOUTS.filter((entry) => adrenalineIds.indexOf(entry.id) === -1);
	const settings = normalizeSettings({
		callouts: [
			...older,
			{ id: "user-example", name: "My example", aliases: ["example"], scope: "adrenaline", template: "title-body", font: "text", color: { kind: "theme" }, native: false, styleKey: "user-example" },
			{ id: "user-action", name: "My action", aliases: ["action"], scope: "adrenaline", template: "title-body", font: "text", color: { kind: "theme" }, native: false, styleKey: "user-action" },
		],
	});
	assert.equal(settings.callouts.length, NATIVE_CALLOUTS.length + 2);
	assert.deepEqual(settings.callouts.find((entry) => entry.id === "adrenaline-exemple")?.aliases, ["exemple"]);
	assert.deepEqual(settings.callouts.find((entry) => entry.id === "adrenaline-action")?.aliases, ["action-2"]);
	assert.deepEqual(settings.callouts.find((entry) => entry.id === "adrenaline-formation")?.aliases, ["formation"]);
	// `description` is City of Mist's alias too, in another scope: no collision.
	assert.deepEqual(settings.callouts.find((entry) => entry.id === "adrenaline-description")?.aliases, ["description"]);
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

// A user id read from data.json must be a safe slug that no native owns.
{
	const base = { scope: "all", template: "title-body", font: "text", color: { kind: "theme" }, native: false };
	const settings = normalizeSettings({
		callouts: [
			{ ...base, id: 'x"]{}', name: "Hostile", aliases: ["hostile"] },
			{ ...base, id: NATIVE_CALLOUTS[0].id, name: "Native twin", aliases: ["twin"] },
			{ ...base, id: "kept-id", name: "Kept", aliases: ["kept"] },
		],
	});
	const hostile = settings.callouts.find((c) => c.aliases.includes("hostile"));
	const twin = settings.callouts.find((c) => c.aliases.includes("twin"));
	const kept = settings.callouts.find((c) => c.aliases.includes("kept"));
	assert.ok(hostile && twin && kept);
	assert.match(hostile.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
	assert.equal(hostile.styleKey, hostile.id);
	assert.notEqual(twin.id, NATIVE_CALLOUTS[0].id);
	assert.equal(kept.id, "kept-id");
}

// The alias collision check is shared by the modal and the native edit.
{
	const callouts = normalizeSettings(undefined).callouts;
	const first = callouts.find((c) => c.aliases.length > 0);
	assert.ok(first);
	const alias = first.aliases[0];
	assert.equal(findAliasCollision(callouts, alias, first.scope)?.id, first.id);
	assert.equal(findAliasCollision(callouts, alias, first.scope, first.id), null);
	assert.equal(findAliasCollision(callouts, "no-such-alias-anywhere", "all"), null);
}

console.log("Callout migration assertions passed.");
