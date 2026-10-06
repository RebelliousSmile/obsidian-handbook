import { Notice, SettingGroup } from "obsidian";
import { t } from "../utils/i18n";
import { CalloutDefinition } from "../features/callouts/types";
import { findAliasCollision } from "../features/callouts/collisions";
import { scopeLabel } from "../features/callouts/scopeLabel";
import { visibleCallouts } from "../features/callouts/visibility";
import { calloutCommandName } from "../features/callouts/commands";
import { sanitizeAliases } from "../features/callouts/sanitizeAlias";
import { CalloutsModal } from "./calloutsModal";
import { SETTINGS_SAVE_LOG_MESSAGE, settingsSaveNotice } from "./saveMessages";
import { runTask, type SettingsHost } from "./sectionHelpers";

export function renderCalloutsSection(host: SettingsHost, section: SettingGroup) {
	for (const entry of visibleCallouts(host.plugin.settings.callouts, host.plugin.settings.mode)) {
		if (entry.native) {
			addCalloutAliasSetting(host, section, entry);
			continue;
		}

		section.addSetting((setting) => {
			setting
				.setName(entry.name)
				.setDesc(calloutDescription(entry))
				.addExtraButton((button) =>
					button
						.setIcon("pencil")
						.setTooltip(t("Edit"))
						.onClick(() => {
							new CalloutsModal(host.app, host.plugin, entry, () => {

								host.redisplay();
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
							runTask(
								async () => {
									host.plugin.settings.callouts =
										host.plugin.settings.callouts.filter(
											(c) => c.id !== entry.id,
									);
								await host.plugin.saveSettings();

								host.redisplay();
								},
								SETTINGS_SAVE_LOG_MESSAGE,
								settingsSaveNotice(),
							);
						}),
				);
		});
	}

	section.addSetting((setting) => {
		setting.addButton((button) =>
			button.setButtonText(t("+ new callout")).onClick(() => {
				new CalloutsModal(host.app, host.plugin, null, () => {

					host.redisplay();
				}).open();
			}),
		);
	});
}

export function addCalloutAliasSetting(host: SettingsHost, section: SettingGroup, entry: CalloutDefinition) {
	section.addSetting((setting) => {
		setting
			.setName(`🔒 ${entry.name}`)
			.setDesc(
				nativeCalloutDescription(entry),
			)
			.addTextArea((text) => {
				text.setValue(entry.aliases.join("\n"));
				text.inputEl.rows = Math.max(3, entry.aliases.length || 1);
				text.inputEl.addEventListener("change", () => {
					const sanitizedAliases = sanitizeAliases(
						text.getValue().split(/\r?\n/g),
					);
					for (const alias of sanitizedAliases) {
						const conflict = findAliasCollision(host.plugin.settings.callouts, alias, entry.scope, entry.id);
						if (conflict) {
							new Notice(
								t("The alias \"{alias}\" is already used by \"{name}\" in a scope that overlaps this one.", {
									alias,
									name: conflict.name,
								}),
							);
							text.setValue(entry.aliases.join("\n"));
							return;
						}
					}
					text.setValue(sanitizedAliases.join("\n"));
					runTask(
						async () => {
							entry.aliases = sanitizedAliases;
							await host.plugin.saveSettings();
						},
						SETTINGS_SAVE_LOG_MESSAGE,
						settingsSaveNotice(),
					);
				});
			});
	});
}

export function calloutDescription(entry: CalloutDefinition): string {
	const values = {
		scope: scopeLabel(entry.scope),
		aliases: entry.aliases.join(", ") || t("none"),
		hint: calloutShortcutHint(entry),
	};
	return values.hint
		? t("Scope: {scope} · aliases: {aliases}. {hint}", values)
		: t("Scope: {scope} · aliases: {aliases}.", values);
}

export function nativeCalloutDescription(entry: CalloutDefinition): string {
	const values = { scope: scopeLabel(entry.scope), hint: calloutShortcutHint(entry) };
	return values.hint
		? t("Scope: {scope}. Only the aliases can be edited here, one per line. {hint}", values)
		: t("Scope: {scope}. Only the aliases can be edited here, one per line.", values);
}

/** No alias means no command is registered for this entry — no hint to give then. */
export function calloutShortcutHint(entry: CalloutDefinition): string {
	if (!entry.aliases[0]) {
		return "";
	}

	return t("Shortcut: Settings → Hotkeys → search for \"{command}\".", {
		command: calloutCommandName(entry),
	});
}
