import { Modal, Setting } from "obsidian";
import type { App } from "obsidian";
import type BrumesPlugin from "../BrumesPlugin";
import { t } from "../utils/i18n";
import {
	currentPackIntegration,
	type PackIntegrationFinding,
	type PackIntegrationReport,
} from "../features/packs/integration";

function describeFinding(finding: PackIntegrationFinding): string {
	switch (finding.kind) {
		case "missing-manifest":
			return t("No plugin manifest installed.");
		case "unsupported-capability":
			return t("Unsupported capability: {detail}.", { detail: finding.detail });
		case "unavailable-block":
			return t("Block unavailable: {detail}.", { detail: finding.detail });
		case "unavailable-style":
			return t("Style unavailable: {detail}.", { detail: finding.detail });
		case "missing-resource":
			return t("Resource unavailable: {detail}.", { detail: finding.detail });
		case "resolution-failure":
			return t("Could not inspect this pack: {detail}.", { detail: finding.detail });
	}
}

type ReportLoader = (plugin: BrumesPlugin) => Promise<PackIntegrationReport>;

/**
 * A live check, deliberately not a persisted diagnostic: resource availability
 * belongs to the current vault and can change while the settings tab is open.
 */
export class PackIntegrationModal extends Modal {
	private isOpen = true;

	constructor(
		app: App,
		private readonly plugin: BrumesPlugin,
		private readonly loadReport: ReportLoader = currentPackIntegration,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(t("Pack integration check"));
		this.contentEl.createEl("p", { text: t("Checking every registered pack…") });
		void this.refresh();
	}

	onClose(): void {
		this.isOpen = false;
		this.contentEl.empty();
	}

	private async refresh(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.createEl("p", { text: t("Checking every registered pack…") });
		try {
			const report = await this.loadReport(this.plugin);
			if (!this.isOpen) return;
			this.render(report);
		} catch (error) {
			if (!this.isOpen) return;
			this.renderFailure(error);
		}
	}

	private renderFailure(error: unknown): void {
		this.contentEl.empty();
		new Setting(this.contentEl)
			.setName(t("Pack integration check failed"))
			.setDesc(t("Try again. {reason}", { reason: error instanceof Error ? error.message : String(error) }))
			.addButton((button) => button.setButtonText(t("Retry")).onClick(() => {
				void this.refresh();
			}));
	}

	private render(report: PackIntegrationReport): void {
		this.contentEl.empty();
		this.contentEl.createEl("p", {
			text: report.packs.length === 0
				? t("No game pack is registered in this vault.")
				: t("{installed} installed · {ready} ready · {attention} need attention.", {
					installed: report.installed,
					ready: report.ready,
					attention: report.attention,
				}),
		});
		if (report.packs.length === 0) return;

		this.contentEl.createEl("h3", { text: t("Registered packs") });
		for (const pack of report.packs) {
			const details = [
				pack.installed ? t("Plugin manifest installed.") : t("Plugin manifest missing."),
				pack.declaredCapabilities.length === 0
					? t("No declared capabilities.")
					: t("Capabilities: {list}.", { list: pack.declaredCapabilities.join(", ") }),
				pack.availableBlocks.length > 0 ? t("Blocks: {list}.", { list: pack.availableBlocks.join(", ") }) : t("No declared blocks."),
				pack.availableStyles.length > 0 ? t("Styles: {list}.", { list: pack.availableStyles.join(", ") }) : t("No declared styles."),
				...pack.findings.map(describeFinding),
			];
			new Setting(this.contentEl)
				.setName(pack.ready
					? t("Ready: {label}", { label: pack.label })
					: t("Needs attention: {label}", { label: pack.label }))
				.setDesc(details.join(" "));
		}
	}
}
