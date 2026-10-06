import { CalloutDefinition, CalloutScope, scopesOverlap } from "./types";

/**
 * The first other callout that already uses `alias` in a scope overlapping
 * `scope`, or null. `selfId` leaves the edited callout out of the search.
 */
export function findAliasCollision(
	callouts: readonly CalloutDefinition[],
	alias: string,
	scope: CalloutScope,
	selfId?: string,
): CalloutDefinition | null {
	return (
		callouts.find(
			(c) => c.id !== selfId && c.aliases.includes(alias) && scopesOverlap(c.scope, scope),
		) ?? null
	);
}
