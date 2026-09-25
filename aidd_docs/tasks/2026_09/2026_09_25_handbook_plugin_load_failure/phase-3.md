---
status: done
---

# Instruction: Commit the corrected staged provider candidate

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
.
├── package.json ✏️ pins the exact corrected schema-pbta staged archive selected by the provider train
└── pnpm-lock.yaml ✏️ records that candidate URL and its published SHA-512 SRI for an immutable Handbook commit
```

## User Journey

```mermaid
flowchart TD
  A[schema-pbta 41 publishes a corrected staged archive] --> B[Verify its version, URL, SHA-256, SRI, and provider commit]
  B --> C[Pin it in Handbook package and lock]
  C --> D[Install frozen dependencies]
  D --> E[Run source-level Handbook assertions]
  E --> F[Commit one immutable candidate-adoption ref]
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    system: obtain the staged schema-pbta archive and protocol manifest from schema-pbta 41 after its packed CommonJS and Vite proofs pass => exact candidate coordinates and provider commit are available: 5: system
  section Happy path
    cli: update package and lock then perform a frozen install and core checks that do not require candidate evidence yet => the installed schema-pbta version, URL, and SRI match the staged archive: 5: cli
  section Edge case - invented or mutable coordinate
    cli: encounter an absent asset, redirect-style URL, digest mismatch, or unpublished version => stop without changing the committed dependency graph: 1: cli
  section Teardown
    system: inspect the phase commit => package, lock, installed version, and clean immutable Git ref describe one candidate adoption: 5: system
```

## Tasks to do

### `1)` Wait for authoritative candidate coordinates

> Never guess the release that resolves the incident.

1. Require schema-pbta #41 to publish a staged final-version archive after its root-import CommonJS and Lantern Vite fixtures pass.
2. Read the release-train manifest and verify canonical repository, staging/final tags, archive version, full provider commit, SHA-256, and SHA-512 SRI.
3. Stop without edits if those immutable inputs do not yet exist or disagree.

### `2)` Materialize the candidate in one Handbook commit

> Create the immutable consumer ref required by protocol 1 before asking the train to certify it.

1. Replace only the schema-pbta dependency with the exact staged URL and regenerate `pnpm-lock.yaml` without changing unrelated dependencies.
2. Run a frozen install and the provider, contract, projection, theme, installer, and core assertions that are valid before live candidate evidence.
3. Confirm package, lock, and installed package agree on URL, version, and SRI; commit them with this phase marked done.

## Test acceptance criteria

| Task | Acceptance criteria |
| --- | --- |
| 1 | Every adopted candidate coordinate comes from the published schema-pbta #41 manifest and asset; no predicted version, tag, digest, or commit is used. |
| 2 | The phase commit pins exactly one staged schema-pbta archive, reproduces with a frozen install, and exposes an immutable Handbook SHA suitable for the protocol manifest. |
| 2 | Source-level Handbook checks pass on the candidate graph without claiming that host evidence has already passed. |
