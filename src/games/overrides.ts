import { Plugin } from "obsidian";
import { logScope } from "../utils/logger";
import {
	GameStyleLayer,
	GameStyleTokens,
	GameStyleValues,
} from "./types";

const log = logScope("Games");

/**
 * The file a user writes by hand, in the plugin's own folder in the vault.
 *
 * It is what replaces the sliders Style Settings used to offer: a pack that
 * declares nothing but the values it wants to change, and takes the top over
 * the game's pack for exactly those. Anything it leaves out keeps the game's
 * value, so removing the file returns the rendering to the game untouched.
 */
export const OVERRIDE_FILE_NAME = "overrides.json";

const LAYER_NAMES: (keyof GameStyleValues)[] = ["base", "light", "dark"];
const SLOT_NAMES: (keyof GameStyleLayer)[] = ["note", "workspace"];

export type GameStyleOverride = {
	[K in keyof GameStyleValues]?: {
		[S in keyof GameStyleLayer]?: GameStyleTokens;
	};
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A faulty value costs itself and nothing more, on the model the blocks
 * already follow: it is dropped, reported once, and the rest of the file
 * applies. A hand-written file is expected to be wrong sometimes.
 */
function readTokens(source: unknown, where: string): GameStyleTokens {
	if (!isRecord(source)) {
		log.warn(`Ignoring "${where}" in ${OVERRIDE_FILE_NAME}: not an object.`);
		return {};
	}

	const tokens: GameStyleTokens = {};
	const rejected: string[] = [];

	for (const name of Object.keys(source)) {
		const value = source[name];

		if (name.indexOf("--") !== 0 || typeof value !== "string") {
			rejected.push(name);
			continue;
		}

		tokens[name] = value;
	}

	if (rejected.length > 0) {
		log.warn(
			`Ignoring in ${OVERRIDE_FILE_NAME}, under "${where}": ${rejected.join(
				", ",
			)}. A value is a custom property name and a string.`,
		);
	}

	return tokens;
}

export function parseGameStyleOverride(raw: string): GameStyleOverride {
	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		log.warn(`Could not read ${OVERRIDE_FILE_NAME}, ignoring it.`, error);
		return {};
	}

	if (!isRecord(parsed)) {
		return {};
	}

	// A file may be written as a whole pack, `{ "style": { … } }`, or as the
	// style alone. Both read the same.
	const style = isRecord(parsed.style) ? parsed.style : parsed;
	const override: GameStyleOverride = {};

	for (const layerName of LAYER_NAMES) {
		const layer = style[layerName];
		if (layer === undefined) {
			continue;
		}

		if (!isRecord(layer)) {
			log.warn(
				`Ignoring "${layerName}" in ${OVERRIDE_FILE_NAME}: not an object.`,
			);
			continue;
		}

		const slots: { note?: GameStyleTokens; workspace?: GameStyleTokens } =
			{};

		for (const slotName of SLOT_NAMES) {
			if (layer[slotName] === undefined) {
				continue;
			}

			slots[slotName] = readTokens(
				layer[slotName],
				`${layerName}.${slotName}`,
			);
		}

		override[layerName] = slots;
	}

	return override;
}

function mergeLayer(
	base: GameStyleLayer,
	over: { note?: GameStyleTokens; workspace?: GameStyleTokens } | undefined,
): GameStyleLayer {
	if (!over) {
		return base;
	}

	return {
		note: { ...base.note, ...(over.note ?? {}) },
		workspace: { ...base.workspace, ...(over.workspace ?? {}) },
	};
}

/** The game's values, with the ones the user declared written over them. */
export function mergeGameStyle(
	base: GameStyleValues,
	override: GameStyleOverride,
): GameStyleValues {
	return {
		base: mergeLayer(base.base, override.base),
		light: mergeLayer(base.light, override.light),
		dark: mergeLayer(base.dark, override.dark),
	};
}

function overridePath(plugin: Plugin): string | null {
	const dir = plugin.manifest.dir;
	return dir ? `${dir}/${OVERRIDE_FILE_NAME}` : null;
}

/**
 * Reading fails softly: no file, an unreadable one, or a plugin folder the
 * manifest does not name all lead to an empty override, never to a load
 * failure.
 */
export async function loadGameStyleOverride(
	plugin: Plugin,
): Promise<GameStyleOverride> {
	const path = overridePath(plugin);
	if (!path) {
		return {};
	}

	try {
		const adapter = plugin.app.vault.adapter;

		if (!(await adapter.exists(path))) {
			return {};
		}

		return parseGameStyleOverride(await adapter.read(path));
	} catch (error) {
		log.warn(`Could not read ${OVERRIDE_FILE_NAME}, ignoring it.`, error);
		return {};
	}
}
