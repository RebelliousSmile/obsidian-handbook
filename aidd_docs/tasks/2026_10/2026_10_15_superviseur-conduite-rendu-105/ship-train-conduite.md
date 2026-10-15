# Ajouts proposés au skill `ship-train` (conduite d'une phase de rendu)

Le skill vit hors du dépôt (`C:\Users\fxgui\.claude\skills\ship-train\`) : ce texte est proposé, rien n'y est écrit. À appliquer sur accord de l'utilisateur.

Le superviseur ne juge aucun rendu et ne demande aucun accord : ces règles se tiennent dans la conversation, et `supervise present` ne refuse que ce que le dossier de train déclare lui-même ouvert (`conduct`).

## Dans `board` (avant d'ouvrir une phase de rendu)

- Nommer la **cible de rendu** : la référence (feuille imprimée, page du livre), les tailles, les tableaux, les encarts. Elle est validée par l'utilisateur **avant** qu'un élément de rendu passe `done`.
- Lister les **décisions de contrat** que le rendu appelle (libellé, champ, colonne, présence d'un champ). Chacune se consigne dans `conduct.openDecisions` du dossier de train avec `touchesRender: true` si elle change ce qui s'imprime. On les tranche **avant** le rendu.
- Fixer d'avance **trois points de contrôle** du rendu (par exemple : structure, valeurs et libellés, finitions).

## Dans `implement` (boucle exécutant → contrôleur)

- Un élément de rendu ne fait pas plus de cycles exécutant → contrôleur que n'en fixe `conduct.maxControllerCycles` de la topologie (le nombre se lit là, jamais ici).
- Au-delà, on s'arrête : on consigne dans `conduct.cycles` (`item`, `cycle`, `at`) la raison de continuer dans `decision`, après accord de l'utilisateur donné dans la conversation. Sans cette décision, `present` refuse.
- Les contrôles lourds (`pnpm check`, harnais de longue durée) ne se jouent qu'**après** un rendu validé, pas à chaque cycle.

## Dans `preview`

- Le verdict de rendu se demande dans la conversation, une fois, sur la cible validée. Aucun accord n'entre dans `ship`.
- Une décision de contrat encore ouverte avec `touchesRender: true` se règle ici : on écrit `decision` et `decidedAt` dans `conduct.openDecisions`, puis on relance `present`.
