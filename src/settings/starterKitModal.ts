import { App, Modal, Notice, Setting } from "obsidian";
import type BrumesPlugin from "../BrumesPlugin";
import { t } from "../utils/i18n";
import { STARTER_KITS, StarterKit } from "../games/starterKits";

/** First-run choice for marketplace and core installs with no game pack. */
export class StarterKitModal extends Modal {

	constructor(
		app: App,
		private readonly plugin: BrumesPlugin,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(t("Choose a starter kit"));
		this.contentEl.createEl("p", {
			text: t("Handbook has no game installed yet. Choose a starter kit to install its schema source and make the plugin useful immediately."),
		});
		this.render();
	}

	private render() {
		if (STARTER_KITS.length === 0) {
			this.contentEl.createEl("p", { text: t("No starter kit catalogue is available in this release.") });
			return;
		}
		for (const kit of STARTER_KITS) this.renderKit(kit);
	}

	private renderKit(kit: StarterKit) {
		new Setting(this.contentEl)
			.setName(kit.label)
			.setDesc(kit.description)
			.addButton((button) => button.setButtonText(t("Install")).setCta().onClick(() => {
				button.setDisabled(true).setButtonText(t("Installing…"));
				void this.install(kit, button);
			}));
	}

	private async install(kit: StarterKit, button: { setDisabled(disabled: boolean): unknown; setButtonText(text: string): unknown }) {
		try {
			await this.plugin.installStarterKit(kit);
			new Notice(t("{label} is ready.", { label: kit.label }));
			this.close();
		} catch (error) {
			button.setDisabled(false);
			button.setButtonText(t("Install"));
			new Notice(t("Could not install {label}: {reason}", { label: kit.label, reason: error instanceof Error ? error.message : t("unknown error") }));
		}
	}
}
