import type BrumesPlugin from "../../BrumesPlugin";
import { modeSectionsPostProcessor } from "./postProcessor";

export function loadModeSections(plugin: BrumesPlugin): void {
	plugin.registerMarkdownPostProcessor(modeSectionsPostProcessor(plugin), 100);
}
