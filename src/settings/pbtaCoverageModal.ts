import { Modal, Setting } from "obsidian";
import type { App } from "obsidian";
import { GAME_REGISTRATIONS } from "../games/registry";
import {
	PbtaCoverageInput,
	PbtaCoverageReport,
	describePbtaCoverage,
	pbtaCoverageReport,
} from "../features/pbta/coverage";

/**
 * The registry already holds what the vault installed, including the
 * capabilities each pack declares: no disk read is needed to report coverage.
 */
function installedPbtaCoverageInput(): PbtaCoverageInput[] {
	return GAME_REGISTRATIONS.map((registration) => ({
		id: registration.pack.id,
		requires: registration.installation?.requires,
	}));
}

/**
 * The pack a specialised format expects, read back off the target name. This is the exact inverse of
 * the `<pack.id>-playbook` form `assert:pbta-pack-coverage` proves against every published pack
 * contract, so the name shown here needs no upstream metadata embedded in the bundle.
 */
function expectedPackId(target: string): string {
	const suffix = "-playbook";
	return target.endsWith(suffix) ? target.slice(0, -suffix.length) : target;
}

/** Coverage of the build, measured against the packs this vault has installed. */
export function currentPbtaCoverage(): PbtaCoverageReport {
	return pbtaCoverageReport(installedPbtaCoverageInput());
}

/**
 * Reports which game-specific playbook formats this build reads, and which ones
 * silently fall back to the portable playbook. Nothing here is a setting: the
 * modal exists because the answer changes with every schema source a vault
 * installs, and no other screen shows it.
 */
export class PbtaCoverageModal extends Modal {
	private readonly report: PbtaCoverageReport;

	constructor(app: App, report: PbtaCoverageReport) {
		super(app);
		this.report = report;
	}

	onOpen(): void {
		this.setTitle("PbtA playbook coverage"); // eslint-disable-line obsidianmd/ui/sentence-case
		const report = this.report;
		const findings = describePbtaCoverage(report);

		this.contentEl.createEl("p", {
			text: findings.length === 0
				? "Every playbook format this build carries is readable and its pack is installed."
				: "Some playbook formats are not fully readable in this vault.",
		});
		for (const finding of findings) {
			this.contentEl.createEl("p", { text: finding });
		}

		this.contentEl.createEl("h3", { text: "Game-specific formats" });
		if (report.projected.length === 0) {
			this.contentEl.createEl("p", { text: "This build reads no game-specific playbook format." });
		} else {
			for (const target of report.projected) {
				new Setting(this.contentEl)
					.setName(target)
					.setDesc(report.missingPacks.indexOf(target) >= 0
						? `Readable. Expects the "${expectedPackId(target)}" pack, missing.`
						: `Readable. Expects the "${expectedPackId(target)}" pack, installed.`);
			}
		}

		if (report.aliases.length > 0) {
			this.contentEl.createEl("h3", { text: "Formats read as a portable playbook" });
			this.contentEl.createEl("p", {
				text: "Expected, not a problem: these games describe a playbook the portable schema already covers, so their documents are read as generic playbooks and their game definition carries what is specific to them.",
			});
			for (const target of report.aliases) {
				new Setting(this.contentEl).setName(target).setDesc("No distinguishing field.");
			}
		}

		/* An upstream addition, not a defect of the vault: it is named so the owner can ask for it. */
		if (report.unresolved.length > 0) {
			this.contentEl.createEl("h3", { text: "Formats not read yet" });
			this.contentEl.createEl("p", {
				text: "The installed schema source carries these playbook formats and this build does not read them yet. Their documents still render as generic playbooks, without whatever each format adds.",
			});
			for (const target of report.unresolved) {
				new Setting(this.contentEl).setName(target).setDesc("Newer than this build.");
			}
		}

		// eslint-disable-next-line obsidianmd/ui/sentence-case
		this.contentEl.createEl("h3", { text: "Installed PbtA packs" });
		this.contentEl.createEl("p", {
			text: report.packs.length === 0
				? "No installed pack declares a PbtA capability."
				: report.packs.join(", "),
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

/** The single line a Notice shows, so the user knows whether to open the modal. */
export function pbtaCoverageSummary(report: PbtaCoverageReport): string {
	const findings = describePbtaCoverage(report);
	const readable = `${report.projected.length} game-specific ${report.projected.length === 1 ? "format" : "formats"} readable`;
	return findings.length === 0
		? `PbtA coverage: ${readable}, nothing missing.`
		: `PbtA coverage: ${readable}, ${findings.length} ${findings.length === 1 ? "finding" : "findings"}.`;
}
