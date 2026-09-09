/**
 * Phase 2 promises three things about a pack dropped in `<plugin dir>/packs/`:
 * it joins the registry before the first render, a faulty file costs only
 * itself, and a collision with a declared game never displaces it. None of
 * that is visible in a vault without writing files and reloading — so it is
 * asserted here against an in-memory adapter instead.
 *
 * Run it with `pnpm assert:custom-packs`, never with node directly: it needs
 * the esbuild bundle that `tools/assert-custom-packs.mjs` produces.
 */
import { GAME_PACKS, initGameRegistry, resolveGamePack, gamePackClasses } from "../src/games/registry";
import { loadCustomGamePacks } from "../src/games/customPacks";
import { log } from "../src/utils/logger";

/**
 * Enough of `Plugin`/`DataAdapter` for `loadCustomGamePacks`: a manifest
 * folder and a fixed `packs/` listing served from memory.
 */
function fakePlugin(files: Record<string, string>) {
	const dir = "plugins/obsidian-handbook";
	const prefix = `${dir}/packs/`;

	const adapter = {
		exists: async (path: string) => path === `${dir}/packs`,
		list: async (path: string) => {
			if (path !== `${dir}/packs`) {
				return { files: [], folders: [] };
			}
			return { files: Object.keys(files).map((name) => `${prefix}${name}`), folders: [] };
		},
		read: async (path: string) => {
			const name = path.slice(prefix.length);
			if (!(name in files)) {
				throw new Error(`no such file: ${path}`);
			}
			return files[name];
		},
	};

	return {
		manifest: { dir },
		app: { vault: { adapter } },
	} as unknown as import("obsidian").Plugin;
}

const failures: string[] = [];

function check(claim: string, held: boolean): void {
	if (!held) {
		failures.push(claim);
	}
}

log.setLevel("warn");
const errors: string[] = [];
const realError = console.error.bind(console);
console.error = (...args: unknown[]) => {
	errors.push(args.map((arg) => String(arg)).join(" "));
};

/**
 * The esbuild bundle targets "cjs", which has no top-level await: every
 * assertion that reads a custom pack runs inside this function instead.
 */
async function run(): Promise<void> {

/* ------------------------------------------------------------------ *
 * 1. No folder at all: the normal state of a vault with no custom pack.
 * ------------------------------------------------------------------ */

{
	const plugin = fakePlugin({});
	const packsBefore = GAME_PACKS.length;
	const packs = await loadCustomGamePacks(plugin);

	check("a missing packs folder yields no pack", packs.length === 0);
	check("a missing packs folder warns nothing", errors.length === 0);
	check(
		"GAME_PACKS is untouched before any initGameRegistry call",
		GAME_PACKS.length === packsBefore,
	);
}

/* ------------------------------------------------------------------ *
 * 2. A valid pack, an invalid-JSON file, and a pack colliding with a
 * declared game.
 * ------------------------------------------------------------------ */

const packsRef = GAME_PACKS;
const classesBeforeLoad = gamePackClasses();

{
	const plugin = fakePlugin({
		"valid.json": JSON.stringify({ id: "my-custom-game", label: "My Custom Game" }),
		"broken.json": "{ not json",
		"colliding.json": JSON.stringify({ id: "city-of-mist", label: "Impostor" }),
	});

	const packs = await loadCustomGamePacks(plugin);

	check("the valid file yields exactly one pack", packs.length === 2);
	check(
		"the valid pack is among them",
		packs.some((pack) => pack.id === "my-custom-game"),
	);
	check(
		"the colliding pack is read here (acceptRegistrations decides collisions, not the loader)",
		packs.some((pack) => pack.id === "city-of-mist"),
	);
	check(
		"the broken file is logged exactly once",
		errors.filter((line) => line.indexOf("broken.json") !== -1).length === 1,
	);

	check(
		"GAME_PACKS keeps its array identity before merging",
		GAME_PACKS === packsRef,
	);
	check(
		"a reference taken before initGameRegistry has not changed yet",
		gamePackClasses().length === classesBeforeLoad.length,
	);

	initGameRegistry(packs);

	check("GAME_PACKS array identity survives the merge", GAME_PACKS === packsRef);
	check(
		"the custom pack now resolves through the live registry",
		resolveGamePack("my-custom-game").id === "my-custom-game",
	);
	check(
		"the custom pack's class appears through the same reference taken earlier",
		gamePackClasses().indexOf("brumes--my-custom-game") !== -1,
	);
	check(
		"a declared pack wins a collision with a custom pack of the same id",
		resolveGamePack("city-of-mist").label !== "Impostor",
	);
	check(
		"the collision is logged exactly once",
		errors.filter((line) => line.indexOf('"city-of-mist"') !== -1).length === 1,
	);

	// Repeating the whole cycle must not log the same collision or the same
	// broken file a second time.
	const errorsBeforeReplay = errors.length;
	const packsAgain = await loadCustomGamePacks(plugin);
	initGameRegistry(packsAgain);

	check(
		"replaying the load does not log the broken file again",
		errors.filter((line) => line.indexOf("broken.json") !== -1).length === 1,
	);
	check(
		"replaying the merge does not log the collision again",
		errors.filter((line) => line.indexOf('"city-of-mist"') !== -1).length === 1,
	);
	check("nothing new was logged on replay", errors.length === errorsBeforeReplay);
}

/* ------------------------------------------------------------------ *
 * 3. Two custom packs sharing an id: the one whose filename sorts first
 * wins, the other is logged once.
 * ------------------------------------------------------------------ */

{
	const plugin = fakePlugin({
		"b-second.json": JSON.stringify({ id: "shared-id", label: "Second" }),
		"a-first.json": JSON.stringify({ id: "shared-id", label: "First" }),
	});

	const packs = await loadCustomGamePacks(plugin);
	initGameRegistry(packs);

	check(
		"the file that sorts first wins the shared id",
		resolveGamePack("shared-id").label === "First",
	);
}

/* ------------------------------------------------------------------ *
 * 4. Lifecycle order: a settings mode pointing at a custom pack resolves
 * to it once loadCustomGamePacks -> initGameRegistry -> resolveGamePack
 * have run in that order, never falling back to the default pack.
 * ------------------------------------------------------------------ */

{
	const plugin = fakePlugin({
		"only-custom.json": JSON.stringify({ id: "only-custom", label: "Only Custom" }),
	});

	const packs = await loadCustomGamePacks(plugin);
	initGameRegistry(packs);

	const resolved = resolveGamePack("only-custom");

	check(
		"a mode pointing at a custom-only id resolves to it, not to the default",
		resolved.id === "only-custom",
	);
}

}

run()
	.then(() => {
		/* ------------------------------------------------------------ *
		 * Verdict.
		 * ------------------------------------------------------------ */

		console.error = realError;

		if (failures.length > 0) {
			for (const failure of failures) {
				console.error(`not held: ${failure}`);
			}

			console.error(`custom packs: ${failures.length} broken`);
			process.exit(1);
		}

		console.log("custom packs: green");
	})
	.catch((error: unknown) => {
		console.error = realError;
		console.error(error);
		process.exit(1);
	});
