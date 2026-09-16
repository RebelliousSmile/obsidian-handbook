---
objective: "Handbook imports Lantern TOML through versioned schema-owned canonical codecs, applies its own lossless concise-syntax adapter, and preserves raw TOML whenever conversion is unsafe."
status: implemented
---

# Plan: Schema-owned Lantern import codecs

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Shorten the Lantern-to-Handbook editing loop while the schema repository owns canonical interchange codecs and Handbook owns its concise-syntax adapter. |
| **Source** | User conversation, 2026-09-16. |

## Phases

| # | Phase | File |
| --- | --- | --- |
| 1 | Release canonical schema API | [`phase-1.md`](./phase-1.md) |
| 2 | Consume codecs and adapt concise syntax | [`phase-2.md`](./phase-2.md) |
| 3 | Prove cross-repository contract | [`phase-3.md`](./phase-3.md) |

## Decisions

| Decision | Why |
| --- | --- |
| `schema-in-the-mist` owns parse, validation, normalisation and canonical TOML serialization. | These are interchange operations already consumed by Lantern and Handbook. |
| Handbook owns the concise-syntax adapter. | The terse fenced grammar is a Handbook editor concern until another consumer explicitly adopts and publishes it. |
| Handbook owns only Obsidian interaction and fenced-section replacement. | Clipboard permissions, context menus and vault writes are host behavior, not content-schema behavior. |
| A Handbook adapter may decline concise syntax and return raw TOML unchanged. | Unknown fields, metadata and comments must not be silently discarded. |
| Handbook phase 2 depends on an immutable `schema-in-the-mist` release and lockfile integrity. | The API is never inferred from an unpinned checkout or fetched at runtime. |
| Schema delivery is tracked by [`schema-in-the-mist#12`](https://github.com/RebelliousSmile/schema-in-the-mist/issues/12). | It is the explicit cross-repository dependency for phase 1. |
