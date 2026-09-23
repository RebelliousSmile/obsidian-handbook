---
objective: "Handbook accepts protocol-1 manifests from schema-pbta commit dfbeaa3182baba698116115e0404e0ababebaac0 and emits complete, immutable candidate-adoption evidence."
status: in-progress
---

# Plan: Emit protocol-1 Handbook candidate evidence

## Overview

| Field | Value |
| --- | --- |
| **Goal** | Adapt Handbook’s PbtA adoption proof to the immutable orchestration protocol and evidence fixture while retaining its own lock, source-pack, install, and render journeys. |
| **Source** | GitHub issue [#56](https://github.com/RebelliousSmile/obsidian-handbook/issues/56) and schema-pbta commit [`dfbeaa3`](https://github.com/RebelliousSmile/schema-pbta/commit/dfbeaa3182baba698116115e0404e0ababebaac0) |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Parse protocol-1 manifests and select Handbook | [phase-1.md](./phase-1.md) |
| 2 | Emit and prove immutable consumer evidence | [phase-2.md](./phase-2.md) |

## Resources

| Source | Verified |
| --- | --- |
| [Handbook #56](https://github.com/RebelliousSmile/obsidian-handbook/issues/56) | Required command boundary, rejection matrix, evidence envelope, non-mutation, and PbtA/Mist regression coverage. |
| [schema-pbta protocol commit](https://github.com/RebelliousSmile/schema-pbta/commit/dfbeaa3182baba698116115e0404e0ababebaac0) | Immutable orchestration-contract source. |
| [Protocol-1 fixture](https://github.com/RebelliousSmile/schema-pbta/blob/dfbeaa3182baba698116115e0404e0ababebaac0/cross-tool.release-train.fixture.json) | Exact candidate fields and Lantern/Handbook consumer list. |
| [Protocol parser and evidence contract](https://github.com/RebelliousSmile/schema-pbta/blob/dfbeaa3182baba698116115e0404e0ababebaac0/tools/release-train-config.ts) | Exact validation and evidence structure the central runner will parse. |

## Decisions

| Decision | Why |
| --- | --- |
| Implement the adapter against the immutable protocol fixture and parser at `dfbeaa3`, not a package export. | Protocol 1 is an orchestration contract; the schema commit is the source of truth expressly supplied for consumer adapters. |
| Accept the runner-written manifest and evidence path inside its disposable detached checkout. | The central runner creates and discards that workspace; Handbook must not mutate its committed package, lock, source-pack, or tracked build inputs. |
| Dispatch from `candidate.provider`, never a release URL substring. | Provider identity is explicit protocol data; URL inspection is a consumer-local semantic fallback. |
