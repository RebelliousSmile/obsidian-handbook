import assert from "node:assert/strict";
import { log } from "../src/utils/logger";
import { NATIVE_CALLOUTS } from "../src/features/callouts/nativeCallouts";
import { normalizeSettings } from "../src/settings/types";

log.setLevel("warn");

// Fresh vault: no calloutAliases, no callouts -> the 7 native entries with
// their default aliases.
{
	const settings = normalizeSettings(undefined);
	assert.equal(settings.callouts.length, 7);
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

// An already-migrated `callouts` list with one entry at an unknown scope is
// discarded, warned once, the rest of the list survives.
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
				scope: "not-a-real-game",
				template: "body-only",
				font: "text",
				color: { kind: "fixed", hex: "#e2c6c5" },
				native: false,
				styleKey: "user-secret",
			},
		],
	});

	console.warn = originalWarn;

	assert.equal(settings.callouts.length, 7);
	assert.equal(warnings.length, 1);
	assert.ok(
		settings.callouts.every((c) => c.id !== "user-secret"),
	);
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
	assert.equal(settings.callouts.length, 8);
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
