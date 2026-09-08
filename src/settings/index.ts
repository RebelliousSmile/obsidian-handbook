import { App, Notice, PluginSettingTab, SettingGroup } from "obsidian";
import BrumesPlugin from "../BrumesPlugin";
import { BrumesMode, LogLevel, sanitizeAliases } from "./types";
import { log } from "../utils/logger";
import {
	ADVANCED_CANVAS_ICEBERG_SNIPPET,
	ADVANCED_CANVAS_MOUNTAIN_SNIPPET,
} from "./canvasSnippets";

const SETTINGS_SAVE_LOG_MESSAGE = "Failed to save Handbook settings";
const SETTINGS_SAVE_NOTICE = "Failed to save Handbook settings.";

export class BrumesSettingTab extends PluginSettingTab {
	plugin: BrumesPlugin;

	// eslint-disable-next-line obsidianmd/prefer-active-doc
	constructor(app: App, plugin: BrumesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const generalSection = this.createSection(containerEl);
		generalSection.addSetting((setting) => {
			setting
				.setName("Game mode")
				.setDesc(
					"Choose the game line you are preparing for. This updates the main style and the editor context menu.",
				)
				.addDropdown((drop) =>
					drop
						.addOption("city-of-mist", "City of Mist") // eslint-disable-line obsidianmd/ui/sentence-case
						.addOption("legend-in-the-mist", "Legend in the Mist") // eslint-disable-line obsidianmd/ui/sentence-case
						.addOption("otherscape", ":Otherscape") // eslint-disable-line obsidianmd/ui/sentence-case
						.setValue(this.plugin.settings.mode)
						.onChange((value) => {
							this.runTask(
								async () => {
									this.plugin.settings.mode =
										value as BrumesMode;
									await this.plugin.saveSettings({
										refreshMarkdown: true,
									});
									this.display();
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						}),
				);
		});
		this.renderMigrationNotice(generalSection);
		this.renderGeneralSettings(generalSection);

		const cityOfMistSection = this.createSection(
			containerEl,
			this.plugin.settings.mode !== "city-of-mist",
		);
		cityOfMistSection.setHeading("City of Mist");
		this.renderCityOfMistSettings(cityOfMistSection);

		const legendInTheMistSection = this.createSection(
			containerEl,
			this.plugin.settings.mode !== "legend-in-the-mist",
		);
		legendInTheMistSection.setHeading("Legend in the Mist");
		this.renderLegendInTheMistSettings(legendInTheMistSection);

		const otherscapeSection = this.createSection(
			containerEl,
			this.plugin.settings.mode !== "otherscape",
		);
		otherscapeSection.setHeading(":Otherscape");
		this.renderOtherscapeSettings(otherscapeSection);

		const advancedSection = this.createSection(containerEl);
		advancedSection.setHeading("Advanced");
		this.renderAdvancedSection(advancedSection);
	}

	private renderMigrationNotice(section: SettingGroup) {
		section.addSetting((setting) => {
			setting
				.setName("Colours and fonts")
				.setDesc(this.createMigrationDescription());
		});
	}

	private renderGeneralSettings(section: SettingGroup) {
		section.addSetting((setting) => {
			setting
				.setName("Workspace theme")
				.setDesc(
					"Paint the whole window in the colours of the game, not only the notes. No other game has one yet.",
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.features.workspaceTheme)
						.onChange((value) => {
							this.runTask(
								async () => {
									this.plugin.settings.features.workspaceTheme =
										value;
									await this.plugin.saveSettings();
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						}),
				);
		});

		section.addSetting((setting) => {
			setting
				.setName("Tags, statuses and limits")
				.setDesc(
					"Enable the special Markdown syntax, parsing and context menu action for tags, statuses and limits.",
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.features.tagsSyntax)
						.onChange((value) => {
							this.runTask(
								async () => {
									this.plugin.settings.features.tagsSyntax =
										value;
									await this.plugin.saveSettings({
										refreshEditor: true,
										refreshMarkdown: true,
									});
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						}),
				);
		});

		section.addSetting((setting) => {
			setting
				.setName("Lantern in the Mist integration") // eslint-disable-line obsidianmd/ui/sentence-case
				.setDesc(
					"Show the ribbon icon and keep the embedded Lantern in the Mist view available.", // eslint-disable-line obsidianmd/ui/sentence-case
				)
				.addToggle((toggle) =>
					toggle
						.setValue(
							this.plugin.settings.features.lanternIntegration,
						)
						.onChange((value) => {
							this.runTask(
								async () => {
									this.plugin.settings.features.lanternIntegration =
										value;
									await this.plugin.saveSettings();
									this.display();
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						}),
				);
		});

		section.addSetting((setting) => {
			setting
				.setName("Lantern in the Mist URL") // eslint-disable-line obsidianmd/ui/sentence-case
				.setDesc(
					"Address used by the Lantern in the Mist ribbon action and embedded tab.", // eslint-disable-line obsidianmd/ui/sentence-case
				)
				.setDisabled(!this.plugin.settings.features.lanternIntegration)
				.addText((text) =>
					text
						.setPlaceholder("https://lantern.ravenloft.fr")
						.setValue(this.plugin.settings.lanternUrl)
						.setDisabled(
							!this.plugin.settings.features.lanternIntegration,
						)
						.onChange((value) => {
							this.runTask(
								async () => {
									this.plugin.settings.lanternUrl =
										value.trim();
									await this.plugin.saveSettings();
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						}),
				);
		});
	}

	private renderCityOfMistSettings(section: SettingGroup) {
		const isActive = this.plugin.settings.mode === "city-of-mist";

		this.addAliasSetting(
			section,
			"Note aliases",
			this.plugin.settings.calloutAliases.cityOfMist.note,
			"One alias per line. The first alias is inserted from the context menu.",
			!isActive,
			async (aliases) => {
				this.plugin.settings.calloutAliases.cityOfMist.note = aliases;
				await this.plugin.saveSettings();
			},
		);

		this.addAliasSetting(
			section,
			"Move aliases",
			this.plugin.settings.calloutAliases.cityOfMist.move,
			"One alias per line. The first alias is inserted from the context menu.",
			!isActive,
			async (aliases) => {
				this.plugin.settings.calloutAliases.cityOfMist.move = aliases;
				await this.plugin.saveSettings();
			},
		);

		this.addAliasSetting(
			section,
			"Description aliases",
			this.plugin.settings.calloutAliases.cityOfMist.description,
			"One alias per line. The first alias is inserted from the context menu.",
			!isActive,
			async (aliases) => {
				this.plugin.settings.calloutAliases.cityOfMist.description =
					aliases;
				await this.plugin.saveSettings();
			},
		);

		this.addAliasSetting(
			section,
			"Clue aliases",
			this.plugin.settings.calloutAliases.cityOfMist.clue,
			"One alias per line. The first alias is inserted from the context menu.",
			!isActive,
			async (aliases) => {
				this.plugin.settings.calloutAliases.cityOfMist.clue = aliases;
				await this.plugin.saveSettings();
			},
		);

		this.addAliasSetting(
			section,
			"Red clue aliases",
			this.plugin.settings.calloutAliases.cityOfMist.redClue,
			"One alias per line. The first alias is inserted from the context menu.",
			!isActive,
			async (aliases) => {
				this.plugin.settings.calloutAliases.cityOfMist.redClue =
					aliases;
				await this.plugin.saveSettings();
			},
		);

		section.addSetting((setting) => {
			setting
				.setName("Theme card parser")
				.setDesc(
					"Enable the com-theme-card code block parser and context menu action.",
				)
				.setDisabled(!isActive)
				.addToggle((toggle) =>
					toggle
						.setValue(
							this.plugin.settings.features.comThemeCardParser,
						)
						.setDisabled(!isActive)
						.onChange((value) => {
							this.runTask(
								async () => {
									this.plugin.settings.features.comThemeCardParser =
										value;
									await this.plugin.saveSettings({
										refreshMarkdown: true,
									});
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						}),
				);
		});

		section.addSetting((setting) => {
			setting
				.setName("Danger profile parser")
				.setDesc(
					"Enable the com-danger code block parser and context menu action.",
				)
				.setDisabled(!isActive)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.features.comDangerParser)
						.setDisabled(!isActive)
						.onChange((value) => {
							this.runTask(
								async () => {
									this.plugin.settings.features.comDangerParser =
										value;
									await this.plugin.saveSettings({
										refreshMarkdown: true,
									});
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						}),
				);
		});

		section.addSetting((setting) => {
			setting
				.setName("Iceberg canvas snippet")
				.setDesc(this.createIcebergDescription())
				.setDisabled(!isActive)
				.addButton((button) =>
					button
						.setButtonText("Copy snippet")
						.setDisabled(!isActive)
						.onClick(() => {
							this.runTask(
								async () => {
									await navigator.clipboard.writeText(
										ADVANCED_CANVAS_ICEBERG_SNIPPET,
									);
									new Notice(
										"Iceberg canvas snippet copied to clipboard.",
									);
								},
								"Failed to copy iceberg snippet",
								"Failed to copy the iceberg snippet.",
							);
						}),
				);
		});
	}

	private renderLegendInTheMistSettings(section: SettingGroup) {
		const isActive = this.plugin.settings.mode === "legend-in-the-mist";

		this.addAliasSetting(
			section,
			"Note aliases",
			this.plugin.settings.calloutAliases.legendInTheMist.note,
			"One alias per line. The first alias is inserted from the context menu.",
			!isActive,
			async (aliases) => {
				this.plugin.settings.calloutAliases.legendInTheMist.note =
					aliases;
				await this.plugin.saveSettings();
			},
		);

		this.addAliasSetting(
			section,
			"Read-aloud aliases",
			this.plugin.settings.calloutAliases.legendInTheMist.readAloud,
			"One alias per line. The first alias is inserted from the context menu.",
			!isActive,
			async (aliases) => {
				this.plugin.settings.calloutAliases.legendInTheMist.readAloud =
					aliases;
				await this.plugin.saveSettings();
			},
		);

		section.addSetting((setting) => {
			setting
				.setName("Theme card parser")
				.setDesc(
					"Enable the theme-card code block parser and context menu action. The older story-theme ID keeps working.",
				)
				.setDisabled(!isActive)
				.addToggle((toggle) =>
					toggle
						.setValue(
							this.plugin.settings.features.storyThemeParser,
						)
						.setDisabled(!isActive)
						.onChange((value) => {
							this.runTask(
								async () => {
									this.plugin.settings.features.storyThemeParser =
										value;
									await this.plugin.saveSettings({
										refreshMarkdown: true,
									});
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						}),
				);
		});

		section.addSetting((setting) => {
			setting
				.setName("Challenge parser")
				.setDesc(
					"Enable the litm-challenge code block parser and context menu action.",
				)
				.setDisabled(!isActive)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.features.challengeParser)
						.setDisabled(!isActive)
						.onChange((value) => {
							this.runTask(
								async () => {
									this.plugin.settings.features.challengeParser =
										value;
									await this.plugin.saveSettings({
										refreshMarkdown: true,
									});
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						}),
				);
		});

		section.addSetting((setting) => {
			setting
				.setName("Journey parser")
				.setDesc(
					"Enable the litm-journey code block parser and context menu action.",
				)
				.setDisabled(!isActive)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.features.journeyParser)
						.setDisabled(!isActive)
						.onChange((value) => {
							this.runTask(
								async () => {
									this.plugin.settings.features.journeyParser =
										value;
									await this.plugin.saveSettings({
										refreshMarkdown: true,
									});
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						}),
				);
		});

		section.addSetting((setting) => {
			setting
				.setName("Theme kit parser")
				.setDesc(
					"Enable the litm-theme-kit code block parser and context menu action.",
				)
				.setDisabled(!isActive)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.features.themeKitParser)
						.setDisabled(!isActive)
						.onChange((value) => {
							this.runTask(
								async () => {
									this.plugin.settings.features.themeKitParser =
										value;
									await this.plugin.saveSettings({
										refreshMarkdown: true,
									});
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						}),
				);
		});

		section.addSetting((setting) => {
			setting
				.setName("Mountain canvas snippet")
				.setDesc(this.createMountainDescription())
				.setDisabled(!isActive)
				.addButton((button) =>
					button
						.setButtonText("Copy snippet")
						.setDisabled(!isActive)
						.onClick(() => {
							this.runTask(
								async () => {
									await navigator.clipboard.writeText(
										ADVANCED_CANVAS_MOUNTAIN_SNIPPET,
									);
									new Notice(
										"Mountain canvas snippet copied to clipboard.",
									);
								},
								"Failed to copy mountain snippet",
								"Failed to copy the mountain snippet.",
							);
						}),
				);
		});
	}

	private renderOtherscapeSettings(section: SettingGroup) {
		section.addSetting((setting) => {
			setting.setName("Nothing yet!").setDesc(
				":Otherscape support is planned but not implemented yet.", // eslint-disable-line obsidianmd/ui/sentence-case
			);
		});
	}

	private renderAdvancedSection(section: SettingGroup) {
		section.addSetting((setting) => {
			setting
				.setName("Log level")
				.setDesc(
					"Control how much information is logged to the developer console.",
				)
				.addDropdown((drop) =>
					drop
						.addOptions({
							debug: "Debug (verbose)",
							info: "Info",
							warn: "Warnings",
							error: "Errors only",
							none: "None (disable logs)",
						})
						.setValue(this.plugin.settings.logLevel)
						.onChange((value) => {
							this.runTask(
								async () => {
									const level = value as LogLevel;
									this.plugin.settings.logLevel = level;
									log.setLevel(level);
									await this.plugin.saveSettings();
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						}),
				);
		});
	}

	private addAliasSetting(
		section: SettingGroup,
		name: string,
		aliases: string[],
		description: string,
		disabled: boolean,
		onSave: (aliases: string[]) => Promise<void>,
	) {
		section.addSetting((setting) => {
			setting
				.setName(name)
				.setDesc(description)
				.setDisabled(disabled)
				.addTextArea((text) => {
					text.setValue(aliases.join("\n"));
					text.inputEl.rows = Math.max(3, aliases.length || 1);
					text.inputEl.placeholder = "One-alias-per-line";
					text.setDisabled(disabled);
					text.inputEl.addEventListener("change", () => {
						const sanitizedAliases = sanitizeAliases(
							text.getValue().split(/\r?\n/g),
						);
						text.setValue(sanitizedAliases.join("\n"));
						this.runTask(
							() => onSave(sanitizedAliases),
							SETTINGS_SAVE_LOG_MESSAGE,
							SETTINGS_SAVE_NOTICE,
						);
					});
				});
		});
	}

	private createMigrationDescription(): DocumentFragment {
		const fragment = this.containerEl.doc.createDocumentFragment();
		fragment.append(
			"Colours and fonts are written by the plugin itself. No theme and no other plugin is required. If a preset was imported into ",
		);
		this.appendLink(
			fragment,
			"Style Settings",
			"https://github.com/mgmeyers/obsidian-style-settings",
		);
		fragment.append(
			" before, open that plugin and reset the sections it created: the leftover keys still override what is written here.",
		);
		return fragment;
	}

	private createIcebergDescription(): DocumentFragment {
		const fragment = this.containerEl.doc.createDocumentFragment();
		fragment.append("Install ");
		this.appendLink(
			fragment,
			"Advanced Canvas",
			"https://github.com/Developer-Mike/obsidian-advanced-canvas",
		);
		fragment.append(
			" by Developer-Mike, then go to Settings > Appearance > CSS snippets, create a snippet named iceberg.css, paste the copied content into that file, and enable the snippet.",
		);
		return fragment;
	}

	private createMountainDescription(): DocumentFragment {
		const fragment = this.containerEl.doc.createDocumentFragment();
		fragment.append("Install ");
		this.appendLink(
			fragment,
			"Advanced Canvas",
			"https://github.com/Developer-Mike/obsidian-advanced-canvas",
		);
		fragment.append(
			" by Developer-Mike, then go to Settings > Appearance > CSS snippets, create a snippet named mountain.css, paste the copied content into that file, and enable the snippet.",
		);
		return fragment;
	}

	private appendLink(parent: DocumentFragment, label: string, href: string) {
		const link = parent.doc.createElement("a");
		link.textContent = label;
		link.href = href;
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		parent.append(link);
	}

	private createSection(
		containerEl: HTMLElement,
		inactive = false,
	): SettingGroup {
		const section = new SettingGroup(containerEl);
		if (inactive) {
			section.addClass("is-inactive");
		}
		return section;
	}

	private runTask(
		task: () => Promise<void>,
		logMessage: string,
		noticeMessage: string,
	) {
		void task().catch((error: unknown) => {
			log.error(logMessage, error);
			new Notice(noticeMessage);
		});
	}
}
