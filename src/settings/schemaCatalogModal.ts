import { App, Modal, Notice, Setting } from "obsidian";
import type BrumesPlugin from "../BrumesPlugin";
import { SCHEMA_CATALOG, type CatalogSource } from "../games/catalog";
import { t } from "../utils/i18n";

/** Install each schema independently, on first launch or from settings. */
export class SchemaCatalogModal extends Modal {
	private closed = false;
	private installing = false;
	private installed = new Set<string>();

	constructor(app: App, private readonly plugin: BrumesPlugin, private readonly changed: () => void = () => undefined) {
		super(app);
	}

	onOpen(): void {
		this.closed = false;
		this.setTitle(t("Install game packs"));
		void this.refresh();
	}

	onClose(): void {
		this.closed = true;
		this.contentEl.empty();
	}

	private async refresh(): Promise<void> {
		const installed = await Promise.all(SCHEMA_CATALOG.map(async (source) =>
			await this.plugin.readInstalledSchemaSource(source) ? source.id : null));
		this.installed = new Set(installed.filter((id): id is string => id !== null));
		if (!this.closed) this.render();
	}

	private render(): void {
		this.contentEl.empty();
		this.contentEl.createEl("p", { text: t("Choose a schema to install its game packs. Each schema can be installed independently.") });
		if (SCHEMA_CATALOG.length === 0) {
			this.contentEl.createEl("p", { text: t("No installable pack catalogue is available in this release.") });
		}
		for (const source of SCHEMA_CATALOG) {
			const installed = this.installed.has(source.id);
			new Setting(this.contentEl)
				.setName(source.label)
				.setDesc(source.repository)
				.addButton((button) => button
					.setButtonText(installed ? t("Installed") : t("Install"))
					.setDisabled(installed || this.installing)
					.onClick(() => { void this.install(source); }));
		}
	}

	private async install(source: CatalogSource): Promise<void> {
		if (this.installing || this.installed.has(source.id)) return;
		this.installing = true;
		this.render();
		const progress = new Notice(t("Installing {label}…", { label: source.label }), 0);
		try {
			await this.plugin.saveSchemaSource(source, null);
			this.changed();
			new Notice(t("{label} is ready.", { label: source.label }));
		} catch (error) {
			new Notice(t("Could not install {label}: {reason}", { label: source.label, reason: error instanceof Error ? error.message : t("unknown error") }));
		} finally {
			progress.hide();
			this.installing = false;
			if (!this.closed) await this.refresh();
		}
	}
}
