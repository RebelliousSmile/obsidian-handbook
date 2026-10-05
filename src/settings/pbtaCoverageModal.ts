import { Modal, Setting } from "obsidian";
import type { App } from "obsidian";
import { t } from "../utils/i18n";
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
		this.setTitle(t("PbtA playbook coverage"));
		const report = this.report;
		const findings = describePbtaCoverage(report);

		this.contentEl.createEl("p", {
			text: findings.length === 0
				? t("No PbtA format gaps detected. Formats for other game packs are available when those packs are installed.")
				: t("Some playbook formats are not fully readable in this vault."),
		});
		for (const finding of findings) {
			this.contentEl.createEl("p", { text: finding });
		}

		this.contentEl.createEl("h3", { text: t("Game-specific formats") });
		if (report.projected.length === 0) {
			this.contentEl.createEl("p", { text: t("This build reads no game-specific playbook format.") });
		} else {
			for (const target of report.projected) {
				new Setting(this.contentEl)
					.setName(target)
					.setDesc(report.missingPacks.indexOf(target) >= 0
						? t("Supported by this build. Install the \"{pack}\" pack to use it.", { pack: expectedPackId(target) })
						: t("Readable. Expects the \"{pack}\" pack, installed.", { pack: expectedPackId(target) }));
			}
		}

		if (report.aliases.length > 0) {
			this.contentEl.createEl("h3", { text: t("Formats read as a portable playbook") });
			this.contentEl.createEl("p", {
				text: t("Expected, not a problem: these games describe a playbook the portable schema already covers, so their documents are read as generic playbooks and their game definition carries what is specific to them."),
			});
			for (const target of report.aliases) {
				new Setting(this.contentEl).setName(target).setDesc(t("No distinguishing field."));
			}
		}

		/* Only formats reachable through an installed pack affect this vault. */
		const unresolvedInVault = report.unresolved.filter((target) =>
			report.packs.some((id) => target.startsWith(`${id}-`)),
		);
		if (unresolvedInVault.length > 0) {
			this.contentEl.createEl("h3", { text: t("Formats not read yet") });
			this.contentEl.createEl("p", {
				text: t("The installed schema source carries these playbook formats and this build does not read them yet. Their documents still render as generic playbooks, without whatever each format adds."),
			});
			for (const target of unresolvedInVault) {
				new Setting(this.contentEl).setName(target).setDesc(t("Newer than this build."));
			}
		}

		this.contentEl.createEl("h3", { text: t("Installed PbtA packs") });
		this.contentEl.createEl("p", {
			text: report.packs.length === 0
				? t("No installed pack declares a PbtA capability.")
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
	const installedFormats = report.projected.length - report.missingPacks.length;
	const readable = installedFormats === 1
		? t("1 installed game-specific format readable")
		: t("{count} installed game-specific formats readable", { count: installedFormats });
	if (findings.length === 0) return t("PbtA coverage: {readable}, no format gaps.", { readable });
	return findings.length === 1
		? t("PbtA coverage: {readable}, 1 finding.", { readable })
		: t("PbtA coverage: {readable}, {count} findings.", { readable, count: findings.length });
}
