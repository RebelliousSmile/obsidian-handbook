import assert from "node:assert/strict";
import { PBTA_DOCUMENT_CODECS } from "schema-pbta";
import {
	PBTA_ALIAS_TARGETS,
	PBTA_GENERIC_TARGETS,
	describePbtaCoverage,
	pbtaCoverageReport,
} from "../src/features/pbta/coverage";
import { currentPbtaCoverage, pbtaCoverageSummary } from "../src/settings/pbtaCoverageModal";
import { initGameRegistry } from "../src/games/registry";
import { EMPTY_STYLE } from "../src/games/types";
import { PBTA_PROJECTED_TARGETS } from "../src/features/pbta/specializedPlaybooks";
import { PBTA_SPECIALIZED_FIELDS } from "../src/features/pbta/renderer";
import { PORTABLE_GAME_PLUGIN_SUPPORT } from "../src/games/capabilities";
import { loadPbtaProviderContract } from "./pbtaProviderContract.mts";
import {
	loadPbtaContractCases,
	PBTA_SPECIALIZED_PLAYBOOK_TARGETS,
	PBTA_TARGET_TO_BLOCK,
} from "./pbtaContractCorpus.mts";

const cases = loadPbtaContractCases();
const targets = Object.keys(PBTA_DOCUMENT_CODECS);
const projected = PBTA_PROJECTED_TARGETS as readonly string[];

/* The declared generic split has to name real codecs, or the specialised set is silently wrong. */
const report = pbtaCoverageReport([]);
assert.deepEqual(report.unknownGeneric, [], "PBTA_GENERIC_TARGETS names a target this build no longer carries");
const specialised = targets.filter((target) => !PBTA_GENERIC_TARGETS.includes(target));
assert.equal(
	specialised.length + PBTA_GENERIC_TARGETS.length,
	targets.length,
	"PbtA codec targets are not fully accounted for",
);

/* A target with no accepted witness cannot be proven to round-trip, here or upstream. */
for (const target of targets) {
	assert.ok(
		cases.some((entry) => entry.target === target && entry.expect === "accept"),
		`no accepted witness for ${target} in the shared corpus`,
	);
}
for (const entry of cases) {
	assert.ok(targets.includes(entry.target), `the corpus names an unknown target: ${entry.target}`);
}

/* Which specialised targets a document can actually reach is measured, not declared: a target that
   accepts the portable witness would claim every generic playbook before the generic parser runs. */
const portable = cases.filter((entry) => entry.target === "playbook" && entry.expect === "accept");
assert.ok(portable.length > 0, "the corpus carries no accepted portable playbook");
const aliases: string[] = [];
const unresolved: string[] = [];
for (const target of specialised) {
	const codec = PBTA_DOCUMENT_CODECS[target as keyof typeof PBTA_DOCUMENT_CODECS];
	const claimsPortable = portable.some((entry) => {
		try {
			codec.parseToml(entry.source);
			return true;
		} catch {
			return false;
		}
	});
	if (claimsPortable) {
		aliases.push(target);
		assert.ok(
			!projected.includes(target),
			`${target} accepts the portable playbook, so projecting it would mis-tag every generic playbook`,
		);
		continue;
	}
	/* The schema source ships on its own cadence: a format it adds before Handbook resolves it is
	   reported to the vault owner, not turned into a red build here. Documents still render, generically. */
	if (!projected.includes(target)) unresolved.push(target);
}

/* The plugin ships no corpus, so it declares its aliases; this is where the declaration is measured.
   Measurement alone cannot name an alias: a specialised schema too loose to reject the portable
   playbook looks exactly like one. So a mismatch is a question, not a line to append. */
assert.deepEqual(
	[...PBTA_ALIAS_TARGETS].sort(),
	[...aliases].sort(),
	"PBTA_ALIAS_TARGETS disagrees with the targets that accept the portable playbook: either the schema " +
		"source added an alias, or one of its specialised schemas no longer constrains anything",
);

/* Every projected target prints mechanics its own witness carries, so a renamed field is caught. */
for (const target of projected) {
	const fields = PBTA_SPECIALIZED_FIELDS[target as keyof typeof PBTA_SPECIALIZED_FIELDS];
	assert.ok(fields && fields.length > 0, `${target} declares no mechanical field to print`);
	const witness = cases.find((entry) => entry.target === target && entry.expect === "accept");
	assert.ok(witness, `${target} has no accepted witness`);
	const codec = PBTA_DOCUMENT_CODECS[target as keyof typeof PBTA_DOCUMENT_CODECS];
	const parsed = codec.parseToml(witness.source) as unknown as Record<string, unknown>;
	assert.ok(
		fields.some((field) => Object.prototype.hasOwnProperty.call(parsed, field)),
		`${target} prints none of ${fields.join(", ")}: its witness carries no mechanics`,
	);
}

/* The corpus helpers carry their own lists; pinning them here keeps the older harnesses from drifting. */
assert.deepEqual(
	[...PBTA_SPECIALIZED_PLAYBOOK_TARGETS].sort(),
	[...projected].sort(),
	"PBTA_SPECIALIZED_PLAYBOOK_TARGETS no longer matches the targets Handbook resolves",
);
for (const target of projected) {
	assert.ok(
		Object.prototype.hasOwnProperty.call(PBTA_TARGET_TO_BLOCK, target),
		`${target} resolves to no block in PBTA_TARGET_TO_BLOCK`,
	);
}

/* A pack list is the vault's half of the contract: with none installed, every format is unreachable. */
const empty = pbtaCoverageReport([]);
assert.deepEqual([...empty.missingPacks].sort(), [...projected].sort(), "an empty vault must report every format as unreachable");
const installed = pbtaCoverageReport(
	projected.map((target) => ({ id: target.slice(0, target.lastIndexOf("-playbook")), requires: ["block:pbta-playbook"] })),
);
assert.deepEqual(installed.missingPacks, [], "installing every owning pack must leave no unreachable format");
assert.deepEqual(
	[...installed.aliases].sort(),
	[...aliases].sort(),
	"the report disagrees with the measured aliases",
);
assert.deepEqual(
	[...installed.unresolved].sort(),
	[...unresolved].sort(),
	"the report disagrees with the measured unresolved formats",
);
/* Tolerating an upstream addition is only safe if the user is told: the finding carries the name. */
const added = { ...installed, unresolved: ["dungeon-world-playbook"] };
assert.ok(
	describePbtaCoverage(added).some((line) => line.indexOf("dungeon-world-playbook") >= 0),
	"a format this build does not resolve yet is never reported to the vault owner",
);
/* Symmetrically, an alias must stay silent: it is the correct reading, not a gap. */
assert.deepEqual(
	describePbtaCoverage({ ...installed, unresolved: [], aliases: ["salvage-run-playbook"] }),
	[],
	"an alias is reported as a finding",
);
/* A pack that declares no PbtA capability is not this contract's business. */
assert.deepEqual(pbtaCoverageReport([{ id: "masks", requires: ["style:city-of-mist"] }]).packs, []);

/* The settings check reads the registry, not the disk: what initGameRegistry accepts is what it reports. */
const owner = projected[0].slice(0, projected[0].lastIndexOf("-playbook"));
initGameRegistry([
	{ pack: { id: owner, label: owner, style: EMPTY_STYLE }, installation: { version: "1.0.0", root: owner, minimumHandbookVersion: "0.0.1", requires: ["block:pbta-playbook"] } },
	{ pack: { id: "silent", label: "silent", style: EMPTY_STYLE }, installation: { version: "1.0.0", root: "silent", minimumHandbookVersion: "0.0.1", requires: ["style:city-of-mist"] } },
]);
const fromSettings = currentPbtaCoverage();
assert.ok(fromSettings.packs.includes(owner), `the settings check ignores the installed pack ${owner}`);
assert.ok(!fromSettings.packs.includes("silent"), "the settings check counts a pack that declares no PbtA capability");
assert.ok(
	!fromSettings.missingPacks.includes(projected[0]),
	`${projected[0]} stays unreachable although its pack is registered`,
);
/* The one line the settings row shows has to carry the findings, or the button is the only way to see them. */
assert.match(pbtaCoverageSummary(fromSettings), /PbtA coverage: \d+ game-specific formats? readable/);
assert.equal(
	/nothing missing/.test(pbtaCoverageSummary(fromSettings)),
	describePbtaCoverage(fromSettings).length === 0,
	"the summary line disagrees with the findings it summarises",
);

/* ---- What the pinned tarball publishes about itself, from v5.5.0 on ----

   Handbook keeps declaring its own capabilities and its own ownership rule; what follows proves those
   declarations against cross-tool-provider.json and the pack contracts of the same tarball. The
   tolerance is asymmetric, and the reason differs per assertion:
   - across versions, an upstream addition is an observation: the three repos advance on their own
     cadence, and "extend the schema before the consumer work" makes upstream-ahead the expected order;
   - inside one pinned tarball, codecs, pack contracts and corpus ship together, so a disagreement
     between them is a defect of that version and fails here. */
const contract = loadPbtaProviderContract();
const published = [...PORTABLE_GAME_PLUGIN_SUPPORT.blocks, ...PORTABLE_GAME_PLUGIN_SUPPORT.styles, ...(PORTABLE_GAME_PLUGIN_SUPPORT.presentations ?? [])];
for (const capability of published) {
	assert.ok(
		contract.capabilities.indexOf(capability) >= 0,
		`${capability} is declared by Handbook and no longer published for it: capabilities.handbook lists ` +
			`${contract.capabilities.join(", ")}`,
	);
}
/* The reverse excess is an addition, not a regression: equality here would redden the build on every
   release that offers Handbook something new, with nothing broken. */
const offered = contract.capabilities.filter((capability) => published.indexOf(capability) < 0);

const declaredTargets: string[] = [];
for (const pack of contract.packs) {
	for (const capability of pack.requirements) {
		assert.ok(
			contract.capabilities.indexOf(capability) >= 0,
			`pack ${pack.id} requires ${capability}, which its own provider does not publish for Handbook`,
		);
	}
	for (const document of pack.documents) {
		/* The form the runtime report inverts to name the expected pack. Anything else makes
		   missingPacks silently wrong for that format, which no user could notice. */
		assert.ok(
			PBTA_GENERIC_TARGETS.includes(document.target) || document.target === `${pack.id}-playbook`,
			`pack ${pack.id} publishes ${document.target}: a specialised target must be ${pack.id}-playbook, ` +
				"the form the coverage report reads ownership off",
		);
		assert.ok(
			targets.includes(document.target),
			`pack ${pack.id} publishes ${document.target} with no codec in the same tarball`,
		);
		assert.ok(
			cases.some((entry) => entry.path === document.fixture),
			`pack ${pack.id} names the fixture ${document.fixture}, absent from the corpus of the same tarball`,
		);
		if (declaredTargets.indexOf(document.target) < 0) declaredTargets.push(document.target);
	}
}

/* A target Handbook resolves and no pack claims any more is a regression of what Handbook declares. */
for (const target of projected) {
	assert.ok(
		declaredTargets.indexOf(target) >= 0,
		`${target} is projected by Handbook and no published pack declares it any more`,
	);
}
/* Symmetrically, a pack or a target added upstream and not projected is reported, not failed: its
   documents still render as generic playbooks, and the vault owner is the one who needs to know. */
const unclaimed = declaredTargets.filter(
	(target) =>
		!PBTA_GENERIC_TARGETS.includes(target) && !projected.includes(target) && PBTA_ALIAS_TARGETS.indexOf(target) < 0,
);
for (const target of unclaimed) {
	assert.ok(
		unresolved.indexOf(target) >= 0,
		`${target} is published and neither resolved nor reported: the coverage report would stay silent about it`,
	);
}

console.log(
	`PbtA coverage passed: ${projected.length} projected target${projected.length === 1 ? "" : "s"}, ` +
		`${aliases.length} alias${aliases.length === 1 ? "" : "es"}${aliases.length > 0 ? ` (${aliases.join(", ")})` : ""}, ` +
		`${PBTA_GENERIC_TARGETS.length} generic targets.`,
);
console.log(
	`  proven against schema-pbta contract v${contract.contractVersion}: ${contract.packs.length} published packs, ` +
		`${declaredTargets.length} declared targets, ${published.length} capabilities included.`,
);
if (unresolved.length > 0) {
	console.log(
		`  not resolved yet, rendered as generic playbooks: ${unresolved.join(", ")}`,
	);
}
if (offered.length > 0) {
	console.log(`  offered upstream and not implemented here: ${offered.join(", ")}`);
}
