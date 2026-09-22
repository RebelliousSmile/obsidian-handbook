---
objective: "Every Handbook user can enable generic Roller tables, pack diagnostics fail visibly and independently, remote source assets are preflight-bounded, and Dice Roller has an end-to-end CI journey."
status: in-progress
---

# Plan: Audit remediation

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Resolve the actionable warnings and minor maintainability risks from the full audit. |
| **Source** | [`../2026_09_22_audit/report.md`](../2026_09_22_audit/report.md) |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Make generic settings and pack diagnostics resilient | [`phase-1.md`](./phase-1.md) |
| 2 | Bound remote source assets before buffering | [`phase-2.md`](./phase-2.md) |
| 3 | Prove Dice Roller in a real Obsidian journey | [`phase-3.md`](./phase-3.md) |
| 4 | Split Settings composition by domain | [`phase-4.md`](./phase-4.md) |

## Resources

| Source | Verified |
| --- | --- |
| https://github.com/obsidian-ttrpg-community/dice-roller | Dice Roller supports formula rolling and is the optional external runtime the generic Roller adapter delegates to. |

## Decisions

| Decision | Why |
| --- | --- |
| A failed pack resolution remains a row in the report rather than rejecting the whole modal. | One broken vault asset must not hide the state of unrelated installed packs. |
| Remote asset downloads issue a `HEAD` preflight and reject a declared `Content-Length` beyond the remaining source budget before issuing the binary `GET`. | A response returned by `requestUrl` may already be buffered; only a metadata-only request can avoid the subsequent body download. Headerless or unsupported `HEAD` endpoints retain the existing post-read cap. |
| The Dice Roller journey installs an immutable release fixture in an isolated temporary vault. | The fixture lock records the upstream release tag, archive URL, and SHA-256; CI verifies the hash before extraction, so it neither uses a developer’s installed plugins nor follows an unpinned latest release. |
