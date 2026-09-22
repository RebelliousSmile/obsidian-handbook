import type { SettingGroup } from "obsidian";

export interface GameSettingsRenderer {
	plugin: { settings: { mode: string } };
	createSection(container: HTMLElement): SettingGroup;
	renderCityOfMistSettings(section: SettingGroup): void;
	renderLegendInTheMistSettings(section: SettingGroup): void;
	renderOtherscapeSettings(section: SettingGroup): void;
	hasGamePack(id: string): boolean;
}

/** Create only the active game's section, preserving its existing visibility gate. */
export function renderGameSettingsDomain(renderer: GameSettingsRenderer, container: HTMLElement): void {
	const { mode } = renderer.plugin.settings;
	if (mode === "city-of-mist" && renderer.hasGamePack("city-of-mist")) {
		const section = renderer.createSection(container);
		section.setHeading("City of Mist");
		renderer.renderCityOfMistSettings(section);
	}
	if (mode === "legend-in-the-mist" && renderer.hasGamePack("legend-in-the-mist")) {
		const section = renderer.createSection(container);
		section.setHeading("Legend in the Mist");
		renderer.renderLegendInTheMistSettings(section);
	}
	if (mode === "otherscape" && renderer.hasGamePack("otherscape")) {
		const section = renderer.createSection(container);
		section.setHeading(":Otherscape");
		renderer.renderOtherscapeSettings(section);
	}
}
