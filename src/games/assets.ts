import { Plugin } from "obsidian";
import { logScope } from "../utils/logger";
import { GameFontFace, GamePack, GameStyleTokens } from "./types";

const log = logScope("Games");

/**
 * The folder a game's illustrations are expected in when its pack does not
 * name one: a subfolder of Handbook's own folder in the vault, one per game.
 * Keeping it there rather than at the vault root means a user's notes are
 * never polluted by files they did not write.
 */
export const DEFAULT_ASSET_ROOT = "assets";

/** The custom property a template reads to find an illustration. */
export function assetVariable(role: string): string {
	return `--brumes-image-${role}`;
}

/**
 * The class posed on the body when a role has no file behind it.
 *
 * The fallback appearance keys off this class rather than off the absence of
 * a value, because dropping an illustration is rarely enough: a card without
 * its frame needs a flat background and a border to stay a card.
 */
export function missingAssetClass(role: string): string {
	return `brumes-missing--${role}`;
}

/** The `format()` hint a face needs, by the extension of its file. */
const FONT_FORMATS: Record<string, string> = {
	woff2: "woff2",
	woff: "woff",
	ttf: "truetype",
	otf: "opentype",
};

export interface GameAssetState {
	/** The pack these were resolved for, so a stale state is never used. */
	packId: string;
	/** One `--brumes-image-<role>` per file actually present. */
	tokens: GameStyleTokens;
	/** The roles the pack declares, in declaration order. */
	roles: string[];
	/** The roles whose file is absent, and the path each was looked for at. */
	missing: { role: string; path: string }[];
	/** Where the files are expected, to show the user in the settings tab. */
	folder: string;
	/** The `@font-face` rules of the faces actually present, ready to write. */
	fontCss: string;
	/** The families the pack asks for, in declaration order. */
	families: string[];
	/** The families whose file is absent, and the path each was looked for at. */
	missingFonts: { family: string; path: string }[];
}

export function emptyAssetState(packId: string): GameAssetState {
	return {
		packId,
		tokens: {},
		roles: [],
		missing: [],
		folder: "",
		fontCss: "",
		families: [],
		missingFonts: [],
	};
}

/**
 * Every role a game illustrates, across all the games the plugin knows.
 *
 * A pack that omits a role one of the partials draws would otherwise leave the
 * ornament in place with nothing behind it — a box reserved for an image that
 * never comes. The catalogue is the union of what the packs declare rather
 * than a list kept by hand: a role exists here from the moment one game names
 * it, and the fallback covers it for every game that does not.
 */
export function styledAssetRoles(packs: GamePack[]): string[] {
	const roles: string[] = [];

	for (const pack of packs) {
		const images = pack.assets?.images;
		if (!images) {
			continue;
		}

		for (const role of Object.keys(images)) {
			if (roles.indexOf(role) === -1) {
				roles.push(role);
			}
		}
	}

	return roles;
}

/**
 * The roles the active game has no file behind, whether it declared one and
 * the file is absent or it declared nothing at all. Both are the same thing to
 * a template: a variable with no value.
 */
export function missingAssetRoles(
	state: GameAssetState,
	packs: GamePack[],
): string[] {
	const missing: string[] = [];

	for (const role of styledAssetRoles(packs)) {
		if (state.tokens[assetVariable(role)] === undefined) {
			missing.push(role);
		}
	}

	return missing;
}

/**
 * A path is joined, never interpolated blindly: a pack declaring an absolute
 * path or one climbing out of its folder would reach files that are none of
 * its business.
 */
function joinVaultPath(root: string, name: string): string | null {
	const clean = name.replace(/\\/g, "/").replace(/^\/+/, "");

	if (clean.length === 0 || clean.indexOf("..") !== -1) {
		return null;
	}

	const base = root.replace(/\/+$/, "");
	return base.length > 0 ? `${base}/${clean}` : clean;
}

function assetFolder(plugin: Plugin, pack: GamePack): string | null {
	const declared = pack.assets?.root;

	if (declared) {
		const clean = declared.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
		return clean.indexOf("..") === -1 ? clean : null;
	}

	const dir = plugin.manifest.dir;
	return dir ? `${dir}/${DEFAULT_ASSET_ROOT}/${pack.id}` : null;
}

/**
 * Look for every file the pack declares: an illustration becomes a custom
 * property the SCSS already reads, a typeface becomes an `@font-face` rule
 * the plugin writes into the style element it owns.
 *
 * The existence check runs once per game switch, not once per render: a block
 * asks the style for a variable, and the style either has it or does not.
 * A missing file costs its own illustration and nothing else — never a load
 * failure, never a broken image in a note. A missing typeface costs no more:
 * every token names a fallback after the family.
 */
export async function resolveGameAssets(
	plugin: Plugin,
	pack: GamePack,
): Promise<GameAssetState> {
	const state = emptyAssetState(pack.id);
	const images = pack.assets?.images;
	const fonts = pack.assets?.fonts;

	if (!images && !fonts) {
		return state;
	}

	const folder = assetFolder(plugin, pack);
	if (!folder) {
		log.warn(
			`No folder to look for the files of "${pack.id}" in; they are skipped.`,
		);
		return state;
	}

	state.folder = folder;

	const root = folder;
	const adapter = plugin.app.vault.adapter;

	async function locate(name: string): Promise<string | null> {
		const path = joinVaultPath(root, name);
		if (!path) {
			return null;
		}

		try {
			return (await adapter.exists(path)) ? path : null;
		} catch (error) {
			log.warn(`Could not look for ${path}.`, error);
			return null;
		}
	}

	if (images) {
		for (const role of Object.keys(images)) {
			state.roles.push(role);

			const declared = images[role];
			const path = await locate(declared);

			if (!path) {
				state.missing.push({ role, path: `${folder}/${declared}` });
				continue;
			}

			// The resource path is what the sandbox lets CSS load; a path
			// relative to the stylesheet would resolve against the app, not
			// the vault.
			state.tokens[assetVariable(role)] =
				`url("${adapter.getResourcePath(path)}")`;
		}

		if (state.missing.length > 0) {
			log.info(
				`${state.missing.length} of ${state.roles.length} illustrations of "${pack.id}" are not in the vault yet; those blocks render plain.`,
			);
		}
	}

	if (fonts) {
		const faces: string[] = [];

		for (const family of Object.keys(fonts)) {
			state.families.push(family);

			const face = readFontFace(fonts[family]);
			const path = await locate(face.file);

			if (!path) {
				state.missingFonts.push({
					family,
					path: `${folder}/${face.file}`,
				});
				continue;
			}

			faces.push(
				renderFontFace(family, face, adapter.getResourcePath(path)),
			);
		}

		state.fontCss = faces.join("\n\n");

		if (state.missingFonts.length > 0) {
			log.info(
				`${state.missingFonts.length} of ${state.families.length} typefaces of "${pack.id}" are not in the vault yet; the fallback of each stack takes over.`,
			);
		}
	}

	return state;
}

function readFontFace(declared: string | GameFontFace): GameFontFace {
	return typeof declared === "string" ? { file: declared } : declared;
}

/**
 * A family name reaches the sheet as written by the pack, so it is quoted and
 * stripped of what would end the declaration early. The URL comes from the
 * vault adapter and is left alone.
 */
function renderFontFace(
	family: string,
	face: GameFontFace,
	url: string,
): string {
	const extension = face.file.split(".").pop() ?? "";
	const format = FONT_FORMATS[extension.toLowerCase()];
	const source = format
		? `url("${url}") format("${format}")`
		: `url("${url}")`;

	const lines = [
		`\tfont-family: "${clean(family)}";`,
		`\tsrc: ${source};`,
		"\tfont-display: swap;",
	];

	if (face.style) {
		lines.splice(1, 0, `\tfont-style: ${clean(face.style)};`);
	}

	if (face.weight) {
		lines.splice(1, 0, `\tfont-weight: ${clean(face.weight)};`);
	}

	return `@font-face {\n${lines.join("\n")}\n}`;
}

function clean(value: string): string {
	return value.replace(/["{};<>]/g, "");
}
