import { App, Notice, PluginSettingTab, SettingGroup } from "obsidian";
import BrumesPlugin from "../BrumesPlugin";
import { ColourScheme, LogLevel, sanitizeAliases } from "./types";
import {
	GAME_PACKS,
	findGamePack,
	findGameRegistration,
	resolveGamePack,
	resolveGameRegistration,
} from "../games/registry";
import { resolveGameVariant } from "../games/variants";
import { OVERRIDE_FILE_NAME } from "../games/overrides";
import { log } from "../utils/logger";
import { t } from "../utils/i18n";
import { CalloutDefinition } from "../features/callouts/types";
import { isCalloutAvailable } from "../features/callouts/types";
import { calloutCommandName } from "../features/callouts/commands";
import { CalloutsModal } from "./calloutsModal";
import { ThemeContentsModal } from "./themeContentsModal";
import { SchemaSourceModal, SchemaSourceRemovalModal } from "./sourceModal";
import { bundledSchemaRelease } from "./schemaRelease";
import { PbtaCoverageModal, currentPbtaCoverage, pbtaCoverageSummary } from "./pbtaCoverageModal";
import { PackIntegrationModal } from "./packIntegrationModal";
import {
	ADVANCED_CANVAS_ICEBERG_SNIPPET,
	ADVANCED_CANVAS_MOUNTAIN_SNIPPET,
} from "./canvasSnippets";
import { renderGeneralSettingsDomain } from "./generalSettings";
import { renderSchemaSourceSettingsDomain } from "./schemaSourceSettings";
import { renderGameSettingsDomain } from "./gameSettings";
import { renderCalloutSettingsDomain } from "./calloutSettings";

const SETTINGS_SAVE_LOG_MESSAGE = "Failed to save Handbook settings";
const SETTINGS_SAVE_NOTICE = "Failed to save Handbook settings.";

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

		const versionsSection = this.createSection(containerEl);
		versionsSection.setHeading(t("Installed versions"));
		this.renderActiveSchemaStatus(versionsSection);

		const generalSection = this.createSection(containerEl);
		generalSection.setHeading(t("Game and appearance"));
		generalSection.addSetting((setting) => {
			setting
				.setName(t("Game mode"))
				.setDesc(
					t("Choose the game line you are preparing for. This updates the main style and the editor context menu."),
				)
				.addDropdown((drop) => {
					if (GAME_PACKS.length === 0) {
						drop.addOption("none", t("No game installed"));
					}
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

									this.redisplay();
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						},
					);
				});
		});
		renderGeneralSettingsDomain(this, generalSection);
		renderGameSettingsDomain({
			plugin: this.plugin,
			createSection: (container) => this.createSection(container),
			renderCityOfMistSettings: (section) => this.renderCityOfMistSettings(section),
			renderLegendInTheMistSettings: (section) => this.renderLegendInTheMistSettings(section),
			renderOtherscapeSettings: (section) => this.renderOtherscapeSettings(section),
			hasGamePack: (id) => Boolean(findGamePack(id)),
		}, containerEl);

		const lanternSection = this.createSection(containerEl);
		lanternSection.setHeading("Lantern in the Mist");
		this.renderLanternSettings(lanternSection);

		const sourcesSection = this.createSection(containerEl);
		sourcesSection.setHeading(t("Schema sources"));
		renderSchemaSourceSettingsDomain(this, sourcesSection);

		const calloutsSection = this.createSection(containerEl);
		calloutsSection.setHeading(t("Callouts"));
		renderCalloutSettingsDomain(this, calloutsSection);

		const advancedSection = this.createSection(containerEl);
		advancedSection.setHeading(t("Advanced"));
		this.renderAdvancedSection(advancedSection);
	}

	private redisplay(): void {
		// eslint-disable-next-line @typescript-eslint/no-deprecated -- Refreshes the pre-1.13 settings UI.
		this.display();
	}

	private renderActiveSchemaStatus(section: SettingGroup): void {
		const registration = resolveGameRegistration(this.plugin.settings.mode);
		const installation = registration.installation;
		const installedSource = installation?.source;
		const bundled = installedSource ? bundledSchemaRelease(installedSource.repository) : null;
		section.addSetting((setting) => {
			setting
				.setName("Handbook")
				.setDesc(this.plugin.manifest.version);
		});

		section.addSetting((setting) => {
			setting.setName(registration.pack.label);
			if (!installation) {
				setting.setDesc(t("No pack installed."));
				return;
			}
			// The schema and the appearance pack are versioned apart: name each one,
			// schema first, so a pack behind the schema's number does not read as stale.
			setting.setDesc(bundled
				? t("Schema {schema} · Appearance pack {pack}", { schema: bundled, pack: installation.version })
				: t("Appearance pack {pack}", { pack: installation.version }));
		});
	}

	renderSchemaSources(section: SettingGroup) {
		const sources = this.plugin.settings.schemaSources;
		section.addSetting((setting) => {
			setting
				.setName(t("Repositories"))
				.setDesc(sources.length === 0
						? t("No schema repository is registered yet.")
						: sources.length === 1
							? t("1 schema repository is registered.")
							: t("{count} schema repositories are registered.", { count: sources.length }))
				.addButton((button) => button.setButtonText(t("Add source")).onClick(() => { new SchemaSourceModal(this.app, this.plugin, null, () => this.redisplay()).open(); }));
		});
		for (const source of sources) {
			section.addSetting((setting) => {
				const reference = source.reference.kind === "latest"
					? t("Latest release")
					: source.reference.kind === "tag"
						? t("Tag: {value}", { value: source.reference.value })
						: t("Branch: {value}", { value: source.reference.value });
				setting
					.setName(source.repository)
					.setDesc(t("{reference} · Checking installed version…", { reference }));
				if (source.reference.kind !== "tag") setting.addButton((button) => button.setButtonText(t("Check for update")).onClick(() => {
					button.setDisabled(true);
					const progress = new Notice(t("Checking {repository}…", { repository: source.repository }), 0);
					void (async () => {
						try {
							const before = await this.plugin.readInstalledSchemaSource(source);
							await this.plugin.saveSchemaSource(source, source.repository);
							const after = await this.plugin.readInstalledSchemaSource(source);
							this.redisplay();
							new Notice(before?.revision === after?.revision
								? t("{repository} is already up to date.", { repository: source.repository })
								: t("{repository} updated.", { repository: source.repository }), 10000);
						} catch (error) {
							log.error("Failed to update schema source", error);
							new Notice(t("Schema update failed: {reason}", { reason: error instanceof Error ? error.message : String(error) }), 10000);
						} finally {
							progress.hide();
							button.setDisabled(false);
						}
					})();
				}));
				setting
					.addButton((button) => button.setButtonText(t("Edit")).onClick(() => { new SchemaSourceModal(this.app, this.plugin, source, () => this.redisplay()).open(); }))
					.addButton((button) => {
						button.buttonEl.classList.add("mod-warning");
						button.setButtonText(t("Remove")).onClick(() => { new SchemaSourceRemovalModal(this.app, this.plugin, source, () => this.redisplay()).open(); });
					});
				void this.plugin.readInstalledSchemaSource(source).then((installed) => {
					if (!this.containerEl.contains(setting.settingEl)) return;
					setting.setDesc(t("{reference} · {status}", { reference, status: installed ? t("Installed") : t("Not installed") }));
				});
			});
		}
	}

	renderGameVariant(section: SettingGroup) {
		const registration = resolveGameRegistration(this.plugin.settings.mode);
		const variants = registration.variants ?? [];
		if (variants.length < 2) {
			return;
		}

		const active = resolveGameVariant(
			registration,
			this.plugin.settings.gameVariants[registration.pack.id],
		);
		section.addSetting((setting) => {
			setting
				.setName(t("Universe"))
				.setDesc(t("Choose the visual identity applied to the whole vault."))
				.addDropdown((drop) => {
					for (const variant of variants) {
						drop.addOption(variant.id, variant.label);
					}
					drop.setValue(active?.id ?? "").onChange((value) => {
						this.runTask(
							async () => {
								this.plugin.settings.gameVariants[registration.pack.id] =
									value;
								await this.plugin.saveSettings({ refreshMarkdown: true });

								this.redisplay();
							},
							SETTINGS_SAVE_LOG_MESSAGE,
							SETTINGS_SAVE_NOTICE,
						);
					});
				});
		});
	}

	/** Only offer a choice when the active appearance provides both schemes. */
	renderPolarities(section: SettingGroup) {
		const registration = resolveGameRegistration(this.plugin.settings.mode);
		const variant = resolveGameVariant(
			registration,
			this.plugin.settings.gameVariants[registration.pack.id],
		);
		const polarities = variant?.polarities ?? registration.pack.polarities ?? [];
		if (polarities.length < 2) {
			return;
		}

		section.addSetting((setting) => {
			setting
				.setName(t("Colour scheme"))
				.setDesc(t("The active game has both a light and a dark scheme. Follow Obsidian to keep them aligned, or choose one scheme for the plugin."))
				.addDropdown((drop) =>
					drop
						.addOption("obsidian", t("Follow Obsidian"))
						.addOption("light", t("Light"))
						.addOption("dark", t("Dark"))
						.setValue(this.plugin.settings.colourScheme)
						.onChange((value) => {
							this.runTask(
								async () => {
									this.plugin.settings.colourScheme =
										value as ColourScheme;
									await this.plugin.saveSettings();
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						}),
				);
		});
	}

	renderPrinterFriendly(section: SettingGroup) {
		section.addSetting((setting) => {
			setting
				.setName(t("Printer-friendly export"))
				.setDesc(t("Export to PDF on white paper in light mode, without the note background. Turn off to keep the note as it looks on screen."))
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.printerFriendly)
						.onChange((value) => {
							this.runTask(
								async () => {
									this.plugin.settings.printerFriendly = value;
									await this.plugin.saveSettings();
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						}),
				);
		});
	}

	renderThemeContents(section: SettingGroup) {
		const registration = resolveGameRegistration(this.plugin.settings.mode);
		if (!findGamePack(registration.pack.id)) {
			return;
		}

		section.addSetting((setting) => {
			setting
				.setName(t("Theme features"))
				.setDesc(t("Review the callouts and code blocks declared for the active game."))
				.addButton((button) =>
					button.setButtonText(t("View")).onClick(() => {
						new ThemeContentsModal(
							this.app,
							registration,
							this.plugin.settings.callouts,
						).open();
					}),
				);
		});
	}

	renderPersonalOverrides(section: SettingGroup) {
		section.addSetting((setting) => {
			setting
				.setName(t("Personal overrides"))
				.addButton((button) =>
					button.setButtonText(t("Reload")).onClick(() => {
						this.runTask(
							async () => {
								await this.plugin.reloadStyleSources();
								new Notice(t("Personal overrides reloaded."));
							},
							"Failed to reload the personal overrides",
							"Failed to reload the personal overrides.",
						);
					}),
				);
			setting.descEl.append(this.createOverrideDescription());
		});
	}

	renderGeneralSettings(section: SettingGroup) {
		section.addSetting((setting) => {
			const diceRollerEnabled = this.diceRollerEnabled();
			setting
				.setName(t("Roller tables"))
				.setDesc(
					diceRollerEnabled
						? t("Enable generic table rollers that use Dice Roller and copy results.")
						: t("Enable Dice Roller first to use generic table rollers."),
				)
				.setDisabled(!diceRollerEnabled)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.features.roller)
						.setDisabled(!diceRollerEnabled)
						.onChange((value) => {
							this.runTask(
								async () => {
									if (!this.diceRollerEnabled()) return;
									this.plugin.settings.features.roller = value;
									await this.plugin.saveSettings({ refreshMarkdown: true });
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						}),
				);
		});

		section.addSetting((setting) => {
			setting
				.setName(t("Workspace theme"))
				.setDesc(
					t("Paint the whole window in the colours of the game, not only the notes. No other game has one yet."),
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
	}

	private renderLanternSettings(section: SettingGroup) {
		section.addSetting((setting) => {
			setting
				.setName(t("Lantern in the Mist integration"))
				.setDesc(
					t("Show the ribbon icon and keep the embedded Lantern in the Mist view available."),
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

									this.redisplay();
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								SETTINGS_SAVE_NOTICE,
							);
						}),
				);
		});

		section.addSetting((setting) => {
			setting
				.setName(t("Lantern in the Mist URL"))
				.setDesc(
					t("Address used by the Lantern in the Mist ribbon action and embedded tab."),
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

	renderCityOfMistSettings(section: SettingGroup) {
		const isActive = this.plugin.settings.mode === "city-of-mist";

		section.addSetting((setting) => {
			setting
				.setName(t("Theme card parser"))
				.setDesc(
					t("Enable the com-theme-card code block parser and context menu action."),
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
				.setName(t("Danger profile parser"))
				.setDesc(
					t("Enable the com-danger code block parser and context menu action."),
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
				.setName(t("Iceberg canvas snippet"))
				.setDisabled(!isActive)
				.addButton((button) =>
					button
						.setButtonText(t("Copy snippet"))
						.setDisabled(!isActive)
						.onClick(() => {
							this.runTask(
								async () => {
									await navigator.clipboard.writeText(
										ADVANCED_CANVAS_ICEBERG_SNIPPET,
									);
									new Notice(
										t("Iceberg canvas snippet copied to clipboard."),
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

	renderLegendInTheMistSettings(section: SettingGroup) {
		const isActive = this.plugin.settings.mode === "legend-in-the-mist";

		section.addSetting((setting) => {
			setting
				.setName(t("Theme card parser"))
				.setDesc(
					t("Enable the theme-card code block parser and context menu action. The older story-theme ID keeps working."),
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
				.setName(t("Challenge parser"))
				.setDesc(
					t("Enable the litm-challenge code block parser and context menu action."),
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
				.setName(t("Journey parser"))
				.setDesc(
					t("Enable the litm-journey code block parser and context menu action."),
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
				.setName(t("Theme kit parser"))
				.setDesc(
					t("Enable the litm-theme-kit code block parser and context menu action."),
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
				.setName(t("Mountain canvas snippet"))
				.setDisabled(!isActive)
				.addButton((button) =>
					button
						.setButtonText(t("Copy snippet"))
						.setDisabled(!isActive)
						.onClick(() => {
							this.runTask(
								async () => {
									await navigator.clipboard.writeText(
										ADVANCED_CANVAS_MOUNTAIN_SNIPPET,
									);
									new Notice(
										t("Mountain canvas snippet copied to clipboard."),
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

	renderOtherscapeSettings(section: SettingGroup) {
		const isActive = this.plugin.settings.mode === "otherscape";
		this.addOtherscapeToggle(section, t("Themes"), "os-theme", "osThemeParser", isActive);
		this.addOtherscapeToggle(section, t("Theme kits"), "os-theme-kit", "osThemeKitParser", isActive);
		this.addOtherscapeToggle(section, t("Challenges"), "os-challenge", "osChallengeParser", isActive);
		this.addOtherscapeToggle(section, t("Power sets"), "os-power-set", "osPowerSetParser", isActive);
		this.addOtherscapeToggle(section, t("Character tropes"), "os-character-trope", "osCharacterTropeParser", isActive);
		this.addOtherscapeToggle(section, t("Loadout items"), "os-loadout-item", "osLoadoutItemParser", isActive);
	}

	private addOtherscapeToggle(
		section: SettingGroup,
		name: string,
		blockId: string,
		flag: "osThemeParser" | "osThemeKitParser" | "osChallengeParser" | "osPowerSetParser" | "osCharacterTropeParser" | "osLoadoutItemParser",
		isActive: boolean,
	) {
		section.addSetting((setting) => {
			setting
				.setName(name)
				.setDesc(t("Enable the {block} TOML block and its insertion.", { block: blockId }))
				.setDisabled(!isActive)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.features[flag])
						.setDisabled(!isActive)
						.onChange((value) => {
							this.runTask(async () => {
								this.plugin.settings.features[flag] = value;
								await this.plugin.saveSettings({ refreshMarkdown: true });
							}, SETTINGS_SAVE_LOG_MESSAGE, SETTINGS_SAVE_NOTICE);
						}),
				);
		});
	}

	private renderAdvancedSection(section: SettingGroup) {
		section.addSetting((setting) => {
			setting
				.setName(t("Validate installed packs"))
				.setDesc(t("Check pack manifests, declared capabilities, and local resources. This does not download updates."))
				.addButton((button) => button.setButtonText(t("Validate")).onClick(() => {
					new PackIntegrationModal(this.app, this.plugin).open();
				}));
		});
		const pbtaReport = currentPbtaCoverage();
		if (pbtaReport.packs.length > 0) section.addSetting((setting) => {
			setting
				.setName(t("PbtA playbook coverage"))
				.setDesc(pbtaCoverageSummary(pbtaReport))
				.addButton((button) => button.setButtonText(t("View coverage")).onClick(() => {
					new PbtaCoverageModal(this.app, currentPbtaCoverage()).open();
				}));
		});
		section.addSetting((setting) => {
			setting
				.setName(t("Log level"))
				.setDesc(
					t("Control how much information is logged to the developer console."),
				)
				.addDropdown((drop) =>
					drop
						.addOptions({
							debug: t("Debug (verbose)"),
							info: t("Info"),
							warn: t("Warnings"),
							error: t("Errors only"),
							none: t("None (disable logs)"),
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

	renderCalloutsSection(section: SettingGroup) {
		const required = findGameRegistration(this.plugin.settings.mode)?.installation?.requires ?? [];
		for (const entry of this.plugin.settings.callouts) {
			if (!isCalloutAvailable(entry, this.plugin.settings.mode, required)) {
				continue;
			}

			if (entry.native) {
				this.addCalloutAliasSetting(section, entry);
				continue;
			}

			section.addSetting((setting) => {
				setting
					.setName(entry.name)
					.setDesc(this.calloutDescription(entry))
					.addExtraButton((button) =>
						button
							.setIcon("pencil")
							.setTooltip(t("Edit"))
							.onClick(() => {
								new CalloutsModal(this.app, this.plugin, entry, () => {

									this.redisplay();
								}).open();
							}),
					)
					.addExtraButton((button) =>
						button
							.setIcon("trash")
							.setTooltip(t("Delete"))
							.onClick(() => {
								if (!activeWindow.confirm(t("Delete the callout \"{name}\"?", { name: entry.name }))) {
									return;
								}
								this.runTask(
									async () => {
										this.plugin.settings.callouts =
											this.plugin.settings.callouts.filter(
												(c) => c.id !== entry.id,
										);
									await this.plugin.saveSettings();

									this.redisplay();
									},
									SETTINGS_SAVE_LOG_MESSAGE,
									SETTINGS_SAVE_NOTICE,
								);
							}),
					);
			});
		}

		section.addSetting((setting) => {
			setting.addButton((button) =>
				button.setButtonText(t("+ new callout")).onClick(() => {
					new CalloutsModal(this.app, this.plugin, null, () => {

						this.redisplay();
					}).open();
				}),
			);
		});
	}

	private addCalloutAliasSetting(section: SettingGroup, entry: CalloutDefinition) {
		section.addSetting((setting) => {
			setting
				.setName(`🔒 ${entry.name}`)
				.setDesc(
					this.nativeCalloutDescription(entry),
				)
				.addTextArea((text) => {
					text.setValue(entry.aliases.join("\n"));
					text.inputEl.rows = Math.max(3, entry.aliases.length || 1);
					text.inputEl.addEventListener("change", () => {
						const sanitizedAliases = sanitizeAliases(
							text.getValue().split(/\r?\n/g),
						);
						text.setValue(sanitizedAliases.join("\n"));
						this.runTask(
							async () => {
								entry.aliases = sanitizedAliases;
								await this.plugin.saveSettings();
							},
							SETTINGS_SAVE_LOG_MESSAGE,
							SETTINGS_SAVE_NOTICE,
						);
					});
				});
		});
	}

	private calloutScopeLabel(scope: string): string {
		if (scope === "all") {
			return t("All games");
		}
		const pack = GAME_PACKS.find((p) => p.id === scope);
		return pack?.label ?? scope;
	}

	private calloutDescription(entry: CalloutDefinition): string {
		const values = {
			scope: this.calloutScopeLabel(entry.scope),
			aliases: entry.aliases.join(", ") || t("none"),
			hint: this.calloutShortcutHint(entry),
		};
		return values.hint
			? t("Scope: {scope} · aliases: {aliases}. {hint}", values)
			: t("Scope: {scope} · aliases: {aliases}.", values);
	}

	private nativeCalloutDescription(entry: CalloutDefinition): string {
		const values = { scope: this.calloutScopeLabel(entry.scope), hint: this.calloutShortcutHint(entry) };
		return values.hint
			? t("Scope: {scope}. Only the aliases can be edited here, one per line. {hint}", values)
			: t("Scope: {scope}. Only the aliases can be edited here, one per line.", values);
	}

	/** No alias means no command is registered for this entry — no hint to give then. */
	private calloutShortcutHint(entry: CalloutDefinition): string {
		if (!entry.aliases[0]) {
			return "";
		}

		return t("Shortcut: Settings → Hotkeys → search for \"{command}\".", {
			command: calloutCommandName(entry),
		});
	}


	/**
	 * What replaces the sliders of the preset: a file the user writes, that
	 * wins over the pack of the active game for the values it declares.
	 */
	private createOverrideDescription(): DocumentFragment {
		const fragment = this.containerEl.doc.createDocumentFragment();
		const pack = resolveGamePack(this.plugin.settings.mode);

		this.appendTemplate(
			fragment,
			t("The active pack is {pack}. To change a colour or a font of your own, write the custom properties into {file}, in this plugin's folder in the vault. What the file leaves out keeps the value of the game; removing the file restores it whole."),
			{
				pack: (host) => host.createEl("strong", { text: pack.label }),
				file: (host) => host.createEl("code", { text: OVERRIDE_FILE_NAME }),
			},
		);

		return fragment;
	}

	private createIcebergDescription(): DocumentFragment {
		return this.createCanvasSnippetDescription("iceberg.css");
	}

	private createMountainDescription(): DocumentFragment {
		return this.createCanvasSnippetDescription("mountain.css");
	}

	private createCanvasSnippetDescription(file: string): DocumentFragment {
		const fragment = this.containerEl.doc.createDocumentFragment();
		this.appendTemplate(
			fragment,
			t("Install {link} by Developer-Mike, then go to Settings > Appearance > CSS snippets, create a snippet named {file}, paste the copied content into that file, and enable the snippet."),
			{
				link: (host) => this.appendLink(
					host,
					"Advanced Canvas",
					"https://github.com/Developer-Mike/obsidian-advanced-canvas",
				),
				file: () => fragment.append(file),
			},
		);
		return fragment;
	}

	/** Fill a translated sentence, its `{slot}` markers replaced by nodes, so no fragment is translated apart. */
	private appendTemplate(
		parent: DocumentFragment,
		template: string,
		slots: Record<string, (host: DocumentFragment) => void>,
	) {
		for (const piece of template.split(/(\{\w+\})/)) {
			const slot = /^\{(\w+)\}$/.exec(piece)?.[1];
			const fill = slot === undefined ? undefined : slots[slot];
			if (fill) fill(parent);
			else if (piece) parent.append(piece);
		}
	}

	private appendLink(parent: DocumentFragment, label: string, href: string) {
		const link = parent.doc.createElement("a");
		link.textContent = label;
		link.href = href;
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		parent.append(link);
	}

	createSection(
		containerEl: HTMLElement,
		inactive = false,
	): SettingGroup {
		const section = new SettingGroup(containerEl);
		if (inactive) {
			section.addClass("is-inactive");
		}
		return section;
	}

	private diceRollerEnabled(): boolean {
		return Boolean((this.plugin.app as unknown as {
			plugins?: { getPlugin?(id: string): unknown };
		}).plugins?.getPlugin?.("obsidian-dice-roller"));
	}

	private runTask(
		task: () => Promise<void>,
		logMessage: string,
		noticeMessage: string,
	) {
		void task().catch((error: unknown) => {
			log.error(logMessage, error);
			new Notice(t(noticeMessage));
		});
	}
}
