import type BrumesPlugin from "../../BrumesPlugin";
import { layoutRegionsPostProcessor } from "./postProcessor";

export function loadLayoutRegions(plugin: BrumesPlugin): void {
	plugin.registerMarkdownPostProcessor(layoutRegionsPostProcessor(plugin), 100);
}
