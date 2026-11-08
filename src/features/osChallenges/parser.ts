import { SchemaMeta } from "../blocks/schemaValues";
import { OsSpecial, OsThreat, OsThemeType } from "../otherscape/types";
import { parseOsProfileDocument } from "./schema";

export interface OsLimit {
	name: string;
	level: number;
	isPolar: boolean;
	isProgress: boolean;
	onMax?: string;
}

export interface OsProfileData {
	kind: "challenge" | "power-set";
	name: string;
	type?: Exclude<OsThemeType, "crew">;
	description?: string;
	scale?: number;
	/** A Challenge's stars of difficulty, printed on its tab; for a power set, the stars it adds, printed `+⊕`. */
	rating?: number;
	/** Further stars printed in parentheses, which only an upgrade threat brings. */
	optionalRating?: number;
	tagsAndStatuses: string[];
	limits: OsLimit[];
	specials: OsSpecial[];
	threats: OsThreat[];
	generalConsequences: string[];
	meta?: SchemaMeta;
}

export const parseOsChallenge = (source: string) => parseOsProfileDocument(source, "challenge");
export const parseOsPowerSet = (source: string) => parseOsProfileDocument(source, "power-set");
