---
objective: "Handbook accepts and proves the immutable schema-adrenaline v2.5.0 candidate through the common protocol-1 release-train interface, without a consumer-local fallback."
status: implemented
---

# Plan: Accept schema-adrenaline protocol-1 candidates

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Generalize the strict protocol-1 path for schema-adrenaline, pin its published candidate, and emit complete consumer evidence. |
| **Source** | GitHub issue [#60](https://github.com/RebelliousSmile/obsidian-handbook/issues/60) |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Generalize the declared-provider protocol parser | [phase-1.md](./phase-1.md) |
| 2 | Pin and prove the Adrenaline candidate adoption | [phase-2.md](./phase-2.md) |
| 3 | Make the style-scope assertion ESM-safe | [phase-3.md](./phase-3.md) |

## Resources

| Source | Verified |
| --- | --- |
| [Handbook #60](https://github.com/RebelliousSmile/obsidian-handbook/issues/60) | Required candidate coordinates, strict validation, lock pin, capability-driven activation, and complete consumer evidence. |
| [schema-pbta #40](https://github.com/RebelliousSmile/schema-pbta/issues/40) | The same protocol-1 contract must let both consumers dispatch a declared Adrenaline provider without local fallbacks. |
| [schema-adrenaline v2.5.0-rc.2](https://github.com/RebelliousSmile/schema-adrenaline/releases/tag/v2.5.0-rc.2) | The named prerelease asset exists and publishes the requested SHA-256. |

## Decisions

| Decision | Why |
| --- | --- |
| Keep one canonical candidate envelope and model provider-specific repository/URL rules in an explicit allowlist. | It preserves one release-train input while rejecting unknown providers and prevents PbtA assumptions from becoming an Adrenaline fallback; the full provider commit remains explicit candidate provenance rather than a consumer-inferred tag lookup. |
| Derive the Adrenaline proof from the committed package and pnpm lock pin, then write the same manifest-adjacent evidence envelope. | The release train verifies an adoption already materialized in its detached Handbook checkout; it never mutates package, lockfile, or source-pack inputs. |
| Keep source-checkout visual diagnostics outside the release-train proof, but validate the catalog from a separately materialized source checkout at the candidate’s declared commit. | The archive proves dependency adoption; the versioned `handbook.json` and `pack.json` publish the `block:*` semantics and must be read from their immutable producer revision, not inferred from the consumer or assumed to be packaged in the archive. |
