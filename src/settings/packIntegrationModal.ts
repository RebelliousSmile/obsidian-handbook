import { Modal, Setting } from "obsidian";
import type { App } from "obsidian";
import type BrumesPlugin from "../BrumesPlugin";
import {
	currentPackIntegration,
	type PackIntegrationFinding,
	type PackIntegrationReport,
} from "../features/packs/integration";

function describeFinding(finding: PackIntegrationFinding): string {
	switch (finding.kind) {
		case "missing-manifest":
			return "No plugin manifest installed.";
		case "unsupported-capability":
			return `Unsupported capability: ${finding.detail}.`;
		case "unavailable-block":
			return `Block unavailable: ${finding.detail}.`;
		case "unavailable-style":
			return `Style unavailable: ${finding.detail}.`;
		case "missing-resource":
			return `Resource unavailable: ${finding.detail}.`;
		case "resolution-failure":
			return `Could not inspect this pack: ${finding.detail}.`;
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
		this.setTitle("Pack integration check");
		this.contentEl.createEl("p", { text: "Checking every registered pack…" });
		void this.refresh();
	}

	onClose(): void {
		this.isOpen = false;
		this.contentEl.empty();
	}

	private async refresh(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.createEl("p", { text: "Checking every registered pack…" });
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
			.setName("Pack integration check failed")
			.setDesc(`Try again. ${error instanceof Error ? error.message : String(error)}`)
			.addButton((button) => button.setButtonText("Retry").onClick(() => {
				void this.refresh();
			}));
	}

	private render(report: PackIntegrationReport): void {
		this.contentEl.empty();
		this.contentEl.createEl("p", {
			text: report.packs.length === 0
				? "No game pack is registered in this vault."
				: `${report.installed} installed · ${report.ready} ready · ${report.attention} need attention.`,
		});
		if (report.packs.length === 0) return;

		this.contentEl.createEl("h3", { text: "Registered packs" });
		for (const pack of report.packs) {
			const details = [
				pack.installed ? "Plugin manifest installed." : "Plugin manifest missing.",
				pack.declaredCapabilities.length === 0
					? "No declared capabilities."
					: `Capabilities: ${pack.declaredCapabilities.join(", ")}.`,
				pack.availableBlocks.length > 0 ? `Blocks: ${pack.availableBlocks.join(", ")}.` : "No declared blocks.",
				pack.availableStyles.length > 0 ? `Styles: ${pack.availableStyles.join(", ")}.` : "No declared styles.",
				...pack.findings.map(describeFinding),
			];
			new Setting(this.contentEl)
				.setName(`${pack.ready ? "Ready" : "Needs attention"}: ${pack.label}`)
				.setDesc(details.join(" "));
		}
	}
}
