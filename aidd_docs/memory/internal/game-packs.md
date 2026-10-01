# Packs de jeu : le plugin possède son rendu

> Extrait de `CLAUDE.md` le 2026-09-30, contenu inchangé.

**Style Settings et le thème Border ne sont plus des prérequis.** `themes/*.settings.json` a été supprimé, l'onglet de réglages n'offre plus de bouton de copie de preset. Le plugin écrit lui-même ses variables CSS dans **un unique élément `<style>` qu'il possède** (`src/features/modes/styleElement.ts`, `id: brumes-game-style`) : un seul point d'écriture, donc un seul point de nettoyage, et changer de jeu ne laisse aucun résidu de l'ancien.

## Un jeu est une donnée, son moteur reste dans Handbook

Un pack déclare une identité, des jetons de note et d'interface, en couches `base` / `light` / `dark`, ses assets, ses `polarities` et, s'il le veut, des `shapes`. Les jeux livrés avec Handbook vivent dans `src/games/<jeu>.ts`. Un jeu optionnel moderne est un **plugin de jeu Handbook** déclaratif dans `packs/<id>/pack.json`, accompagné au besoin de son répertoire `assets/`. Aucun JavaScript, TypeScript ou CSS externe n'est exécuté. Une enveloppe interne `GameRegistration` peut ajouter des variantes visuelles sans modifier le `GamePack` sérialisable. :Otherscape emploie ce mécanisme pour Metro, Cairo et Tokyo, avec la priorité `pack → variante → overrides utilisateur`.

**Un pack ou sa variante active déclare ses polarités, il n'en dérive aucune** (`GamePolarity`, `src/games/types.ts`). Une couche non déclarée n'est **pas écrite**, plutôt qu'écrite en copie de `base` — un pack dont le `base` est fortement clair casserait un coffre en thème sombre. Une polarité unique s'écrit sur le sélecteur de mode nu, après `base`, donc elle gagne à spécificité égale quel que soit le réglage du thème ; deux polarités s'écrivent en sélecteurs composés. City of Mist et chacune des variantes Metro/Cairo/Tokyo déclarent `["light", "dark"]`; Legend in the Mist déclare `["light"]` — le jeu n'imprime que du parchemin, et le schéma sombre qui existait avait été inventé.

Ajouter un jeu embarqué sans variante :

1. un fichier `src/games/<jeu>.ts` exportant un `GamePack` ;
	2. une registration dans `DECLARED_GAMES` de `src/games/registry.ts` ;
3. rien d'autre. La liste déroulante des réglages, la classe de body et le style suivent.

Ajouter un jeu optionnel ne modifie pas `DECLARED_GAMES` : son manifeste versionné annonce sa version, la version minimale de Handbook, ses capacités `block:*` / `style:*` et son `pack`. `loadCustomGamePacks` le découvre uniquement au démarrage, `initGameRegistry` l'enregistre, la sélection du mode l'active, et retirer son répertoire puis redémarrer le désinstalle. Un mode sauvegardé devenu absent retombe sur le jeu par défaut. Les anciens fichiers personnels `packs/*.json` restent lisibles, mais `packs/<id>/pack.json` est la convention distribuable.

`schema-adrenaline/handbook/adrenaline` est la source canonique du plugin de jeu Adrenaline pour Handbook ; le même dépôt sert aussi Lantern, sans second dépôt d'intégration. L'optionalité porte sur le mode, ses données et ses surfaces visibles, pas sur le binaire : les parseurs, renderers et styles structurels Adrenaline restent dormants dans le bundle Handbook. Les feature flags et scopes de callouts sûrs sont conservés pendant l'absence du répertoire afin qu'une réinstallation retrouve les préférences.

Trois règles qui mordent :

- **Les variantes s'écrivent en sélecteur composé** : `.brumes--<jeu>.theme-dark`, jamais `.theme-dark` seul. Les deux classes sont sur le même `body` — à spécificité égale seul l'ordre des feuilles trancherait, et rien ne garantit que la nôtre passe après celle du thème actif.
- **L'identifiant d'un pack est un suffixe de classe CSS et une clé du `data.json` de l'utilisateur** : minuscules, chiffres, traits d'union simples (`isValidGamePackId`). Un pack qui échoue au contrôle est écarté seul, les autres chargent.
- **Le registre accueille aussi des packs personnels et plugins de jeu, lus au démarrage.** Un fichier `packs/*.json` ou un manifeste `packs/<id>/pack.json` (`src/games/customPacks.ts`) rejoint `DECLARED_GAMES` avant le premier rendu : `BrumesPlugin.ts::onload()` appelle `loadCustomGamePacks` puis `initGameRegistry` avant `loadSettings()`. Le nom du répertoire moderne doit égaler l'id du pack ; sa racine d'assets reste relative à ce répertoire. Un id en collision avec un jeu déclaré perd, journalisé une fois ; deux candidats partageant un id, le chemin qui trie premier gagne. `domModeClass.ts` ne fige plus `gamePackClasses()`/`gameVariantClasses()` à l'import — les deux se relisent à chaque appel, comme l'onglet de réglages et `settings/types.ts` le faisaient déjà chacun de leur côté.

## Le réglage fin passe par un fichier, pas par des curseurs

`<dossier du plugin>/overrides.json` : un pack amputé de tout sauf des valeurs à changer, qui prend le dessus sur le pack du jeu pour celles-là seulement. Retirer le fichier redonne exactement le rendu du jeu. Une valeur fautive se perd elle-même, journalisée une fois, le reste s'applique.

Il ne porte pas que des valeurs : la clé `shapes` surcharge **la forme d'un bloc, zone par zone** — renommer le libellé imprimé d'une zone (`heading`), en cacher une (`hidden`). Une zone qu'aucune forme ne connaît est signalée une fois par session et le reste charge ; un fichier ne nommant qu'un bloc laisse les cinq autres où ils étaient.

```json
{
	"shapes": {
		"litm-challenge": {
			"threats": { "heading": "Menaces et conséquences" },
			"secrets": { "hidden": true }
		}
	}
}
```

L'aller-retour est **mesuré**, pas constaté à l'œil : `pnpm assert:override` rend un témoin sans fichier, avec, puis sans, et compare caractère par caractère. Un œil ne distingue pas « identique » de « presque identique ». La commande « Reload illustrations and personal overrides » relit le fichier sans recharger le greffon.

## Les illustrations vivent dans le coffre

Le pack les nomme **par rôle**, jamais par image : `assets.images["iceberg-group"] = "iceberg-group.svg"`, et le SCSS lit `var(--brumes-image-iceberg-group)`. Résolution dans `<dossier du plugin>/assets/<id du pack>/` sauf si le pack déclare un `root`. Un rôle absent **dégrade** — le gabarit se rend à plat, il ne réserve pas une boîte pour une image qui ne vient pas (`missingAssetClass`, `_fallbacks.scss`). L'onglet de réglages liste les fichiers manquants du jeu actif.

Les **polices restent embarquées** (libres, redistribuables) ; seules les illustrations sortent. `dist/styles.css` est passé de 6,21 Mo à **3,64 Mo**, dont l'essentiel est désormais les fontes.

> ⚠ **Périmé** (constaté le 2026-10-01) : les polices sont depuis sorties elles aussi. Elles sont publiées par les packs `schema-in-the-mist/handbook/<id>` (WOFF2 + `styles/fonts.css`), et `pnpm assert:mist-font-packs` exige un `dist/styles.css` sous 150 000 octets sans `@font-face` (141 Ko mesurés).

## Le format d’apparence est local, mais rien ne le télécharge

Les six schémas de contenu :Otherscape vivent dans le dépôt frère `schema-in-the-mist`. Le contrat d’apparence `GamePack`, lui, appartient à Handbook dans `schemas/appearance/game-pack.schema.json` et les manifests de packs installés sont validés localement avant d’entrer dans le registre.

**Aucune dépendance à l'exécution** : ni fetch, ni import du dépôt distant. Le contrat est honoré par la forme de la donnée. Un pack charge réseau coupé.

Le format est **gelé** : un champ ne se renomme et ne se supprime jamais sans un chemin de lecture de l'ancienne forme. Un champ inconnu laisse un avertissement **une fois par session**, pas un par rendu.

**Le nom d'un jeton est validé à la lecture, pas seulement sa valeur** (constaté le 2026-09-09, refactor du contrat `GamePack`). `readPackTokens` (`fromSchema.ts`) n'exigeait que le préfixe `--` sur un nom, sans restreindre les autres caractères, alors que `renderTokens` (`styleElement.ts`) n'assainit que la *valeur* avant d'écrire dans l'élément `<style>` que le plugin possède — un nom contenant `{`, `}` ou `;` pouvait donc fermer sa propre déclaration CSS et injecter des règles dans la feuille de style de confiance. `readPackTokens` exige désormais `/^--[a-zA-Z0-9-]+$/` ; un nom refusé se journalise comme tout champ inconnu, une fois par session. Sans effet observable tant que seul du code ou l'`overrides.json` de l'utilisateur fournissent des noms, mais c'est la frontière exacte qu'un dépôt de schéma tiers traverserait un jour (voir `aidd_docs/tasks/2026_09/2026_09_09_game-schema-repos/discovery-brief.md`).

