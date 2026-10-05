import { App, Modal, Notice, Setting } from "obsidian";
import type BrumesPlugin from "../BrumesPlugin";
import { t } from "../utils/i18n";
import { isSafeSchemaSourceRepository, schemaSourceId } from "../games/sources";
import type { SchemaSource, SchemaSourceReference } from "../games/sources";

export class SchemaSourceModal extends Modal {
	private repository: string;
	private kind: SchemaSourceReference["kind"];
	private value: string;
	private errorEl: HTMLElement | null = null;

	constructor(app: App, private readonly plugin: BrumesPlugin, private readonly existing: SchemaSource | null, private readonly saved: () => void) {
		super(app); this.repository = existing?.repository ?? ""; this.kind = existing?.reference.kind ?? "latest"; this.value = existing?.reference.kind === "latest" ? "" : existing?.reference.value ?? "";
	}
	onOpen(): void {
		this.setTitle(this.existing ? t("Edit schema source") : t("Add schema source"));
		new Setting(this.contentEl).setName(t("GitHub repository")).addText((text) => text.setValue(this.repository).onChange((value) => { this.repository = value.trim(); }));
		new Setting(this.contentEl).setName(t("Reference")).addDropdown((drop) => drop.addOption("latest", t("Latest release")).addOption("tag", t("Tag")).addOption("branch", t("Branch")).setValue(this.kind).onChange((value) => { this.kind = value as SchemaSourceReference["kind"]; this.render(); }));
		if (this.kind !== "latest") new Setting(this.contentEl).setName(this.kind === "tag" ? t("Tag") : t("Branch")).addText((text) => text.setValue(this.value).onChange((value) => { this.value = value.trim(); }));
		this.errorEl = this.contentEl.createDiv({ cls: "setting-item-description" });
		new Setting(this.contentEl).addButton((button) => button.setButtonText(t("Cancel")).onClick(() => this.close())).addButton((button) => button.setButtonText(t("Save and check")).setCta().onClick(() => this.save()));
	}
	private render(): void { this.contentEl.empty(); this.onOpen(); }
	private save(): void {
		if (!isSafeSchemaSourceRepository(this.repository) || (this.kind !== "latest" && !this.value)) { this.errorEl?.setText(t("Enter an owner/repository and, when required, a reference.")); return; }
		const reference: SchemaSourceReference = this.kind === "latest" ? { kind: "latest" } : { kind: this.kind, value: this.value };
		const source: SchemaSource = { repository: this.repository, id: schemaSourceId(this.repository), reference };
		void this.plugin.saveSchemaSource(source, this.existing?.repository ?? null).then(() => { this.saved(); this.close(); }).catch((error: unknown) => {
			const message = error instanceof Error ? error.message : String(error);
			this.errorEl?.setText(message);
			new Notice(t("Schema source was not installed: {reason}", { reason: message }));
		});
	}
}

export class SchemaSourceRemovalModal extends Modal {

	constructor(
		app: App,
		private readonly plugin: BrumesPlugin,
		private readonly source: SchemaSource,
		private readonly removed: () => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(t("Remove schema source"));
		this.contentEl.createEl("p", {
			text: t("Remove {repository} and all of its installed game packs?", { repository: this.source.repository }),
		});
		new Setting(this.contentEl)
			.addButton((button) =>
				button.setButtonText(t("Cancel")).onClick(() => this.close()),
			)
			.addButton((button) => {
				button.buttonEl.classList.add("mod-warning");
				button.setButtonText(t("Remove source")).onClick(() => this.remove());
			});
	}

	private remove(): void {
		void this.plugin
			.removeSchemaSource(this.source)
			.then(() => {
				this.removed();
				this.close();
			})
			.catch((error: unknown) => {
				new Notice(t("Schema source was not removed: {reason}", { reason: String(error) }));
			});
	}
}
