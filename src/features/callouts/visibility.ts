import { gameRequiredCapabilities } from "../../games/registry";
import { CalloutDefinition, isCalloutAvailable } from "./types";

/**
 * The callouts the active game shows: the one definition behind the alias
 * map, the commands, the insertion menu and the settings tab. `required`
 * defaults to what the game's installation declares.
 */
export function visibleCallouts(
	callouts: readonly CalloutDefinition[],
	activePackId: string,
	required: readonly string[] = gameRequiredCapabilities(activePackId),
): CalloutDefinition[] {
	return callouts.filter((entry) => isCalloutAvailable(entry, activePackId, required));
}
