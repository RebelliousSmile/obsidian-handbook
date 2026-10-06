import { CalloutDefinition } from "./types";

export interface CityOfMistCalloutAliases {
	note: string[];
	move: string[];
	description: string[];
	clue: string[];
	redClue: string[];
}

export interface LegendInTheMistCalloutAliases {
	note: string[];
	readAloud: string[];
}

/** The pre-list alias shape a saved `data.json` may still carry. */
export interface BrumesCalloutAliasesSettings {
	cityOfMist: CityOfMistCalloutAliases;
	legendInTheMist: LegendInTheMistCalloutAliases;
}

/**
 * What the callout modules read from the plugin settings. `BrumesSettings`
 * satisfies it structurally, so the callouts never import the settings.
 */
export interface CalloutSettingsView {
	mode: string;
	callouts: CalloutDefinition[];
}
