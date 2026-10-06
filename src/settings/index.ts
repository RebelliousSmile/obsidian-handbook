import { App, PluginSettingTab } from "obsidian";
import BrumesPlugin from "../BrumesPlugin";
import { t } from "../utils/i18n";
import { createSection } from "./sectionHelpers";
import { renderActiveSchemaStatus, renderAdvancedSection, renderGameMode, renderGeneralSettings, renderLanternSettings } from "./generalSettings";
import { renderGameSettings } from "./gameSettings";
import { renderSchemaSources } from "./schemaSourceSettings";
import { renderCalloutsSection } from "./calloutSettings";

export class BrumesSettingTab extends PluginSettingTab {
	plugin: BrumesPlugin;

	constructor(app: App, plugin: BrumesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// Obsidian still invokes this lifecycle method; the replacement API is not
	// available across Handbook's supported Obsidian range yet.
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const versionsSection = createSection(containerEl);
		versionsSection.setHeading(t("Installed versions"));
		renderActiveSchemaStatus(this, versionsSection);

		const generalSection = createSection(containerEl);
		generalSection.setHeading(t("Game and appearance"));
		renderGameMode(this, generalSection);
		renderGeneralSettings(this, generalSection);
		renderGameSettings(this, containerEl);

		const lanternSection = createSection(containerEl);
		lanternSection.setHeading("Lantern in the Mist");
		renderLanternSettings(this, lanternSection);

		const sourcesSection = createSection(containerEl);
		sourcesSection.setHeading(t("Schema sources"));
		renderSchemaSources(this, sourcesSection);

		const calloutsSection = createSection(containerEl);
		calloutsSection.setHeading(t("Callouts"));
		renderCalloutsSection(this, calloutsSection);

		const advancedSection = createSection(containerEl);
		advancedSection.setHeading(t("Advanced"));
		renderAdvancedSection(this, advancedSection);
	}

	redisplay(): void {
		// eslint-disable-next-line @typescript-eslint/no-deprecated -- Refreshes the pre-1.13 settings UI.
		this.display();
	}
}
