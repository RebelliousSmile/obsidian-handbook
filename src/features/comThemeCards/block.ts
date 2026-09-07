import { BrumesBlock } from "../blocks/types";
import { pickRandomComThemebook } from "../blocks/comThemebooks";
import { ComThemeCardData, parseComThemeCard } from "./parser";
import { renderComThemeCard } from "./renderer";

function comThemeCardTemplate(): string {
	const { type, themebook } = pickRandomComThemebook();
	const isMythos = type === "mythos";

	return [
		"```com-theme-card",
		themebook,
		"Theme title",
		isMythos
			? "mystery: What is this theme still looking for?"
			: "identity: What this theme holds true.",
		"A {power tag} B {power tag}",
		"C {!weakness tag}",
		"attention: 0/3",
		isMythos ? "fade: 0/3" : "crack: 0/3",
		"```",
		"",
	].join("\n");
}

export const comThemeCardBlock: BrumesBlock<ComThemeCardData> = {
	id: "com-theme-card",
	mode: "city-of-mist",
	flag: "comThemeCardParser",
	label: "Theme card",
	icon: "file-plus",
	parse: parseComThemeCard,
	render: renderComThemeCard,
	template: comThemeCardTemplate,
};
