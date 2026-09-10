/**
 * Stable capabilities that a declarative game plugin may require from its
 * Handbook host. This catalogue stays independent from the block registry:
 * the latter imports the game registry, so importing it here would create a
 * cycle during startup. The custom-pack harness checks the block entries
 * against BRUMES_BLOCKS instead.
 */
export const GAME_PLUGIN_BLOCK_CAPABILITIES = [
	"block:theme-card",
	"block:litm-challenge",
	"block:litm-journey",
	"block:litm-theme-kit",
	"block:com-theme-card",
	"block:com-danger",
	"block:os-theme",
	"block:os-theme-kit",
	"block:os-challenge",
	"block:os-power-set",
	"block:os-character-trope",
	"block:os-loadout-item",
	"block:adrenaline-pj",
	"block:adrenaline-pnj",
	"block:adrenaline-monstre",
] as const;

/** Structural SCSS supplied by Handbook and merely activated by a game pack. */
export const GAME_PLUGIN_STYLE_CAPABILITIES = [
	"style:city-of-mist",
	"style:legend-in-the-mist",
	"style:otherscape",
	"style:adrenaline",
] as const;

export const GAME_PLUGIN_CAPABILITIES: readonly string[] = [
	...GAME_PLUGIN_BLOCK_CAPABILITIES,
	...GAME_PLUGIN_STYLE_CAPABILITIES,
];

export function missingGamePluginCapabilities(
	required: string[],
): string[] {
	return required.filter(
		(capability) => !GAME_PLUGIN_CAPABILITIES.includes(capability),
	);
}
