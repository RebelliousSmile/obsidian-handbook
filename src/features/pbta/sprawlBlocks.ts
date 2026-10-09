import {
	parseTheSprawlCorporationToml,
	parseTheSprawlMatrixToml,
	parseTheSprawlMissionToml,
	parseTheSprawlResourceToml,
	parseTheSprawlThreatToml,
	stringifyTheSprawlCorporationToml,
	stringifyTheSprawlMatrixToml,
	stringifyTheSprawlMissionToml,
	stringifyTheSprawlResourceToml,
	stringifyTheSprawlThreatToml,
	type TheSprawlCorporation,
	type TheSprawlMatrix,
	type TheSprawlMission,
	type TheSprawlResource,
	type TheSprawlThreat,
} from "schema-pbta";
import type { BrumesBlock } from "../blocks/types";
import { renderSprawlCorporation, renderSprawlResource, renderSprawlThreat } from "./sprawlCard";
import { renderSprawlMatrix } from "./sprawlMatrix";
import { renderSprawlMission } from "./sprawlMission";
import { pbtaSprawlCardShape, pbtaSprawlMatrixShape, pbtaSprawlMissionShape } from "./shape";

/** The specialised targets these blocks resolve from a document alone: a matrix sheet, a mission and the three cards. */
export const PBTA_SPRAWL_PROJECTED_TARGETS: readonly string[] = [
	"the-sprawl-matrix",
	"the-sprawl-mission",
	"the-sprawl-threat",
	"the-sprawl-corporation",
	"the-sprawl-resource",
];

/** A card of the Master of Ceremonies, with the target that read it: the target picks the rendering. */
export type ResolvedSprawlCard =
	| { target: "the-sprawl-threat"; data: TheSprawlThreat }
	| { target: "the-sprawl-corporation"; data: TheSprawlCorporation }
	| { target: "the-sprawl-resource"; data: TheSprawlResource };

function tryParse<T>(parse: (source: string) => T, source: string): T | null {
	try {
		return parse(source);
	} catch {
		return null;
	}
}

/**
 * The three cards share one fence. A threat is told apart by its type; a corporation and a resource
 * differ by the fields they carry, and a card with neither holds nothing the two would draw differently.
 */
export function parseSprawlCardToml(source: string): ResolvedSprawlCard | null {
	const threat = tryParse(parseTheSprawlThreatToml, source);
	if (threat) return { target: "the-sprawl-threat", data: threat };
	const corporation = tryParse(parseTheSprawlCorporationToml, source);
	if (corporation) return { target: "the-sprawl-corporation", data: corporation };
	const resource = tryParse(parseTheSprawlResourceToml, source);
	if (resource) return { target: "the-sprawl-resource", data: resource };
	return null;
}

export function stringifySprawlCardToml(card: ResolvedSprawlCard): string {
	switch (card.target) {
		case "the-sprawl-threat": return stringifyTheSprawlThreatToml(card.data);
		case "the-sprawl-corporation": return stringifyTheSprawlCorporationToml(card.data);
		case "the-sprawl-resource": return stringifyTheSprawlResourceToml(card.data);
	}
}

export const sprawlMatrixBlock: BrumesBlock<TheSprawlMatrix> = {
	id: "sprawl-matrix",
	capability: "block:sprawl-matrix",
	flag: "pbtaParser",
	label: "Sprawl matrix sheet",
	icon: "cpu",
	shape: pbtaSprawlMatrixShape,
	parse: (source) => tryParse(parseTheSprawlMatrixToml, source),
	render: (data, doc) => renderSprawlMatrix(data, doc),
	template: (settings) => `\`\`\`sprawl-matrix\nslug = "new-avatar"\nname = "New avatar"\ngame = "${settings.mode}"\n\`\`\`\n`,
};

export const sprawlMissionBlock: BrumesBlock<TheSprawlMission> = {
	id: "sprawl-mission",
	capability: "block:sprawl-mission",
	flag: "pbtaParser",
	label: "Sprawl mission",
	icon: "briefcase",
	shape: pbtaSprawlMissionShape,
	parse: (source) => tryParse(parseTheSprawlMissionToml, source),
	render: (data, doc) => renderSprawlMission(data, doc),
	template: (settings) => `\`\`\`sprawl-mission\nslug = "new-mission"\nname = "New mission"\ngame = "${settings.mode}"\n\`\`\`\n`,
};

export const sprawlCardBlock: BrumesBlock<ResolvedSprawlCard> = {
	id: "sprawl-card",
	capability: "block:sprawl-card",
	flag: "pbtaParser",
	label: "Sprawl MC card",
	icon: "id-card",
	shape: pbtaSprawlCardShape,
	parse: parseSprawlCardToml,
	render: (card, doc) => {
		switch (card.target) {
			case "the-sprawl-threat": return renderSprawlThreat(card.data, doc);
			case "the-sprawl-corporation": return renderSprawlCorporation(card.data, doc);
			case "the-sprawl-resource": return renderSprawlResource(card.data, doc);
		}
	},
	template: (settings) => `\`\`\`sprawl-card\nslug = "new-threat"\nname = "New threat"\ngame = "${settings.mode}"\nthreatType = "group"\n\`\`\`\n`,
};

export const sprawlMatrixToToml = stringifyTheSprawlMatrixToml;
export const sprawlMissionToToml = stringifyTheSprawlMissionToml;
export const sprawlCardToToml = stringifySprawlCardToml;
