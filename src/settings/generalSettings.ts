import type { SettingGroup } from "obsidian";

export interface GeneralSettingsRenderer {
	renderGameVariant(section: SettingGroup): void;
	renderPolarities(section: SettingGroup): void;
	renderThemeContents(section: SettingGroup): void;
	renderPersonalOverrides(section: SettingGroup): void;
	renderGeneralSettings(section: SettingGroup): void;
}

/** Compose cross-game preferences without owning their persistence boundary. */
export function renderGeneralSettingsDomain(renderer: GeneralSettingsRenderer, section: SettingGroup): void {
	renderer.renderGameVariant(section);
	renderer.renderPolarities(section);
	renderer.renderThemeContents(section);
	renderer.renderPersonalOverrides(section);
	renderer.renderGeneralSettings(section);
}
