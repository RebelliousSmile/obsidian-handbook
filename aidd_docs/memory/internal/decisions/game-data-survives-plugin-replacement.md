# Conserver les données de jeu hors du plugin installé

- Date: 2026-09-15
- Status: Accepted

## Context

BRAT et les autres mécanismes de mise à jour peuvent remplacer entièrement le
répertoire installé d'Handbook avant que la nouvelle version ait l'occasion de
migrer les packs et overrides qui s'y trouvaient. Le nom du dossier de
configuration d'un coffre n'est par ailleurs pas toujours `.obsidian`.

## Decision

Les données installées ou écrites par l'utilisateur vivent sous
`<vault>/<configDir>/handbook/` : packs dans `packs/` et overrides dans
`overrides.json`. Une migration legacy publie une copie temporaire seulement
après réussite complète, ne remplace jamais une destination existante et traite
packs et overrides indépendamment. La documentation exige une copie manuelle
avant la première mise à jour concernée.

## Alternatives

Conserver les données sous le répertoire du plugin les expose au remplacement.
Compter uniquement sur une migration au démarrage ne peut pas récupérer une
source déjà supprimée. Écraser une destination existante rendrait une migration
non répétable et pourrait remplacer des données plus récentes.

## Consequences

Les mises à jour du plugin n'emportent plus les données utilisateur et les
coffres à `configDir` personnalisé restent supportés. Le code conserve un repli
legacy pendant la fenêtre de compatibilité, mais ne promet jamais de restaurer
une donnée dont aucune copie n'existe encore.
