import { logScope } from "../../utils/logger";

const log = logScope("Blocks");

/**
 * The named zones a block is made of.
 *
 * The boundary this file draws, and that nothing may cross: a zone says
 * **what a block holds and in what order**. The SCSS says **where it sits and
 * how big it is**. There is no geometry here, no colour, no serialized CSS —
 * a consumer that is not Handbook must be able to draw a block from this
 * vocabulary alone, with its own layout engine or none at all.
 *
 * That is also why the shapes below describe what the renderers already do
 * rather than what they ought to do. A shape that corrected the screen would
 * be a redesign wearing a vocabulary's clothes.
 */
export interface BlockZone {
	/**
	 * The zone's name, unique within its shape, in kebab-case. The class the
	 * renderer poses is built from it, so renaming a zone renames a class the
	 * partials target.
	 */
	name: string;
	/** What the zone holds, in words a reader can check against the screen. */
	holds: string;
	/**
	 * The illustration role the zone carries, when it carries one — the
	 * `--brumes-image-<role>` custom property the partial reads.
	 *
	 * Degrading is not this zone's job. A role with no file behind it already
	 * puts `brumes-missing--<role>` on the body
	 * (`setBrumesMissingAssetClasses`), and `_fallbacks.scss` answers it by
	 * flattening the zone: a background and a border instead of the frame,
	 * never an empty box reserved for an image that is not coming.
	 */
	image?: string;
	/** True when the renderer leaves the zone out rather than drawing it empty. */
	optional?: boolean;
}

export interface BlockShape {
	/**
	 * The class the block's outermost element carries. Written out rather than
	 * derived from the block id: the ids and the classes disagree by history
	 * (`theme-card` draws `brumes-story-theme`), and the presets already in a
	 * user's vault target the classes.
	 */
	root: string;
	/** The illustration role of the block itself, when the frame is an image. */
	image?: string;
	/** The zones, in the order the renderer poses them. */
	zones: BlockZone[];
	/**
	 * What the renderer does that no zone describes.
	 *
	 * Written down rather than smoothed over. Every line here is a place where
	 * the vocabulary is too thin for the screen, and knowing which is the
	 * point: a consumer reads them as "there is more here than I can draw",
	 * and the next phase reads them as the list of what a game pack would have
	 * to reach in order to be worth reaching.
	 */
	gaps?: string[];
}

/** The class a zone's element carries. */
export function zoneClass(shape: BlockShape, zone: BlockZone): string {
	return `${shape.root}--${zone.name}`;
}

/** The zone of that name, or null. Shapes are short; a scan is the honest cost. */
export function findZone(shape: BlockShape, name: string): BlockZone | null {
	for (const zone of shape.zones) {
		if (zone.name === name) {
			return zone;
		}
	}

	return null;
}

/**
 * Build one zone. Returning null means the zone is not drawn this time — an
 * optional zone with nothing to hold.
 */
export type ZoneBuilder = (zone: BlockZone) => HTMLElement | null;

/** Zones a shape declares and no renderer builds, warned about once each. */
const ORPHANS = new Set<string>();

/**
 * Pose the zones of a shape, in the order the shape declares them.
 *
 * The order on screen is the order in the shape, not the order the renderer
 * happens to write its code in — that is the whole reason to walk the list
 * rather than to append as we go.
 *
 * A zone with no builder is a shape and a renderer that disagree. It cannot
 * be a compile error without spelling every zone name twice in the type
 * system, so it is a warning, once per zone per session, and the zone is
 * skipped rather than drawn empty.
 */
export function renderZones(
	container: HTMLElement,
	shape: BlockShape,
	builders: Record<string, ZoneBuilder>,
): void {
	for (const zone of shape.zones) {
		const build = builders[zone.name];

		if (!build) {
			const key = `${shape.root}--${zone.name}`;

			if (!ORPHANS.has(key)) {
				ORPHANS.add(key);
				log.warn(
					`The shape declares the zone "${zone.name}" and the renderer of "${shape.root}" does not build it.`,
				);
			}

			continue;
		}

		const element = build(zone);

		if (!element) {
			continue;
		}

		element.classList.add(zoneClass(shape, zone));
		container.appendChild(element);
	}
}
