import { Notice, SettingGroup } from "obsidian";
import { log } from "../utils/logger";
import { t } from "../utils/i18n";
import { SchemaSourceModal, SchemaSourceRemovalModal } from "./sourceModal";
import type { SettingsHost } from "./sectionHelpers";

export function renderSchemaSources(host: SettingsHost, section: SettingGroup) {
	const sources = host.plugin.settings.schemaSources;
	section.addSetting((setting) => {
		setting
			.setName(t("Repositories"))
			.setDesc(sources.length === 0
					? t("No schema repository is registered yet.")
					: sources.length === 1
						? t("1 schema repository is registered.")
						: t("{count} schema repositories are registered.", { count: sources.length }))
			.addButton((button) => button.setButtonText(t("Add source")).onClick(() => { new SchemaSourceModal(host.app, host.plugin, null, () => host.redisplay()).open(); }));
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
						const before = await host.plugin.readInstalledSchemaSource(source);
						await host.plugin.saveSchemaSource(source, source.repository);
						const after = await host.plugin.readInstalledSchemaSource(source);
						host.redisplay();
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
				.addButton((button) => button.setButtonText(t("Edit")).onClick(() => { new SchemaSourceModal(host.app, host.plugin, source, () => host.redisplay()).open(); }))
				.addButton((button) => {
					button.buttonEl.classList.add("mod-warning");
					button.setButtonText(t("Remove")).onClick(() => { new SchemaSourceRemovalModal(host.app, host.plugin, source, () => host.redisplay()).open(); });
				});
			void host.plugin.readInstalledSchemaSource(source).then((installed) => {
				if (!host.containerEl.contains(setting.settingEl)) return;
				setting.setDesc(t("{reference} · {status}", { reference, status: installed ? t("Installed") : t("Not installed") }));
			});
		});
	}
}
