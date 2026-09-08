import { App, Notice, PluginSettingTab, SettingGroup } from "obsidian";
import BrumesPlugin from "../BrumesPlugin";
import { LogLevel, sanitizeAliases } from "./types";
import { GAME_PACKS, resolveGamePack } from "../games/registry";
import { OVERRIDE_FILE_NAME } from "../games/overrides";
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
				.addDropdown((drop) => {
					// The list is the registry: a fourth pack shows up here
					// without a line being written, and its name comes from
					// the data rather than from a string in the interface.
					for (const pack of GAME_PACKS) {
						drop.addOption(pack.id, pack.label);
					}

					drop.setValue(this.plugin.settings.mode).onChange(
						(value) => {
							this.runTask(
								async () => {
									this.plugin.settings.mode = value;
									await this.plugin.saveSettings({
										refreshMarkdown: true,
									});
									this.display();
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						},
					);
				});
		});
		this.renderPolarities(generalSection);
		this.renderMigrationNotice(generalSection);
		this.renderAssetSetup(generalSection);
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

	/**
	 * Say which colour schemes the active game actually has.
	 *
	 * A line printed on parchment alone keeps its own register whichever theme
	 * the vault is set to, and someone toggling dark and seeing nothing move
	 * has no way to tell that from a broken setting. So it is written down,
	 * next to the game rather than in a changelog.
	 */
	private renderPolarities(section: SettingGroup) {
		section.addSetting((setting) => {
			setting
				.setName("Colour scheme")
				.setDesc(this.createPolarityDescription());
		});
	}

	private createPolarityDescription(): string {
		const pack = resolveGamePack(this.plugin.settings.mode);
		const polarities = pack.polarities ?? [];

		if (polarities.length === 0) {
			return "The active game brings no colour scheme of its own: it dresses your notes with its fonts and leaves the colours to the theme you are running.";
		}

		if (polarities.length === 1) {
			const only = polarities[0] === "dark" ? "dark" : "light";
			return `The active game has one scheme, the ${only} one its books are printed in, and it holds whichever theme the vault is set to. Toggling the theme is meant to leave your notes as they are.`;
		}

		return "The active game has both a light and a dark scheme, and follows the theme the vault is set to.";
	}

	private renderMigrationNotice(section: SettingGroup) {
		section.addSetting((setting) => {
			setting.setName("Colours and fonts");
			setting.descEl.append(this.createMigrationDescription());
		});

		section.addSetting((setting) => {
			setting
				.setName("Personal overrides")
				.addButton((button) =>
					button.setButtonText("Reload").onClick(() => {
						this.runTask(
							async () => {
								await this.plugin.reloadStyleSources();
								new Notice("Personal overrides reloaded.");
							},
							"Failed to reload the personal overrides",
							"Failed to reload the personal overrides.",
						);
					}),
				);
			setting.descEl.append(this.createOverrideDescription());
		});
	}

	/**
	 * The illustrations of a game are files in the vault, not data URIs baked
	 * into the stylesheet. This says how many the active game reads, where it
	 * looks for them, and which are absent: a block whose image is missing
	 * still renders, flat, so the list is information rather than an error.
	 */
	private renderAssetSetup(section: SettingGroup) {
		section.addSetting((setting) => {
			setting
				.setName("Illustrations")
				.addButton((button) =>
					button.setButtonText("Check files").onClick(() => {
						this.runTask(
							async () => {
								await this.plugin.reloadStyleSources();
								this.display();
							},
							"Failed to look for the illustration files",
							"Failed to look for the illustration files.",
						);
					}),
				);
			setting.descEl.append(this.createAssetDescription());
		});
	}

	private createAssetDescription(): DocumentFragment {
		const fragment = this.containerEl.doc.createDocumentFragment();
		const state = this.plugin.getAssetState();
		const pack = resolveGamePack(this.plugin.settings.mode);

		if (state.packId !== pack.id) {
			fragment.append(
				"The files of the active game have not been looked for yet. The button below does it.",
			);
			return fragment;
		}

		const expected = state.roles.length + state.families.length;

		if (expected === 0) {
			fragment.append("The active game brings no file of its own.");
			return fragment;
		}

		fragment.append(`The active game reads ${expected} files from `);
		fragment.createEl("code", { text: state.folder });
		fragment.append(". ");

		const absent: string[] = [];
		for (const entry of state.missing) {
			absent.push(entry.path);
		}
		for (const entry of state.missingFonts) {
			absent.push(entry.path);
		}

		if (absent.length === 0) {
			fragment.append("All of them are there.");
			return fragment;
		}

		fragment.append(
			`${absent.length} are absent. A block whose illustration is missing renders plain, and a typeface that is missing falls back on the next one in its stack. Drop these in to complete the game:`,
		);

		const list = fragment.createEl("ul");
		for (const path of absent) {
			list.createEl("li").createEl("code", { text: path });
		}

		return fragment;
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
			setting.descEl.append(this.createIcebergDescription());
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
			setting.descEl.append(this.createMountainDescription());
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

	/**
	 * What replaces the sliders of the preset: a file the user writes, that
	 * wins over the pack of the active game for the values it declares.
	 */
	private createOverrideDescription(): DocumentFragment {
		const fragment = this.containerEl.doc.createDocumentFragment();
		const pack = resolveGamePack(this.plugin.settings.mode);

		fragment.append("The active pack is ");
		fragment.createEl("strong", { text: pack.label });
		fragment.append(
			". To change a colour or a font of your own, write the custom properties into ",
		);
		fragment.createEl("code", { text: OVERRIDE_FILE_NAME });
		fragment.append(
			", in this plugin's folder in the vault. What the file leaves out keeps the value of the game; removing the file restores it whole.",
		);

		return fragment;
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
