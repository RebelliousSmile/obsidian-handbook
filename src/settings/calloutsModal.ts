import { App, Modal, Notice, Setting, getIconIds } from "obsidian";
import BrumesPlugin from "../BrumesPlugin";
import { generateCalloutId } from "../features/callouts/migrateAliases";
import { findAliasCollision } from "../features/callouts/collisions";
import { sanitizeAliases } from "../features/callouts/sanitizeAlias";
import {
	CalloutColorRegime,
	CalloutDefinition,
	CalloutFontRole,
	CalloutScope,
	CalloutTemplate,
} from "../features/callouts/types";
import { GAME_PACKS } from "../games/registry";
import { log } from "../utils/logger";
import { t } from "../utils/i18n";
import { SETTINGS_SAVE_LOG_MESSAGE, settingsSaveNotice } from "./saveMessages";

const DEFAULT_CALLOUT_COLOR = "#e2c6c5";

/**
 * Screen B: the limited constructor for a user callout. Creates a new entry
 * when `existing` is null, otherwise edits it in place — natives never reach
 * this modal, they are edited inline on screen A.
 */
export class CalloutsModal extends Modal {
	private readonly plugin: BrumesPlugin;
	private readonly existing: CalloutDefinition | null;
	private readonly onSaved: () => void;

	private name: string;
	private aliases: string[];
	private calloutScope: CalloutScope;
	private template: CalloutTemplate;
	private icon: string;
	private font: CalloutFontRole;
	private colorKind: "fixed" | "theme";
	private colorHex: string;

	private errorEl: HTMLElement | null = null;


	constructor(
		app: App,
		plugin: BrumesPlugin,
		existing: CalloutDefinition | null,
		onSaved: () => void,
	) {
		super(app);
		this.plugin = plugin;
		this.existing = existing;
		this.onSaved = onSaved;

		this.name = existing?.name ?? "";
		this.aliases = existing?.aliases ?? [];
		this.calloutScope = existing?.scope ?? "all";
		this.template = existing?.template ?? "body-only";
		this.icon = existing?.icon ?? "";
		this.font = existing?.font ?? "text";
		this.colorKind = existing?.color.kind ?? "theme";
		this.colorHex = existing?.color.kind === "fixed" ? existing.color.hex : DEFAULT_CALLOUT_COLOR;
	}

	onOpen(): void {
		this.setTitle(this.existing ? t("Edit callout") : t("New callout"));
		this.render();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();

		new Setting(contentEl).setName(t("Name")).addText((text) =>
			text.setValue(this.name).onChange((value) => {
				this.name = value;
			}),
		);

		new Setting(contentEl)
			.setName(t("Aliases"))
			.setDesc(t("One alias per line. The first one is inserted from the context menu."))
			.addTextArea((text) => {
				text.setValue(this.aliases.join("\n"));
				text.inputEl.rows = Math.max(3, this.aliases.length || 1);
				text.onChange((value) => {
					this.aliases = sanitizeAliases(value.split(/\r?\n/g));
				});
			});

		new Setting(contentEl)
			.setName(t("Scope"))
			.setDesc(t("Where this callout is available."))
			.addDropdown((drop) => {
				drop.addOption("all", t("All games"));
				for (const pack of GAME_PACKS) {
					drop.addOption(pack.id, pack.label);
				}
				drop.setValue(this.calloutScope).onChange((value) => {
					this.calloutScope = value;
				});
			});

		new Setting(contentEl)
			.setName(t("Template"))
			.addDropdown((drop) =>
				drop
					.addOption("title-body", t("Title + body"))
					.addOption("body-only", t("Body only"))
					.setValue(this.template)
					.onChange((value) => {
						this.template = value as CalloutTemplate;
					}),
			);

		const iconSetting = new Setting(contentEl)
			.setName(t("Icon"))
			.setDesc(t("Icon name (optional)."))
			.addText((text) => {
				text.setValue(this.icon).onChange((value) => {
					this.icon = value.trim();
					if (this.icon.length === 0 || getIconIds().includes(this.icon)) {
						iconSetting.setDesc(t("Icon name (optional)."));
					} else {
						iconSetting.setDesc(t("Unknown icon: \"{icon}\".", { icon: this.icon }));
					}
				});
			});

		new Setting(contentEl)
			.setName(t("Font"))
			.addDropdown((drop) =>
				drop
					.addOption("header", t("Heading"))
					.addOption("text", t("Text"))
					.setValue(this.font)
					.onChange((value) => {
						this.font = value as CalloutFontRole;
					}),
			);

		let colorPickerSetting: Setting;
		new Setting(contentEl)
			.setName(t("Colour"))
			.addDropdown((drop) =>
				drop
					.addOption("fixed", t("Fixed"))
					.addOption("theme", t("Follows the theme"))
					.setValue(this.colorKind)
					.onChange((value) => {
						this.colorKind = value as "fixed" | "theme";
						colorPickerSetting.settingEl.hidden = this.colorKind !== "fixed";
					}),
			);

		colorPickerSetting = new Setting(contentEl)
			.setName(t("Fixed colour"))
			.addColorPicker((picker) =>
				picker.setValue(this.colorHex).onChange((value) => {
					this.colorHex = value;
				}),
			);
		colorPickerSetting.settingEl.hidden = this.colorKind !== "fixed";

		this.errorEl = contentEl.createDiv({ cls: "setting-item-description" });

		new Setting(contentEl)
			.addButton((button) => button.setButtonText(t("Cancel")).onClick(() => this.close()))
			.addButton((button) =>
				button
					.setButtonText(t("Save"))
					.setCta()
					.onClick(() => this.save()),
			);
	}

	private save(): void {
		const name = this.name.trim();
		if (name.length === 0) {
			this.showError(t("The name is required."));
			return;
		}

		if (this.icon.length > 0 && !getIconIds().includes(this.icon)) {
			this.showError(t("Unknown icon: \"{icon}\".", { icon: this.icon }));
			return;
		}

		const others = this.plugin.settings.callouts.filter(
			(c) => c.id !== this.existing?.id,
		);

		for (const alias of this.aliases) {
			const conflict = findAliasCollision(others, alias, this.calloutScope);
			if (conflict) {
				this.showError(
						t("The alias \"{alias}\" is already used by \"{name}\" in a scope that overlaps this one.", { alias, name: conflict.name }),
				);
				return;
			}
		}

		const takenIds = new Set<string>();
		for (const other of others) {
			takenIds.add(other.id);
			takenIds.add(other.styleKey);
		}

		const id = this.existing?.id ?? generateCalloutId(name, takenIds);

		const color: CalloutColorRegime =
			this.colorKind === "fixed" ? { kind: "fixed", hex: this.colorHex } : { kind: "theme" };

		const entry: CalloutDefinition = {
			id,
			name,
			aliases: this.aliases,
			scope: this.calloutScope,
			template: this.template,
			icon: this.icon.length > 0 ? this.icon : undefined,
			font: this.font,
			color,
			native: false,
			styleKey: id,
		};

		this.runSave(entry);
	}

	private runSave(entry: CalloutDefinition): void {
		void this.persist(entry).catch((error: unknown) => {
			log.error(SETTINGS_SAVE_LOG_MESSAGE, error);
			new Notice(settingsSaveNotice());
		});
	}

	private async persist(entry: CalloutDefinition): Promise<void> {
		const previous = this.plugin.settings.callouts;
		const index = this.existing
			? previous.findIndex((c) => c.id === this.existing?.id)
			: -1;
		const next = [...previous];

		if (index >= 0) {
			next[index] = entry;
		} else {
			next.push(entry);
		}

		this.plugin.settings.callouts = next;
		try {
			await this.plugin.saveSettings();
		} catch (error) {
			this.plugin.settings.callouts = previous;
			throw error;
		}
		this.onSaved();
		this.close();
	}

	private showError(message: string): void {
		this.errorEl?.setText(message);
	}
}
