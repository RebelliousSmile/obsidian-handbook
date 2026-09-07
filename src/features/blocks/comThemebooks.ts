/** The four kinds of theme a City of Mist card can hold, in book order. */
export const COM_THEME_TYPES = ["mythos", "logos", "extra", "crew"] as const;

export type ComThemeType = (typeof COM_THEME_TYPES)[number];

/** The themebooks of City of Mist, grouped by the type of theme they build. */
export const COM_THEMEBOOKS: Record<ComThemeType, string[]> = {
	mythos: [
		"Adaptation",
		"Bastion",
		"Divination",
		"Expression",
		"Mobility",
		"Relic",
		"Subversion",
	],
	logos: [
		"Defining Event",
		"Defining Relationship",
		"Mission",
		"Personality",
		"Possessions",
		"Routine",
		"Training",
	],
	extra: ["Ally", "Base of Operations", "Ride"],
	crew: ["Crew"],
};

/** Every themebook name, whatever its type, without duplicates. */
export const ALL_COM_THEMEBOOKS: string[] = COM_THEME_TYPES.reduce<string[]>(
	(all, type) => {
		for (const themebook of COM_THEMEBOOKS[type]) {
			if (all.indexOf(themebook) === -1) {
				all.push(themebook);
			}
		}

		return all;
	},
	[],
);

/**
 * Find the type a themebook builds, whatever the case it was written in.
 * Returns `null` for a name the books do not know, so a homebrew themebook
 * still renders, only without a type.
 */
export function findComThemeType(themebook: string): ComThemeType | null {
	const needle = themebook.trim().toLowerCase();

	for (const type of COM_THEME_TYPES) {
		for (const known of COM_THEMEBOOKS[type]) {
			if (known.toLowerCase() === needle) {
				return type;
			}
		}
	}

	return null;
}

export interface RandomComThemebook {
	type: ComThemeType;
	themebook: string;
}

/** Seed an insertion template with a plausible character themebook. */
export function pickRandomComThemebook(): RandomComThemebook {
	const types: ComThemeType[] = ["mythos", "logos"];
	const type = types[Math.floor(Math.random() * types.length)];
	const themebooks = COM_THEMEBOOKS[type];

	return {
		type,
		themebook: themebooks[Math.floor(Math.random() * themebooks.length)],
	};
}
