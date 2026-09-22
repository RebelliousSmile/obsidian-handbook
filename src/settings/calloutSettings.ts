import type { SettingGroup } from "obsidian";

export interface CalloutSettingsRenderer {
	renderCalloutsSection(section: SettingGroup): void;
}

export function renderCalloutSettingsDomain(renderer: CalloutSettingsRenderer, section: SettingGroup): void {
	renderer.renderCalloutsSection(section);
}
