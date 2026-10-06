import { GAME_PACKS } from "../../games/registry";
import { t } from "../../utils/i18n";

/** How a callout scope reads to the user: "All games", the game's label, or the raw id of an absent pack. */
export function scopeLabel(scope: string): string {
	if (scope === "all") {
		return t("All games");
	}
	return GAME_PACKS.find((p) => p.id === scope)?.label ?? scope;
}
