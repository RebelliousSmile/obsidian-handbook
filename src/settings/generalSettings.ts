import { Notice, SettingGroup } from "obsidian";
import { resolveGameVariant } from "../games/variants";
import { OVERRIDE_FILE_NAME } from "../games/overrides";
import { log } from "../utils/logger";
import { t } from "../utils/i18n";
import { ThemeContentsModal } from "./themeContentsModal";
import { bundledSchemaRelease } from "./schemaRelease";
import { PbtaCoverageModal, currentPbtaCoverage, pbtaCoverageSummary } from "./pbtaCoverageModal";
import { PackIntegrationModal } from "./packIntegrationModal";
import { GAME_PACKS, findGamePack, resolveGamePack, resolveGameRegistration } from "../games/registry";
import { SETTINGS_SAVE_LOG_MESSAGE, settingsSaveNotice } from "./saveMessages";
import { ColourScheme, LogLevel } from "./types";
import { appendTemplate, runTask, type SettingsHost } from "./sectionHelpers";

export function renderGameMode(host: SettingsHost, section: SettingGroup): void {
	section.addSetting((setting) => {
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
	
				drop.setValue(host.plugin.settings.mode).onChange(
					(value) => {
						runTask(
							async () => {
								host.plugin.settings.mode = value;
								await host.plugin.saveSettings({
									refreshMarkdown: true,
								});
	
								host.redisplay();
							},
							SETTINGS_SAVE_LOG_MESSAGE,
							settingsSaveNotice(),
						);
					},
				);
			});
	});
}

export function renderActiveSchemaStatus(host: SettingsHost, section: SettingGroup): void {
	const registration = resolveGameRegistration(host.plugin.settings.mode);
	const installation = registration.installation;
	const installedSource = installation?.source;
	const bundled = installedSource ? bundledSchemaRelease(installedSource.repository) : null;
	section.addSetting((setting) => {
		setting
			.setName("Handbook")
			.setDesc(host.plugin.manifest.version);
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

export function renderGameVariant(host: SettingsHost, section: SettingGroup) {
	const registration = resolveGameRegistration(host.plugin.settings.mode);
	const variants = registration.variants ?? [];
	if (variants.length < 2) {
		return;
	}

	const active = resolveGameVariant(
		registration,
		host.plugin.settings.gameVariants[registration.pack.id],
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
					runTask(
						async () => {
							host.plugin.settings.gameVariants[registration.pack.id] =
								value;
							await host.plugin.saveSettings({ refreshMarkdown: true });

							host.redisplay();
						},
						SETTINGS_SAVE_LOG_MESSAGE,
						settingsSaveNotice(),
					);
				});
			});
	});
}

/** Only offer a choice when the active appearance provides both schemes. */
export function renderPolarities(host: SettingsHost, section: SettingGroup) {
	const registration = resolveGameRegistration(host.plugin.settings.mode);
	const variant = resolveGameVariant(
		registration,
		host.plugin.settings.gameVariants[registration.pack.id],
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
					.setValue(host.plugin.settings.colourScheme)
					.onChange((value) => {
						runTask(
							async () => {
								host.plugin.settings.colourScheme =
									value as ColourScheme;
								await host.plugin.saveSettings();
							},
							SETTINGS_SAVE_LOG_MESSAGE,
							settingsSaveNotice(),
						);
					}),
			);
	});
}

export function renderPrinterFriendly(host: SettingsHost, section: SettingGroup) {
	section.addSetting((setting) => {
		setting
			.setName(t("Printer-friendly export"))
			.setDesc(t("Export to PDF on white paper in light mode, without the note background. Turn off to keep the note as it looks on screen."))
			.addToggle((toggle) =>
				toggle
					.setValue(host.plugin.settings.printerFriendly)
					.onChange((value) => {
						runTask(
							async () => {
								host.plugin.settings.printerFriendly = value;
								await host.plugin.saveSettings();
							},
							SETTINGS_SAVE_LOG_MESSAGE,
							settingsSaveNotice(),
						);
					}),
			);
	});
}

export function renderThemeContents(host: SettingsHost, section: SettingGroup) {
	const registration = resolveGameRegistration(host.plugin.settings.mode);
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
						host.app,
						registration,
						host.plugin.settings.callouts,
					).open();
				}),
			);
	});
}

export function renderPersonalOverrides(host: SettingsHost, section: SettingGroup) {
	section.addSetting((setting) => {
		setting
			.setName(t("Personal overrides"))
			.addButton((button) =>
				button.setButtonText(t("Reload")).onClick(() => {
					runTask(
						async () => {
							await host.plugin.reloadStyleSources();
							new Notice(t("Personal overrides reloaded."));
						},
						"Failed to reload the personal overrides",
						t("Failed to reload the personal overrides."),
					);
				}),
			);
		setting.descEl.append(createOverrideDescription(host));
	});
}

export function renderRollerAndWorkspaceSettings(host: SettingsHost, section: SettingGroup) {
	section.addSetting((setting) => {
		const diceRollerEnabled = isDiceRollerEnabled(host);
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
					.setValue(host.plugin.settings.features.roller)
					.setDisabled(!diceRollerEnabled)
					.onChange((value) => {
						runTask(
							async () => {
								if (!isDiceRollerEnabled(host)) return;
								host.plugin.settings.features.roller = value;
								await host.plugin.saveSettings({ refreshMarkdown: true });
							},
							SETTINGS_SAVE_LOG_MESSAGE,
							settingsSaveNotice(),
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
					.setValue(host.plugin.settings.features.workspaceTheme)
					.onChange((value) => {
						runTask(
							async () => {
								host.plugin.settings.features.workspaceTheme =
									value;
								await host.plugin.saveSettings();
							},
							SETTINGS_SAVE_LOG_MESSAGE,
							settingsSaveNotice(),
						);
					}),
			);
	});
}

export function renderLanternSettings(host: SettingsHost, section: SettingGroup) {
	section.addSetting((setting) => {
		setting
			.setName(t("Lantern in the Mist integration"))
			.setDesc(
				t("Show the ribbon icon and keep the embedded Lantern in the Mist view available."),
			)
			.addToggle((toggle) =>
				toggle
					.setValue(
						host.plugin.settings.features.lanternIntegration,
					)
					.onChange((value) => {
						runTask(
							async () => {
								host.plugin.settings.features.lanternIntegration =
									value;
								await host.plugin.saveSettings();

								host.redisplay();
							},
							SETTINGS_SAVE_LOG_MESSAGE,
							settingsSaveNotice(),
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
			.setDisabled(!host.plugin.settings.features.lanternIntegration)
			.addText((text) =>
				text
					.setPlaceholder("https://lantern.ravenloft.fr")
					.setValue(host.plugin.settings.lanternUrl)
					.setDisabled(
						!host.plugin.settings.features.lanternIntegration,
					)
					.onChange((value) => {
						runTask(
							async () => {
								host.plugin.settings.lanternUrl =
									value.trim();
								await host.plugin.saveSettings();
							},
							SETTINGS_SAVE_LOG_MESSAGE,
							settingsSaveNotice(),
						);
					}),
			);
	});
}

export function renderAdvancedSection(host: SettingsHost, section: SettingGroup) {
	section.addSetting((setting) => {
		setting
			.setName(t("Validate installed packs"))
			.setDesc(t("Check pack manifests, declared capabilities, and local resources. This does not download updates."))
			.addButton((button) => button.setButtonText(t("Validate")).onClick(() => {
				new PackIntegrationModal(host.app, host.plugin).open();
			}));
	});
	const pbtaReport = currentPbtaCoverage();
	if (pbtaReport.packs.length > 0) section.addSetting((setting) => {
		setting
			.setName(t("PbtA playbook coverage"))
			.setDesc(pbtaCoverageSummary(pbtaReport))
			.addButton((button) => button.setButtonText(t("View coverage")).onClick(() => {
				new PbtaCoverageModal(host.app, currentPbtaCoverage()).open();
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
					.setValue(host.plugin.settings.logLevel)
					.onChange((value) => {
						runTask(
							async () => {
								const level = value as LogLevel;
								host.plugin.settings.logLevel = level;
								log.setLevel(level);
								await host.plugin.saveSettings();
							},
							SETTINGS_SAVE_LOG_MESSAGE,
							settingsSaveNotice(),
						);
					}),
			);
	});
}

/**
 * What replaces the sliders of the preset: a file the user writes, that
 * wins over the pack of the active game for the values it declares.
 */
export function createOverrideDescription(host: SettingsHost): DocumentFragment {
	const fragment = host.containerEl.doc.createDocumentFragment();
	const pack = resolveGamePack(host.plugin.settings.mode);

	appendTemplate(
		fragment,
		t("The active pack is {pack}. To change a colour or a font of your own, write the custom properties into {file}, in this plugin's folder in the vault. What the file leaves out keeps the value of the game; removing the file restores it whole."),
		{
			pack: (host) => host.createEl("strong", { text: pack.label }),
			file: (host) => host.createEl("code", { text: OVERRIDE_FILE_NAME }),
		},
	);

	return fragment;
}

export function isDiceRollerEnabled(host: SettingsHost): boolean {
	return Boolean((host.plugin.app as unknown as {
		plugins?: { getPlugin?(id: string): unknown };
	}).plugins?.getPlugin?.("obsidian-dice-roller"));
}

/** Compose the cross-game preferences of the general section. */
export function renderGeneralSettings(host: SettingsHost, section: SettingGroup): void {
	renderGameVariant(host, section);
	renderPolarities(host, section);
	renderPrinterFriendly(host, section);
	renderThemeContents(host, section);
	renderPersonalOverrides(host, section);
	renderRollerAndWorkspaceSettings(host, section);
}
