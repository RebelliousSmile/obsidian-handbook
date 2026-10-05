import { MONSTRE_PRESENTATION, type AdrenalinePresentationSection } from "schema-adrenaline/presentation";
import { BlockShape, BlockZone } from "../blocks/shape";

const sections: readonly AdrenalinePresentationSection[] = MONSTRE_PRESENTATION.sections;

/** The sections printed on the state cards, in the descriptor's order. */
export const MONSTER_CARD_SECTIONS = sections.filter((section) => section.cards !== undefined);

/**
 * One zone per published section outside the cards; the sections printed on
 * the principal and secondary cards share one `cards` zone, where the first of
 * them stands in the descriptor's order.
 */
export const adrenalineMonsterShape: BlockShape = {
	block: MONSTRE_PRESENTATION.sheet.id,
	root: "brumes-adrenaline-monstre",
	zones: sections.reduce<BlockZone[]>((zones, section) => {
		if (section.cards === undefined) {
			return zones.concat({
				name: section.id,
				holds: section.blocks.map((block) => block.label).join(", "),
				...(section.showTitle === false ? {} : { heading: section.label }),
				optional: section.id !== "entete",
			});
		}
		if (section !== MONSTER_CARD_SECTIONS[0]) return zones;
		return zones.concat({
			name: "cards",
			holds: `the principal and secondary state cards: ${MONSTER_CARD_SECTIONS.map((card) => card.label).join(", ")}`,
		});
	}, []),
};
