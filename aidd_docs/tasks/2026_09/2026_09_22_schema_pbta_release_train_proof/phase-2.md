---
status: done
---

# Instruction: Publier le contrat d’invocation

## Architecture projection

```txt
package.json ✏️ expose la commande de preuve stable
README.md ✏️ documente entrées et sortie machine-readable pour l’orchestrateur
tools/assert-prove-schema-pbta-candidate.mjs ✏️ vérifie le contrat d’invocation
```

## User Journey

```mermaid
flowchart TD
  A[Orchestrateur checkout un ref Handbook] --> B[Invoke proof]
  B --> C{Candidate matches lockfile}
  C -->|yes| D[JSON success]
  C -->|no| E[Non-zero mismatch]
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    frozen Handbook checkout and candidate coordinates => command ready: 5: cli
  section Happy path
    invoke documented command => JSON names version archive SRI and ref: 5: cli
  section Edge case - mismatch
    coordinates disagree with lockfile => command exits non-zero: 5: cli
```

## Tasks to do

### `1)` Publish the consumer proof contract

> Make the proof callable by the central train without adding a train workflow here.

1. Add the package command and document inputs/output.
2. Make every disagreement fail non-zero with its field name.
3. Leave Handbook CI/release workflows unchanged.

### `2)` Verify the invocation boundary

> Prove stable success and deterministic rejection.

1. Assert JSON against the active frozen pin.
2. Assert archive, SRI and ref mismatch paths.
3. Run the proof and full Handbook checks.

## Test acceptance criteria

| Task | Acceptance criteria |
| --- | --- |
| 1 | The central orchestrator can invoke one documented Handbook command and receive candidate JSON. |
| 2 | A mismatch exits non-zero before promotion, without modifying Handbook workflows. |
