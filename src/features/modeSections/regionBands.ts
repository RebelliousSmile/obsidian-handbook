import type BrumesPlugin from "../../BrumesPlugin";
import { FLOW_BLOCK, FLOW_HOST, MARKER_BLOCK } from "../layoutRegions/sectionMapper";
import { modeSectionClass, ModeSectionMode } from "./parser";

/** Class of the first block of a mode section that fills a whole column region. */
export const BAND_RUN_BLOCK = "handbook-mode-band-run";

const MODES: readonly ModeSectionMode[] = ["light", "dark", "alternate"];
const observed = new WeakMap<HTMLElement, ResizeObserver>();
const pending = new WeakSet<HTMLElement>();

/**
 * Give one band to a mode section that fills a whole column region. Each block
 * flowing in a column paints only its own box: the shorter column ends early
 * and the band stops at the column edges, while what spans the columns around
 * it bleeds to the full width. The first block of the run carries a pseudo
 * element sized to the run, positioned against the column box itself so it is
 * never split across the columns.
 *
 * A section that starts or ends inside a region keeps the block-by-block band:
 * a rectangle there would paint over the blocks of the other column.
 */
export function scheduleRegionBands(plugin: BrumesPlugin, host: HTMLElement): void {
	observeHost(plugin, host);
	if (pending.has(host)) return;
	pending.add(host);
	host.win.requestAnimationFrame(() => {
		pending.delete(host);
		paintRegionBands(host);
	});
}

function modeOf(block: HTMLElement): ModeSectionMode | null {
	for (const mode of MODES) {
		if (block.classList.contains(modeSectionClass(mode))) return mode;
	}
	return null;
}

function paintRegionBands(host: HTMLElement): void {
	const blocks = (Array.from(host.children) as HTMLElement[])
		.filter((block) => !block.classList.contains(MARKER_BLOCK));
	const runs: HTMLElement[][] = [];
	if (host.classList.contains(FLOW_HOST)) {
		let start = 0;
		while (start < blocks.length) {
			const first = blocks[start];
			const mode = first.classList.contains(FLOW_BLOCK) ? modeOf(first) : null;
			let end = start + 1;
			while (end < blocks.length && blocks[end].classList.contains(FLOW_BLOCK)) {
				if (mode === null || modeOf(blocks[end]) !== mode) break;
				end += 1;
			}
			const before = blocks[start - 1];
			const after = blocks[end];
			const whole =
				(!before || !before.classList.contains(FLOW_BLOCK)) &&
				(!after || !after.classList.contains(FLOW_BLOCK));
			if (mode !== null && whole) runs.push(blocks.slice(start, end));
			start = end;
		}
	}

	const leads = new Set(runs.map((run) => run[0]));
	for (const block of Array.from(host.children) as HTMLElement[]) {
		if (leads.has(block)) continue;
		block.classList.remove(BAND_RUN_BLOCK);
		block.style.removeProperty("--handbook-band-top");
		block.style.removeProperty("--handbook-band-height");
	}
	if (runs.length === 0) return;

	const origin = host.getBoundingClientRect().top + host.clientTop;
	for (const run of runs) {
		let top = Infinity;
		let bottom = -Infinity;
		for (const block of run) {
			for (const rect of Array.from(block.getClientRects())) {
				top = Math.min(top, rect.top);
				bottom = Math.max(bottom, rect.bottom);
			}
		}
		const lead = run[0];
		if (top === Infinity) {
			lead.classList.remove(BAND_RUN_BLOCK);
			continue;
		}
		lead.style.setProperty("--handbook-band-top", `${top - origin}px`);
		lead.style.setProperty("--handbook-band-height", `${bottom - top}px`);
		lead.classList.add(BAND_RUN_BLOCK);
	}
}

/** Columns rebalance when the pane is resized or a block grows: measure again. */
function observeHost(plugin: BrumesPlugin, host: HTMLElement): void {
	if (observed.has(host)) return;
	const observer = new ResizeObserver((entries) => {
		for (const entry of entries) {
			const target = entry.target;
			if (target.instanceOf(HTMLElement)) scheduleRegionBands(plugin, target);
		}
	});
	observer.observe(host);
	observed.set(host, observer);
	plugin.register(() => observer.disconnect());
}
