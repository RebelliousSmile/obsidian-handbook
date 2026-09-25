---
objective: "Handbook release certification rejects the known broken bundle, proves a corrected immutable candidate in Obsidian 1.13.7, converges on canonical final provider pins, and publishes a BRAT-loadable patch."
status: in-progress
---

# Plan: Gate Handbook releases on a real plugin-load proof

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Establish an incident-reproducing host gate first, use it to certify the corrected provider candidate, then converge and publish the Handbook patch. |
| **Source** | GitHub issue [#63](https://github.com/RebelliousSmile/obsidian-handbook/issues/63), including its ownership-segmentation update; replanned after implementation exposed local evidence names and fields incompatible with the provider-owned protocol-1 parser. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Reproduce the activation failure with a deterministic host harness | [`phase-1.md`](./phase-1.md) |
| 2 | Install fail-closed candidate and publication gates | [`phase-2.md`](./phase-2.md) |
| 3 | Commit the corrected staged provider candidate | [`phase-3.md`](./phase-3.md) |
| 4 | Conform Handbook evidence to the master release-train contract | [`phase-4.md`](./phase-4.md) |
| 5 | Prove both immutable consumers and promote schema-pbta | [`phase-5.md`](./phase-5.md) |
| 6 | Converge Handbook on canonical final provider pins | [`phase-6.md`](./phase-6.md) |
| 7 | Prepare one coherent Handbook patch | [`phase-7.md`](./phase-7.md) |
| 8 | Publish and verify the public BRAT release | [`phase-8.md`](./phase-8.md) |

## Resources

| Source | Verified |
| --- | --- |
| [Handbook #63](https://github.com/RebelliousSmile/obsidian-handbook/issues/63) | Requires a real production-bundle load proof, mandatory candidate/release gates, final canonical pins, coherent patch identity, and BRAT activation. |
| [schema-pbta #41](https://github.com/RebelliousSmile/schema-pbta/issues/41) | The corrected PbtA archive must keep browser asset construction out of ordinary root imports and pass both CommonJS and Vite packed-package proofs before Handbook adoption. |
| [schema-adrenaline #36](https://github.com/RebelliousSmile/schema-adrenaline/issues/36) | The current final release lacks the canonical archive filename; both consumers must move to a byte-identical canonical final asset when published. |
| [schema-in-the-mist #25](https://github.com/RebelliousSmile/schema-in-the-mist/issues/25) | Candidate/final bytes already agree, but Handbook and Lantern must converge on the promoted final archive and SRI. |
| [Lantern #47](https://github.com/RebelliousSmile/lantern/issues/47) | Owns PbtA v8.4.3 candidate adoption, browser-subpath migration, four-asset Vite proof, and the immutable Lantern consumer ref required before promotion. |
| [Lantern #46](https://github.com/RebelliousSmile/lantern/issues/46) | Owns Lantern-wide release identity, default validation, and post-promotion convergence to canonical final provider pins. |
| [BRAT](https://github.com/TfTHacker/obsidian42-brat) | Exposes the `AddBetaPlugin` command and release-driven installation path needed for a faithful disposable-vault acceptance journey. |

## Decisions

| Decision | Why |
| --- | --- |
| Make the first host-harness phase pass by detecting the known v2.29.1 failure, not by requiring a success that depends on a later provider release. | Each phase becomes executable in order, and the regression starts with evidence that the new gate catches the actual incident. |
| Use the real Obsidian load as Handbook's authoritative rejection of browser-only CommonJS side effects. | The faulty production build emits no `empty-import-meta` diagnostic, so promoting that nonexistent warning would create a false gate; provider-side static/CommonJS coverage remains owned by schema-pbta #41. |
| Stabilize the vault-trust state before measuring plugin activation. | Renderer readiness does not guarantee that Obsidian has rendered the trust dialog; treating those as one state makes a timing race masquerade as a plugin-load failure. |
| Commit the corrected candidate pin before running protocol-1 evidence. | The protocol requires the Handbook consumer ref to equal an immutable Git HEAD; uncommitted candidate pins cannot be certified. |
| Write passed evidence only after provider and host proofs succeed, and make public CLI paths incapable of substituting a test runner. | Unit tests can cover orchestration deterministically without letting mocked results become candidate evidence. |
| Treat `schema-pbta/tools/release-train-config.ts` as the master vocabulary and evidence schema for this train. | schema-pbta #41 owns orchestration; Handbook owns proof execution but may not publish local aliases or additional evidence fields that the master parser rejects. |
| Keep Obsidian identity, asset hashes, trust state, and exception details in the local host report, while public evidence stays within the closed protocol-1 shape. | #63 requires observable diagnostics and canonical checks, but the current master evidence schema permits only protocol, status, candidate, consumer, lock, and journey. |
| Require Lantern #47 before provider promotion and use Lantern #46 only for final convergence. | The updated issue segmentation separates provider-specific candidate proof from repository-wide release identity and canonical pin convergence. |
| Prove staged candidates, promote byte-identical archives, then replace both consumers' pins with canonical final URLs retaining exact SRI. | This preserves the cross-repository provider-first contract and separates byte proof from post-promotion convergence. |
| Separate patch preparation from public publication and record release evidence after BRAT validation. | The release tag can point at the already committed versioned source, while the later evidence commit records an outcome that cannot exist before publication. |
