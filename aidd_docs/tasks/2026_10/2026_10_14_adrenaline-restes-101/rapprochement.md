# Rapprochement de #101 avec le code (2026-10-14)

Corps proposé pour l'issue. Chaque case des sections 2, 3 et 3 bis est confrontée au code de Handbook et au contrat publié installé. Légende : **fait** (code ou contrat publié, vérifié) · **ouvert** (reste à faire) · **décision** (à trancher par l'utilisateur) · **autre dépôt** (hors de Handbook). Pour mettre l'issue à jour : `! gh issue edit 101 --body-file aidd_docs/tasks/2026_10/2026_10_14_adrenaline-restes-101/rapprochement.md`.

## Restes traités par ce plan

| Reste | Résultat |
| --- | --- |
| `assert:block-templates` et `assert:adrenaline-pj` hors des `validations` de Lantern | **fait** : les deux gardes figurent dans `validations` de `lantern` (`supervisor/topology.json`), à la place que leur donne `check:project` ; jouées seules, vertes ; `assert:guards-by-role` vert. À commiter. |
| Libellés recopiés (« Zone de détection », « Dépl. ») | **fait** : retirés de `FIELD_LABELS`, lus dans `pointerRows` ; `dump:dom` avant/après identique. `malusAvantHs` reste : publié comme chemin sans libellé. |
| Preuves manquantes (`columnSpan`, contrôles d'un état, astérisque du ND) | **fait** : trois témoins ajoutés à `assert:adrenaline-theme` ; chacun a rougi sous mutation (`columnSpan` et l'astérisque du ND étaient d'abord verts : aucune fixture ne les portait). |
| Seuils PNJ/créature « en triplets vides » | **fait (2026-10-15)** : un seuil à zéro est refusé à la lecture (contrat 6.0.0, adopté par Handbook 2.46.0) ; le bloc ne s'affiche pas et l'alerte de lecture le signale. Voir D6. |
| Plafond CSS de `dist/styles.css` | **fait (2026-10-15)** : plafond relevé par l'utilisateur dans 2.45.0 (`assert:mist-font-packs`) ; la marge n'est plus un enjeu. Voir D7. |

## Section 2 : cartes compactes PNJ et créature

| Case | État |
| --- | --- |
| En-tête d'état : pastille cyan et case à cocher | **fait** (forme `state-header` dessinée ; case de l'état actuel). Le placement « devant le nom » reste à juger au rendu. |
| « Insensible » | **fait** côté contrat (publié par le schéma créature) ; **rendu confirmé le 2026-10-15** par l'utilisateur sur `infecte-zy-2` et `infecte-rodeur` (coffre Zombiology). |
| Détection et déplacement sur la ligne des caractéristiques | **fait** (`pointerRows` publiés ; libellés lus dans la présentation). |
| LOG, VOL et CHA hors du contrat créature | **fait** : le contrat publié ne porte que `for`, `con`, `dex`, `rap`, `per`. |
| Petite carte de l'état secondaire : une section « Comportement et santé » | **fait** côté contrat ; **rendu confirmé le 2026-10-15** par l'utilisateur sur le coffre Zombiology (`infecte-zy-2`, `infecte-rodeur`, `predateur-pensant`). |
| Garde « toute forme publiée est dessinée » | **fait** : `assert:adrenaline-theme` (garde de couverture et preuve négative sous forme inconnue). |
| Liste d'états fermée : un seul état en plus de la base | **fait** : `maxItems` = 1 dans le contrat publié. |
| Créature à carte unique : équipement sur la carte unique | **fait** côté contrat ; **rendu confirmé le 2026-10-15** par l'utilisateur sur le témoin `predateur-pensant` du coffre Zombiology. |
| Lignes libellées sous Comportement | **tranché le 2026-10-15 : on garde `comportement`** (liste de traits en texte libre, déjà imprimée sous « Comportement et santé ») ; une ligne libellée s'écrit « Idée fixe : … » dans le trait. Aucun champ dédié, aucun changement de contrat. |

## Section 3 : fiche PJ

Livrée par le train `adrenaline-fiche-pj` (contrat, Lantern, Handbook). Confrontée au schéma `pj` publié :

| Case | État |
| --- | --- |
| Relever les écarts fiche à jour / contrat `pj` | **fait** par le train. |
| Identité en partie repliable en fin de bloc | **fait** : section `identite` avec `collapsible: true`. |
| Localisations et caractère | **fait** côté contrat. |
| Blessures par durée, choc, divers, total, seuils | **fait** côté contrat (premiereColonne/secondeColonne, `shock-circles` « ROUND »). |
| En-tête : champ « Scénario » facultatif | **fait** (`scenario`, texte libre ; `typeDeScenario` reste le format). |
| Armes sociales : tableau compact trois colonnes | **fait** côté contrat (`armesSociales`, `armesSocialesBarrees`). |
| Lignes d'armes physiques et de possessions alignées | **fait** côté contrat (`minimumRows`). |

Les cases « fait côté contrat » se confirment une dernière fois au rendu sur un bloc PJ réel : le verdict appartient à l'utilisateur.

## Section 3 bis : coffre Zombiology

- [ ] Passage sur les blocs créature et PNJ et sur les modèles de bloc : **ouvert** (geste au cas par cas, hors dépôt).
- [x] Relevé des valeurs `armesMentales` des prétirés (2026-10-15, lecture seule du coffre) : **aucune valeur à relever**. Les 91 blocs `adrenaline-pj` / `adrenaline-pnj` / `adrenaline-monstre` du coffre (20 PJ : 6 prétirés de `07-pretires-2.md`, leurs 6 copies de `PAJ1.md`, 5 de `Scénario I3P.md`, 3 Naïma Berthier) ne portent aucun champ `armesMentales` ; tous les blocs PJ passent `parsePjToml` du contrat 6.0.0. La seule mention est un intertitre de prose « Armes physiques et mentales » dans `Scénario I3P.md` (Vincent : une arme sociale « Interrogatoire », profil déduit 1d10 choquante), qui n'est pas un champ et ne bloque rien. Deux blocs créature « Rôdeur accordé », dans les preuves historiques `aidd_docs/` du coffre (pas des notes vivantes), sont refusés pour une autre raison : `etats` porte plus d'un élément (maximum 1).
- [ ] Passage sur les blocs PJ : **ouvert** (geste au cas par cas, hors dépôt) ; plus rien n'est à relever avant le retrait du champ.

## Décisions à trancher

- **D1** — **tranché (2026-10-15) : « ROUND »**, le libellé publié, comme la feuille. Vérifié : un seul groupe de cinq cercles, libellé « ROUND » lu de la présentation ; aucun écart côté Handbook.
- **D2** — **tranché : pas d'étiquettes de colonne**. La feuille n'en imprime pas ; `premiereColonne` et `secondeColonne` restent des clés de document. Vérifié : `renderWoundCircles` n'écrit que les durées (HEURE, JOUR, SEMAINE, MOIS, en petites capitales) ; aucun écart côté Handbook.
- **D3** — **tranché : le mot de la feuille**. « malus » s'imprime tel que la feuille le dit (« 1 malus » sur les seuils, « Total des malus ») ; le nombre vient de la présentation. Aucun écart côté Handbook.
- **D4** — **tranché : « armes mentales », non**. Le champ est sorti du contrat ; un ancien `.toml` qui le porte est refusé net, avec le chemin du champ (témoins : PJ, PNJ, créature, delta d'état ; corpus `refus/`). `upgradeLegacyPj` ne le retire pas et aucune relecture tolérante n'est ajoutée. Les valeurs des prétirés du coffre Zombiology sont à relever à la main avant retrait (section 3 bis).
- **D5** — Garde de version du contrat : « majeur installé ≥ majeur déclaré dans `package.json` » (livrée) contre le littéral d'origine. Le littéral ne pouvait pas laisser passer un train de rang majeur ; le comparateur est néanmoins changé.
- **D6** — Seuils : que zéro veuille dire « non saisi » (et ne s'imprime pas) est une décision de contrat, donc de `schema-adrenaline`. Aujourd'hui `SP 0 / 0 / 0 / 0` s'imprime tel que saisi.
  - **Décidé le 2026-10-15** : un seuil à zéro n'est pas une valeur, c'est un champ non rempli. Le contrat le refuse à la lecture (PNJ et créature ; `base` et `couvert` au moins 1, le triplet garde `minimum` à 0) : le bloc ne s'affiche pas et l'alerte de lecture le signale. Rupture, donc contrat 6.0.0 ; le PJ ne change pas. Côté Handbook : inverser le témoin `a zero threshold is printed as entered` de `assertAdrenalineTheme.harness.mts` une fois le contrat adopté, sans repli local.
- **D7** — **tranché (2026-10-15) : plafond relevé** plutôt que des règles supprimées sans preuve de non-usage. Le relèvement est livré (2.45.0) ; aucune règle visible n'a été retirée.

## Principe du nettoyage (2026-10-15)

La feuille imprimée est la référence ; ce qui ne lui est pas conforme se nettoie. Écart écarté (décision de l'utilisateur, 2026-10-15) : le libellé « Équipement favori » (`FIELD_LABELS` de `renderer.ts`) n'existe pas sur la feuille, mais on ne demande rien à `schema-adrenaline` et Handbook continue de l'imprimer tant que le contrat porte le champ. Ne plus le relever comme reste.

## Restes d'autres dépôts

- **autre dépôt (schema-adrenaline)** : exclusion `etatAlternatif` / `etats` à publier dans le JSON Schema (aujourd'hui refusée par le seul codec, mais le constat côté Handbook est aujourd'hui couvert : `publishedContract.ts` refuse le mélange) ; captures de `docs/images/` ; CI de `main` rouge (étape « Install Handbook dependencies », `ERESOLVE`).
- **autre dépôt (Lantern)** : mineurs m1, m3 et m4 ; panneau Santé et action dépliée qui défilent encore.
- **hors dépôt** : dossier parasite `…print-capture` à la racine de `obsidian-handbook` (à supprimer par l'utilisateur).
