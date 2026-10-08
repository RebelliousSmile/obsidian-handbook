# Harnais d'assertion : motif et pièges

> Extrait de `CLAUDE.md` le 2026-09-30, contenu inchangé.

Le dépôt n'a toujours ni vitest ni jest, et n'en prendra pas : la convention a été formalisée en outils plutôt que réinventée par bloc.

| Script | Ce qu'il affirme |
| --- | --- |
| `pnpm assert:corpus` | chaque bloc de `BRUMES_BLOCKS` lit un témoin entièrement, dégrade un refus sans exception ni bloc vide, et possède sa commande de copie |
| `pnpm assert:override` | `overrides.json` surcharge une zone, la retirer restaure le rendu au caractère près, une zone inconnue avertit une fois |
| `pnpm assert:pbta-pack-coverage` | chaque cible de codec PbtA est comptée (générique ou spécialisée), possède un témoin accepté dans le corpus publié, la liste des cibles que Handbook résout est **mesurée** contre le playbook portable, et les capacités et l'appartenance déclarées sont prouvées contre `cross-tool-provider.json` et les `pack-contract.json` du tarball épinglé |
| `pnpm assert:ci-install` | les workflows installent avec `pnpm install --frozen-lockfile`, `packageManager` est déclaré, et aucun outil de `tools/` ne lit un lockfile non suivi |
| `pnpm dump:dom` | rend le DOM des douze blocs — à comparer d'une phase à l'autre : une phase qui ne touche pas au balisage doit le laisser identique |

Le motif : un lanceur `tools/<nom>.mjs` bundle son harnais `tools/<nom>.harness.mts` par `esbuild.buildSync({platform:'node', format:'cjs', external:['obsidian','fs']})`, puis `node` l'exécute. **Aucune dépendance neuve** — `tsx` n'est pas installé et n'a pas à l'être.

Le corpus est partagé par les deux camps : `corpus/temoins/` (le schéma les accepte, le plugin les rend) et `corpus/refus/` (le schéma les rejette, le plugin les dégrade), un fichier par faute, nommé par la faute. **Les deux moitiés sont nécessaires** — sans le témoin, une série de refus ne prouve rien, un schéma qui rejette tout les passerait tous.

Pour le ponctuel, le harnais jetable reste : `src/__assert_*.ts` (classe `El` bouchon + faux `Document` avec `createElement`), même motif de bundling.

⚠ `pnpm build` lance `tsc -noEmit` sur **tout le dépôt**, pas sur `src/` : `tsconfig.json` porte `"include": ["**/*.ts"]`. C'est donc **l'extension d'un fichier qui le protège, pas son dossier** — un harnais en `.mts` échappe à `tsc`, un `.ts` posé n'importe où y passe. `rm -f src/__assert_*.ts __assert_*.cjs` **avant** de builder, sinon le build casse sur le harnais.

Deux pièges qui coûtent un aller-retour chacun (constatés le 2026-09-08) :

- **Le script de bundling du harnais doit vivre à la racine du dépôt**, pas dans un dossier temporaire : écrit ailleurs, `node` ne résout pas `esbuild` et sort `ERR_MODULE_NOT_FOUND: Cannot find package 'esbuild'`.
- **`log.warn` est muet par défaut.** `src/utils/logger.ts` démarre à `currentLogLevel = "error"` et `shouldLog` compare `LEVEL_ORDER[currentLogLevel] <= LEVEL_ORDER[level]` : un harnais qui affirme un avertissement doit appeler `log.setLevel("warn")` d'abord, sinon il mesure un silence et le prend pour un échec.

## Une garde s'écrit par rôle, jamais par littéral

Un train déplace des versions, des épingles et des tags : c'est son travail. Une garde qui compare l'un d'eux à un chiffre écrit dans sa source devient rouge parce que le train a fait ce qu'on lui demandait, et coûte un cycle.

- Une garde qui mesure une épingle, une version ou un train **lit la source qui déclare la valeur** (`package.json`, `pnpm-lock.yaml`, manifeste ou enregistrement du train). `finalPin` de `tools/guardsByRole.mjs` rend le rôle « release finale qu'un consommateur épingle » : URL, version, integrity.
- `pnpm assert:guards-by-role` refuse, dans les gardes de la table `GUARDS` du même module, un numéro de version à trois composantes, un tag de release et une URL d'archive de release écrits en chiffres. Une expression régulière sans chiffres figés n'est pas un littéral ; une ligne de commentaire seul n'est pas lue.
- Une **donnée de test fermée** (une release close exercée pour elle-même, un pack inventé) garde son littéral et le dit sur la ligne même : `// guard-fixture: <raison>`. Un marqueur sans raison n'admet rien.
- Une garde neuve de cette famille s'ajoute à `GUARDS`.
- Si l'attendu d'une garde dépend de l'étape du cycle, l'étape lui arrive par un argument de sa commande dans la topologie (comme `--final`), jamais par une variable d'environnement.
