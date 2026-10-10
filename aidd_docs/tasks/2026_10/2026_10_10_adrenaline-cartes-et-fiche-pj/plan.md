---
objective: "Les cartes compactes PNJ et créature d'Adrenaline suivent la maquette, la fiche PJ suit la fiche papier à jour, et chaque écart est porté par le contrat publié avant d'être dessiné par Lantern et Handbook."
status: pending
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Adrenaline — cartes compactes et fiche PJ (#101 §2 et §3)

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Fermer les écarts de rendu des cartes PNJ/créature, puis refondre la fiche PJ, en trois départs de train : le train ouvert (contrat v<N>), les cartes (v<N+1>), la fiche PJ (v<N+2>). |
| **Source** | `RebelliousSmile/obsidian-handbook#101`, sections 2 et 3 (la section 1, superviseur, et la section 4, remise en ordre, sont hors de ce plan). |

Vocabulaire des versions : **v<N>** est la version de `schema-adrenaline` déjà publiée que le train `adrenaline-monstre-ecarts` porte ; **v<N+1>** et **v<N+2>** sont les deux suivantes. Aucun numéro n'est écrit dans ce plan : chaque outil lit la version dans le `package.json` qui la déclare.

Références de rendu (à ouvrir avant tout verdict) :

| Sujet | Référence | Ce qu'elle fixe |
| ----- | --------- | --------------- |
| Carte créature | `schema-adrenaline/aidd_docs/tasks/2026_10/2026_10_02_fiche-monstre-maquette/monstre.jpg` (original : coffre Zombiology, `_sources/Design/monstre.jpg`) | En-tête d'état (nom, pastille cyan devant le déclencheur ; case à cocher à droite sur la grande carte seulement, la petite n'en a pas) ; caractéristiques sur deux lignes (FOR CON DEX RAP, puis Zone de détection · PER · Dépl.) ; « SP … » et « État Insensible » sur une même ligne ; Malus en cercles puis « HS » ; « Agir (type d'infecté) » sur la grande carte seulement ; sur la petite carte, une section unique « Comportement et santé » puis « Équipement » ; dés sur fond jaune (choquante) ou rouge (blessante). |
| Carte PNJ | coffre Zombiology, `_sources/Design/pnj.jpg` | Même vocabulaire de carte, partie « meneur » escamotable en fin de bloc. |
| Fiche PJ | coffre Zombiology, `_sources/aides-de-jeu/Z1A01_Feuille de PJ pretires.pdf` : la page « Feuille de PJ — format one-shot, 1 page portrait » de chaque prétiré (confirmée par la capture #73 du 2026-10-10) et la page de portrait qui la précède ; `_sources/Design/pj.jpg` est périmée et ne fait pas foi | Cinq zones numérotées : paramètres de jeu et nom, compétences (trois formations), caractéristiques et dés de stress, équipement (armes physiques, armes mentales, possessions, protections avec localisations d10 et caractère, avantages et immunités), santé (seuils à quatre niveaux, états, blessures physiques et mentales par durée, choc, divers, total des malus). Aucun tableau d'identité sur la feuille : description physique et historique sont sur la page de portrait. |
| Armes sociales | Capture #74 du 2026-10-10 et tableau recopié dans #101 §3 | Trois colonnes « Armes sociales / Dégâts / Propriétés », sept lignes de Bluff à Séduction, note en tête ; tous les dés de la table (1d10, 2d10) sont sur fond jaune ; la légende jaune et rouge vient du texte de #101, la capture ne la montre pas. |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1   | Garde de couverture des formes et diagnostic « Agir » (Handbook, contrat v<N>) | [`phase-1.md`](./phase-1.md) |
| 2   | Reprise du train ouvert `adrenaline-monstre-ecarts` | [`phase-2.md`](./phase-2.md) |
| 3   | Contrat v<N+1> : écarts des cartes compactes | [`phase-3.md`](./phase-3.md) |
| 4   | Lantern et Handbook dessinent les cartes v<N+1>, puis le train part | [`phase-4.md`](./phase-4.md) |
| 5   | Contrat v<N+2> : fiche PJ | [`phase-5.md`](./phase-5.md) |
| 6   | Lantern et Handbook dessinent la fiche PJ v<N+2>, puis le train part | [`phase-6.md`](./phase-6.md) |

## Resources

| Source | Verified |
| ------ | -------- |
| https://github.com/RebelliousSmile/obsidian-handbook/issues/101 | La liste des écarts et des demandes, sections 2 et 3. |
| https://github.com/RebelliousSmile/obsidian-handbook/issues/99 | La coordination du train ouvert et ses trois items. |

## Decisions

| Decision | Why |
| -------- | --- |
| Le train ouvert repart avec le contrat v<N> et les seuls changements qui ne touchent pas le schéma ; les écarts qui demandent le schéma partent dans un second train (v<N+1>). | La finale v<N> du fournisseur est déjà publiée et Handbook l'épingle déjà ; `tools/supervisor/publish.mjs` refuse de republier une finale et demande alors une nouvelle version : porter v<N+1> dans ce train reviendrait à en ouvrir un autre. Le contrat se publie avant d'être adopté. |
| Cartes et fiche PJ ne partagent pas une version du contrat (v<N+1> puis v<N+2>). | La fiche PJ demande un relevé d'écarts et des arbitrages de l'utilisateur, et un verdict de rendu à part ; les cartes, plus petites, ne doivent pas les attendre. |
| Détection et déplacement rejoignent la ligne de PER par la présentation publiée, pas par une règle CSS locale : une propriété de bloc neuve, des rangées de pointeurs JSON. | La sémantique de présentation vit dans `schema-*`. `fieldRows` ne convient pas tel quel : `validate-presentation.ts` le réserve à la forme d'identité et à un seul chemin, alors que la rangée de PER croise trois chemins. |
| La section « Comportement et santé » de la petite carte se déclare par une propriété de section (jonction sur une carte), pas par une section dupliquée. | `validate-presentation.ts` impose des identifiants de bloc et des chemins uniques par fiche : une seconde section portant les mêmes blocs est refusée. |
| L'identité du PJ devient une section escamotable en fin de fiche, sur le modèle de « meneur » (`collapsible` existe déjà au niveau section) ; les champs d'identité actuels restent déclarés et y sont rangés. | Aucun champ n'est retiré sans chemin de lecture de l'ancienne forme ; un consommateur ne masque pas un champ encore déclaré. |
| Le tableau des armes sociales est une table de règles publiée par la présentation (lignes, dégâts, propriétés), pas des valeurs saisies ni une table codée dans un consommateur. | « Valeurs saisies, jamais de calcul » vaut pour la fiche du joueur ; une référence de règles est un contenu du contrat, identique partout. |
| La case à cocher de l'en-tête d'état n'est imprimée que sur la grande carte ; elle est cochée quand `etatActif` saisi désigne cet état. | C'est ce que montre `monstre.jpg` : la petite carte n'a pas de case. |
| Le témoin réel « Rôdeur accordé » vit dans `tools/fixtures/`, à côté de `adrenaline-visual.md`. | Handbook n'a pas de corpus Adrenaline local : `pnpm assert:corpus` refuse un fichier local qui reprend un format dont le corpus appartient à `schema-adrenaline`. |
| LOG, VOL et CHA sortent du contrat créature en v<N+1> : une créature porte les quatre physiques et PER (décidé le 2026-10-11). | `monstre.jpg` ne les montre pas. Aucun bloc créature du coffre Zombiology ni exemple publié ne les saisit (vérifié le 2026-10-11). C'est une rupture de contrat : un document qui les porte est refusé, et le `CHANGELOG` le dit. |
| La carte PNJ ne reçoit ni zone de détection ni déplacement (décidé le 2026-10-11). | La capture #75 de la carte PNJ montre huit caractéristiques sur deux lignes, sans ces deux champs. |
| Fiche PJ, décidé le 2026-10-11 : un champ texte facultatif `parametresDuJeu.scenario`, libellé « Scénario » ; l'identité est fermée par défaut ; possessions et armes physiques reçoivent le nombre de lignes qui aligne leurs blocs sur la table des armes sociales ; les blessures recopient la feuille à l'identique. | Réponses de l'utilisateur aux arbitrages. Le nom de la campagne se saisit dans « Scénario » si on le veut. |
| Fiche PJ : quand la feuille à jour et la présentation publiée divergent, la feuille fait foi (dés de stress près des caractéristiques, choc en cinq cercles « round », total de 1 à 9 puis « HS », divers en quatre cercles, « Avantages et immunités ») (décidé le 2026-10-11). | La présentation publiée suivait l'ancienne fiche. |
| Table des armes sociales : tous les dés, 1d10 comme 2d10, sont sur fond jaune (Choquante) ; le rouge (Blessante) ne figure que dans la légende en pied, à côté du jaune (capture #76 du 2026-10-11). | La capture montre la table entière avec sa légende ; aucune ligne ne porte de dé rouge. |
| La section Identité garde tous les champs de l'ancien tableau d'identité, et reçoit en plus contraintes, historique et personnalité (décidé le 2026-10-11). | Aucun champ du contrat n'est retiré ni masqué ; seul l'emplacement change. |
| `equipement.armesMentales` disparaît : une créature porte des `armesPsychologiques` (dégoût, sidération…), un PNJ et un PJ n'en portent pas ; le PJ a la table des armes sociales (décidé le 2026-10-11). Créature et PNJ changent en v<N+1>, le PJ en v<N+2>. | Vocabulaire de l'utilisateur : les armes psychologiques sont réservées aux monstres. Rupture de contrat écrite au `CHANGELOG`. Dans le coffre Zombiology (relevé du 2026-10-11) : quatre blocs créature à renommer, douze blocs PJ à corriger, aucun bloc PNJ. |
| Dans Handbook, une forme publiée sans rendu dédié devient un échec de `assert:adrenaline-theme`, lu dans la présentation installée. | Aujourd'hui l'écart n'est qu'un `log.warn` muet par défaut ; la garde affirme un rôle (toute forme publiée est dessinée), jamais une liste recopiée. |
