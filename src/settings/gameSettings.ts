import { Notice, SettingGroup } from "obsidian";
import { t } from "../utils/i18n";
import { findGamePack } from "../games/registry";
import { ADVANCED_CANVAS_ICEBERG_SNIPPET, ADVANCED_CANVAS_MOUNTAIN_SNIPPET } from "./canvasSnippets";
import { SETTINGS_SAVE_LOG_MESSAGE, settingsSaveNotice } from "./saveMessages";
import { BrumesFeatureSettings } from "./types";
import { appendLink, appendTemplate, createSection, runTask, type SettingsHost } from "./sectionHelpers";

type BlockFeatureFlag = {
	[K in keyof BrumesFeatureSettings]: BrumesFeatureSettings[K] extends boolean ? K : never;
}[keyof BrumesFeatureSettings];
type OtherscapeFlag = Extract<BlockFeatureFlag, `os${string}Parser`>;

export function renderCityOfMistSettings(host: SettingsHost, section: SettingGroup) {
	addFeatureToggle(
		host,
		section,
		t("Theme card parser"),
		t("Enable the com-theme-card code block parser and context menu action."),
		"comThemeCardParser",
	);
	addFeatureToggle(
		host,
		section,
		t("Danger profile parser"),
		t("Enable the com-danger code block parser and context menu action."),
		"comDangerParser",
	);
	addCanvasSnippetButton(host, section, {
		name: t("Iceberg canvas snippet"),
		snippet: ADVANCED_CANVAS_ICEBERG_SNIPPET,
		file: "iceberg.css",
		copied: t("Iceberg canvas snippet copied to clipboard."),
		failureLog: "Failed to copy iceberg snippet",
		failureNotice: t("Failed to copy the iceberg snippet."),
	});
}

export function renderLegendInTheMistSettings(host: SettingsHost, section: SettingGroup) {
	addFeatureToggle(
		host,
		section,
		t("Theme card parser"),
		t("Enable the theme-card code block parser and context menu action. The older story-theme ID keeps working."),
		"storyThemeParser",
	);
	addFeatureToggle(
		host,
		section,
		t("Challenge parser"),
		t("Enable the litm-challenge code block parser and context menu action."),
		"challengeParser",
	);
	addFeatureToggle(
		host,
		section,
		t("Journey parser"),
		t("Enable the litm-journey code block parser and context menu action."),
		"journeyParser",
	);
	addFeatureToggle(
		host,
		section,
		t("Theme kit parser"),
		t("Enable the litm-theme-kit code block parser and context menu action."),
		"themeKitParser",
	);
	addCanvasSnippetButton(host, section, {
		name: t("Mountain canvas snippet"),
		snippet: ADVANCED_CANVAS_MOUNTAIN_SNIPPET,
		file: "mountain.css",
		copied: t("Mountain canvas snippet copied to clipboard."),
		failureLog: "Failed to copy mountain snippet",
		failureNotice: t("Failed to copy the mountain snippet."),
	});
}

export function renderOtherscapeSettings(host: SettingsHost, section: SettingGroup) {
	const toggles: Array<[string, string, OtherscapeFlag]> = [
		[t("Themes"), "os-theme", "osThemeParser"],
		[t("Theme kits"), "os-theme-kit", "osThemeKitParser"],
		[t("Challenges"), "os-challenge", "osChallengeParser"],
		[t("Power sets"), "os-power-set", "osPowerSetParser"],
		[t("Character tropes"), "os-character-trope", "osCharacterTropeParser"],
		[t("Loadout items"), "os-loadout-item", "osLoadoutItemParser"],
	];
	for (const [name, blockId, flag] of toggles) {
		addFeatureToggle(
			host,
			section,
			name,
			t("Enable the {block} TOML block and its insertion.", { block: blockId }),
			flag,
		);
	}
}

/** A block parser toggle: written to its `features.*` key, markdown re-rendered. */
export function addFeatureToggle(host: SettingsHost, 
	section: SettingGroup,
	name: string,
	description: string,
	flag: BlockFeatureFlag,
) {
	section.addSetting((setting) => {
		setting
			.setName(name)
			.setDesc(description)
			.addToggle((toggle) =>
				toggle
					.setValue(host.plugin.settings.features[flag])
					.onChange((value) => {
						runTask(
							async () => {
								host.plugin.settings.features[flag] = value;
								await host.plugin.saveSettings({ refreshMarkdown: true });
							},
							SETTINGS_SAVE_LOG_MESSAGE,
							settingsSaveNotice(),
						);
					}),
			);
	});
}

export function addCanvasSnippetButton(host: SettingsHost, 
	section: SettingGroup,
	options: {
		name: string;
		snippet: string;
		file: string;
		copied: string;
		failureLog: string;
		failureNotice: string;
	},
) {
	section.addSetting((setting) => {
		setting
			.setName(options.name)
			.addButton((button) =>
				button
					.setButtonText(t("Copy snippet"))
					.onClick(() => {
						runTask(
							async () => {
								await navigator.clipboard.writeText(options.snippet);
								new Notice(options.copied);
							},
							options.failureLog,
							options.failureNotice,
						);
					}),
			);
		setting.descEl.append(createCanvasSnippetDescription(host, options.file));
	});
}

export function createCanvasSnippetDescription(host: SettingsHost, file: string): DocumentFragment {
	const fragment = host.containerEl.doc.createDocumentFragment();
	appendTemplate(
		fragment,
		t("Install {link} by Developer-Mike, then go to Settings > Appearance > CSS snippets, create a snippet named {file}, paste the copied content into that file, and enable the snippet."),
		{
			link: (host) => appendLink(
				host,
				"Advanced Canvas",
				"https://github.com/Developer-Mike/obsidian-advanced-canvas",
			),
			file: () => fragment.append(file),
		},
	);
	return fragment;
}

/** Create only the active game's section, preserving its existing visibility gate. */
export function renderGameSettings(host: SettingsHost, container: HTMLElement): void {
	const { mode } = host.plugin.settings;
	if (mode === "city-of-mist" && findGamePack("city-of-mist")) {
		const section = createSection(container);
		section.setHeading("City of Mist");
		renderCityOfMistSettings(host, section);
	}
	if (mode === "legend-in-the-mist" && findGamePack("legend-in-the-mist")) {
		const section = createSection(container);
		section.setHeading("Legend in the Mist");
		renderLegendInTheMistSettings(host, section);
	}
	if (mode === "otherscape" && findGamePack("otherscape")) {
		const section = createSection(container);
		section.setHeading(":Otherscape");
		renderOtherscapeSettings(host, section);
	}
}
