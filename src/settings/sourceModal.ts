import { App, Modal, Notice, Setting } from "obsidian";
import type BrumesPlugin from "../BrumesPlugin";
import { isSafeSchemaSourceRepository, schemaSourceId } from "../games/sources";
import type { SchemaSource, SchemaSourceReference } from "../games/sources";

export class SchemaSourceModal extends Modal {
	private repository: string;
	private kind: SchemaSourceReference["kind"];
	private value: string;
	private errorEl: HTMLElement | null = null;
	// eslint-disable-next-line obsidianmd/prefer-active-doc
	constructor(app: App, private readonly plugin: BrumesPlugin, private readonly existing: SchemaSource | null, private readonly saved: () => void) {
		super(app); this.repository = existing?.repository ?? ""; this.kind = existing?.reference.kind ?? "latest"; this.value = existing?.reference.kind === "latest" ? "" : existing?.reference.value ?? "";
	}
	onOpen(): void {
		this.setTitle(this.existing ? "Edit schema source" : "Add schema source");
		new Setting(this.contentEl).setName("GitHub repository").addText((text) => text.setValue(this.repository).onChange((value) => { this.repository = value.trim(); }));
		new Setting(this.contentEl).setName("Reference").addDropdown((drop) => drop.addOption("latest", "Latest release").addOption("tag", "Tag").addOption("branch", "Branch").setValue(this.kind).onChange((value) => { this.kind = value as SchemaSourceReference["kind"]; this.render(); }));
		if (this.kind !== "latest") new Setting(this.contentEl).setName(this.kind === "tag" ? "Tag" : "Branch").addText((text) => text.setValue(this.value).onChange((value) => { this.value = value.trim(); }));
		this.errorEl = this.contentEl.createDiv({ cls: "setting-item-description" });
		new Setting(this.contentEl).addButton((button) => button.setButtonText("Cancel").onClick(() => this.close())).addButton((button) => button.setButtonText("Save and check").setCta().onClick(() => this.save()));
	}
	private render(): void { this.contentEl.empty(); this.onOpen(); }
	private save(): void {
		if (!isSafeSchemaSourceRepository(this.repository) || (this.kind !== "latest" && !this.value)) { this.errorEl?.setText("Enter an owner/repository and, when required, a reference."); return; }
		const reference: SchemaSourceReference = this.kind === "latest" ? { kind: "latest" } : { kind: this.kind, value: this.value };
		const source: SchemaSource = { repository: this.repository, id: schemaSourceId(this.repository), reference };
		void this.plugin.saveSchemaSource(source, this.existing?.repository ?? null).then(() => { this.saved(); this.close(); }).catch((error: unknown) => { this.errorEl?.setText(String(error)); new Notice("Schema source was not installed."); });
	}
}
