# Prévol de l'issue #64 — 25 septembre 2026

## Établi

- Travail effectué sur `main`, conformément à `.codex/rules/00-architecture/0-main-only-execution.md`.
- [Issue Handbook #63](https://github.com/RebelliousSmile/obsidian-handbook/issues/63#issuecomment-5839538633) close : le plugin v2.29.2 a chargé dans Obsidian 1.13.7 isolé. Le détail des deux exécutions et des empreintes se trouve dans `aidd_docs/tasks/2026_09/2026_09_25_host_artifact_release_gate/release-evidence.md`.
- `pnpm build` de la construction courante v2.29.2 : réussi le 25 septembre 2026. L'exécution a nécessité l'autorisation du processus enfant `esbuild` dans cet environnement Windows.
- `schema-adrenaline/main` expose `./presentation` dans son `package.json`, mais le [tag v2.5.0](https://github.com/RebelliousSmile/schema-adrenaline/releases/tag/v2.5.0) n'expose pas ce sous-chemin. Le paquet installé dans Handbook n'expose pas non plus `./presentation`.
- Au 25 septembre 2026 à 21:25 UTC, l'API des releases GitHub liste pour v2.5.0 seulement `candidate.tgz` et `candidate.tgz.sha256`. Le nom final `schema-adrenaline-2.5.0.tgz` n'y est pas publié. [schema-adrenaline #36](https://github.com/RebelliousSmile/schema-adrenaline/issues/36) reste ouverte.
- `package.json` épingle encore `https://github.com/RebelliousSmile/schema-adrenaline/releases/download/v2.5.0/candidate.tgz`. Aucun lien local `pnpm` n'a été introduit.

## Porte restante

La phase 1 requiert une archive finale canonique qui contient `./presentation`, son SRI vérifié, puis une installation figée. Cette archive n'existe pas encore. Le contrat producteur doit être publié dans son dépôt avant toute adoption du rendu sur `main`, selon la règle `.codex/rules/00-architecture/0-cross-repo-contract-flow.md`. L'issue #64 exclut sa publication du périmètre Handbook.

À la reprise, relever l'URL et le SRI de la nouvelle archive, vérifier `package.json`, `handbook.json` et le manifeste du pack à l'intérieur de celle-ci, puis reprendre la phase 1. La construction Zombiology devra ensuite charger dans un coffre Obsidian isolé avant la revue des trois fiches. Aucune modification du coffre utilisateur n'a été faite.
