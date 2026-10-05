---
objective: "Une fois le changement validé, une seule commande du superviseur le commite, le publie, release les consommateurs et clôt le train, sans `approve` ni aucun autre arrêt humain."
status: implemented
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: le superviseur sans `approve`, d'une validation à la clôture

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Supprimer `approve` et tout arrêt intermédiaire : la validation du changement déclenche le cycle complet, jusqu'à la clôture du train. |
| **Source** | Texte de l'utilisateur, 2026-10-04 : « approve disparait entièrement » ; « le cycle ne doit pas être arrêté par les commit ou release, à partir du moment où la modification est validée, ça doit déclencher le cycle de publication jusqu'à la fin » ; « zero arret » (sur l'*Environment* `release`). ADR `aidd_docs/memory/internal/decisions/supervisor-orchestrates-github-builds.md` ; audit `aidd_docs/tasks/2026_10/2026_10_04_audit/architecture.md`. |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1   | Le lien passe de l'accord à la présentation | [`phase-1.md`](./phase-1.md) |
| 2   | Le suivi d'un run est borné | [`phase-2.md`](./phase-2.md) |
| 3   | Le superviseur publie les releases des consommateurs | [`phase-3.md`](./phase-3.md) |
| 4   | Une commande, de la validation à la clôture | [`phase-4.md`](./phase-4.md) |
| 5   | Documentation, ADR et en-têtes alignés | [`phase-5.md`](./phase-5.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| La validation est l'invocation de `supervise ship` ; aucun autre geste n'est demandé ensuite. | Demande explicite : ni commit ni release ne doit arrêter le cycle. Le contrôle visuel (`preview`) se fait avant. |
| Zéro arrêt humain après la validation, environnement `release` de `schema-adrenaline` compris : ses relecteurs sont retirés par l'utilisateur (réglage GitHub). | Tranché par l'utilisateur le 2026-10-04 (« zero arret »). Remplace la phrase de l'ADR « une seule porte humaine sur une publication finale ». Le réglage des dépôts reste hors de portée de la session. |
| Un run trouvé en attente d'un relecteur est une anomalie de configuration : arrêt nommé, code de sortie non nul. | Avec zéro arrêt, il n'y a plus de porte à attendre ; le superviseur dit que les relecteurs sont encore là, il ne patiente pas. |
| Le lien (SHA par dépôt, `trainFiles`, publications, empreinte) se lit dans `train.presentation` ; `train.approval` n'est plus écrit ni lu. | `approve` portait un geste humain et un contrôle de cohérence. Seul le geste disparaît ; sans le contrôle, `publish` ne sait plus quel commit publier et un changement non validé peut partir dans la finale. |
| Une présentation non présentable, éditée à la main ou dépassée par un commit hors `trainFiles` arrête le cycle. | C'est un refus technique, pas une demande d'avis : validations rouges et incohérences restent des échecs durs. |
| Un consommateur est releasé par le train s'il a été modifié (commits depuis sa dernière release, adoption d'archive comprise) ; un consommateur non modifié n'est ni releasé ni bloquant. Sa version et son CHANGELOG font partie du changement préparé ; le superviseur tague et déclenche, il ne rédige rien. | Tranché par l'utilisateur le 2026-10-04 : « le train doit release lantern ou handbook s'il y a eu des modifications ». Remplace l'hypothèse « tout consommateur est releasé ». Un consommateur modifié dont la version a déjà une release reste un refus à `present`. |
| `approval` reste déclaré dans `train.schema.json`, facultatif et marqué obsolète. | Le train clos `zombiology-pj-design` le porte ; format gelé. |
| Le code du superviseur n'est jamais commité par `ship` ; sa relecture, son commit et son push restent humains. | Règle posée par l'utilisateur : aucune modification du superviseur sans son accord. |
| `ship --run` est lancé par l'utilisateur (`! pnpm supervise ship …`) tant qu'il n'a pas ouvert cette permission à la session. | La session s'est vu refuser `pnpm supervise publish` ; elle ne contourne pas ce refus et ne modifie pas ses propres permissions. |
| Les fichiers `approval.mjs` et `approvalCommands.mjs` sont remplacés ; leur suppression (`git rm`) est faite par l'utilisateur. | Toute suppression reste humaine. |
