import type { SettingGroup } from "obsidian";

export interface SchemaSourceSettingsRenderer {
	renderSchemaSources(section: SettingGroup): void;
}

/** Schema-source controls share the general settings surface but not game rules. */
export function renderSchemaSourceSettingsDomain(renderer: SchemaSourceSettingsRenderer, section: SettingGroup): void {
	renderer.renderSchemaSources(section);
}
