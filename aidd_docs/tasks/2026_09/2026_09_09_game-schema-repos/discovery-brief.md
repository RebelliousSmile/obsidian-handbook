# Jeux Handbook en dépôts de schémas déclarables

L'idée : découpler le rendu d'un jeu du greffon Handbook lui-même, sur le modèle de BRAT — des dépôts « de schéma » se déclarent, Handbook liste les jeux disponibles à partir d'eux, et l'utilisateur les ajoute ou non sans attendre une nouvelle release de Handbook. Le déclencheur est double : l'utilisateur compte ajouter des jeux auxquels il joue et le système pourrait plaire à d'autres (y compris 4rtamis, à qui l'idée a été reprise) ; même en usage strictement personnel, séparer « le jeu » du « gestionnaire de handouts » paraît déjà plus sain.

## What Is Clear

- Mécanisme : dépôts de schéma déclarables, listés puis ajoutés à la carte, comme BRAT le fait pour des plugins entiers.
- Confiance : ouverture assumée à des auteurs tiers inconnus, pas seulement à l'auteur de Handbook.
- Frontière technique ferme : **aucun JS exécuté** venant d'un dépôt tiers — uniquement de la donnée déclarative et du CSS.
- Frontière visuelle ferme : les gabarits structurels (carte Iceberg, carte Montagne, cadres de theme-card) restent **génériques et possédés par Handbook** ; un jeu tiers peut seulement les habiller par CSS/jetons (couleurs, police parmi celles embarquées, callouts…), jamais changer la disposition ou le comportement.
- Un précédent existe déjà dans le dépôt : les six schémas de contenu :Otherscape vivent dans le dépôt frère `schema-in-the-mist`, consommés sans dépendance réseau à l'exécution — le motif « un dépôt externe déclare, le plugin consomme » fonctionne déjà, juste pas encore pour la couche d'apparence (`GamePack`), que `CLAUDE.md` marque explicitement comme encore interne.
- **Corrigé le 2026-09-09** (exploration du plan `2026_09_09_game-schema-repos`) : contrairement à ce que cette puce affirmait, un contrat `GamePack` documentaire existe déjà et est publié — `schemas/appearance/game-pack.schema.json` + `src/zod/appearance/game-pack.ts` dans `schema-in-the-mist`, avec trois exemples validés, livré en phase 5 de `2026_09_08_game-packs-owned-rendering`. Ce qui manquait réellement n'était pas le contrat mais son branchement : `readGamePack` (`src/games/fromSchema.ts`) le lit déjà, sans jamais être appelé à l'exécution. Restent vrais : deux angles morts récents sur des couches transverses non couvertes par le contrat lui-même (`_callouts.scss` manquant sur deux jeux jusqu'à la phase 4 de `generic-callouts`, `--code-normal`/`--code-background` absent de tous les jeux jusqu'à la session du 2026-09-09).
- Ces deux besoins convergent : écrire noir sur blanc le contrat qu'un jeu doit remplir (donnée + CSS autorisé) répond à la fois à la checklist manquante et à la spécification du format qu'un dépôt tiers devrait respecter.
- Un mécanisme de lecture tolérante du format existe déjà côté code (`src/games/fromSchema.ts` : `readGamePack`/`toGamePackDocument`), et un point d'écriture unique et déjà partiellement assaini existe côté rendu (`src/features/modes/styleElement.ts`). Ce n'est pas branché sur un chargement distant, mais la forme du contrat est déjà largement posée.

## Still Open

- Comment un dépôt se déclare et se découvre dans l'UI (liste d'URLs dans les réglages, à la BRAT, ou autre chose).
- Si un pack installé se met à jour comme BRAT suit les releases, ou reste un instantané figé au moment de l'ajout.
- Si un dépôt déclare exactement un jeu, ou peut en bundler plusieurs (comme `schema-in-the-mist` bundle six formats :Otherscape dans un seul dépôt).
- L'ampleur du refactor que ça impose : `CLAUDE.md` note déjà que rendre le registre dynamique (`MODE_CLASSES`, réglages) « est un refactor, pas un ajout » — sa forme reste à définir.
- Si le CSS/les jetons d'un pack tiers ont besoin d'une revue/assainissement avant injection dans l'élément `<style>` que le plugin possède, étant donné l'ouverture à des auteurs inconnus. **Corrigé le 2026-09-09** (refactor du contrat `GamePack`, mené indépendamment de ce brief mais fermant exactement ce point) : `readPackTokens` (`src/games/fromSchema.ts`) n'assainissait que la *valeur* d'un jeton, jamais son *nom*, avant que `styleElement.ts` ne l'écrive tel quel dans la feuille de style — un nom pouvait fermer sa propre déclaration CSS. `readPackTokens` exige désormais `/^--[a-zA-Z0-9-]+$/` sur le nom, journalisé une fois par session s'il échoue. Reste ouvert : cette validation porte sur les jetons de style ; un futur dépôt tiers apporterait aussi des `shapes` et des assets, dont l'assainissement n'a pas été revu dans cette passe.

## Next Move

Écrire noir sur blanc le contrat qu'un jeu doit remplir — la forme exacte de la donnée et du CSS autorisés, en s'appuyant sur ce qui existe déjà dans le code — avant de s'attaquer au mécanisme de déclaration des dépôts eux-mêmes.
