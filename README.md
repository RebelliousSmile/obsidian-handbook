# Handbook

**Français** · [English](#english)

Handbook est un plugin [Obsidian](https://obsidian.md/) pour les jeux de rôle sur table. Il installe des packs déclaratifs depuis des dépôts de schémas publics et applique leurs styles, callouts et blocs Markdown dans les notes. Le premier démarrage propose City of Mist, Legend in the Mist et :Otherscape ; d'autres sources peuvent être ajoutées dans les réglages.

Issu de [Brumes](https://github.com/4rtamis/obsidian-brumes), Handbook conserve les noms des réglages pour faciliter la reprise d'un coffre existant.

## Démarrage rapide

1. Activez les plugins communautaires d'Obsidian et installez [BRAT](https://github.com/TfTHacker/obsidian42-brat).
2. Dans BRAT, ajoutez `RebelliousSmile/obsidian-handbook`, puis activez **Handbook**.
3. Choisissez un jeu au premier démarrage. Pour en ajouter un, ouvrez **Réglages → Handbook → Schema sources → Add source**.

Le [guide d'installation](https://github.com/RebelliousSmile/obsidian-handbook/wiki/Getting-Started-FR) détaille les sources, les réglages, les illustrations et les personnalisations locales.

## Documentation

| Sujet | Français | English |
| --- | --- | --- |
| Installation et réglages | [Démarrer](https://github.com/RebelliousSmile/obsidian-handbook/wiki/Getting-Started-FR) | [Getting started](https://github.com/RebelliousSmile/obsidian-handbook/wiki/Getting-Started-EN) |
| Tags, callouts, régions et fiches | [Écrire des notes](https://github.com/RebelliousSmile/obsidian-handbook/wiki/Writing-Notes-FR) | [Writing notes](https://github.com/RebelliousSmile/obsidian-handbook/wiki/Writing-Notes-EN) |
| Exemples de fiches Mist | [Fiches Mist](https://github.com/RebelliousSmile/obsidian-handbook/wiki/Mist-Blocks-FR) | [Mist sheets](https://github.com/RebelliousSmile/obsidian-handbook/wiki/Mist-Blocks-EN) |
| Exemples de fiches Adrenaline | [Fiches Adrenaline](https://github.com/RebelliousSmile/obsidian-handbook/wiki/Adrenaline-Sheets-FR) | [Adrenaline sheets](https://github.com/RebelliousSmile/obsidian-handbook/wiki/Adrenaline-Sheets-EN) |
| Packs et contrats | [Packs et architecture](https://github.com/RebelliousSmile/obsidian-handbook/wiki/Packs-and-Architecture-FR) | [Packs and architecture](https://github.com/RebelliousSmile/obsidian-handbook/wiki/Packs-and-Architecture-EN) |
| Adoption des schémas PbtA, Adrenaline et Mist | [Train de release](https://github.com/RebelliousSmile/obsidian-handbook/wiki/Release-Train-FR) | [Release train](https://github.com/RebelliousSmile/obsidian-handbook/wiki/Release-Train-EN) |

Le [wiki complet](https://github.com/RebelliousSmile/obsidian-handbook/wiki) contient les tutoriels dans les deux langues. Les contrats de jeu et leur présentation appartiennent aux dépôts de schémas ; Handbook gère l'installation, les réglages et le rendu Obsidian.

## English

Handbook is an [Obsidian](https://obsidian.md/) plugin for tabletop games. It installs declarative packs from public schema repositories and applies their styles, callouts, and Markdown blocks to notes. First launch offers City of Mist, Legend in the Mist, and :Otherscape; more sources can be added in settings.

Handbook began as a fork of [Brumes](https://github.com/4rtamis/obsidian-brumes) and retains settings keys so existing vaults can migrate.

### Quick start

1. Enable Obsidian Community plugins and install [BRAT](https://github.com/TfTHacker/obsidian42-brat).
2. Add `RebelliousSmile/obsidian-handbook` in BRAT, then enable **Handbook**.
3. Choose a game on first launch. To add another, open **Settings → Handbook → Schema sources → Add source**.

The [getting started guide](https://github.com/RebelliousSmile/obsidian-handbook/wiki/Getting-Started-EN) covers sources, settings, illustrations, and local customization. The [documentation table](#documentation) links every guide in both languages, including the schema release train for PbtA, Adrenaline, and Mist.

## Migration des anciens packs / Legacy pack migration

Avant une première mise à jour depuis une version antérieure à 2.7.0, copiez vos packs personnels et `overrides.json` hors du dossier du plugin, vers `<configDir>/handbook/packs/` et `<configDir>/handbook/overrides.json`. Un programme de mise à jour peut effacer l'ancien dossier avant que Handbook puisse le migrer. Avec la configuration Obsidian habituelle, `<configDir>` vaut `.obsidian`.

Before first updating from a version older than 2.7.0, copy personal packs and `overrides.json` out of the plugin folder into `<configDir>/handbook/packs/` and `<configDir>/handbook/overrides.json`. An updater may remove the old folder before Handbook can migrate it. With the usual Obsidian configuration, `<configDir>` is `.obsidian`.

## Licence / License

Le code du plugin est sous [licence MIT](LICENSE) : Brumes par 4rtamis, modifications par François-Xavier Guillois. Les polices embarquées conservent leurs licences d'origine, listées dans [`licenses/fonts`](licenses/fonts). Les illustrations des jeux proviennent du coffre et des packs déclarés. L'usage d'assets dérivés de Son of Oak fait encore l'objet de discussions.

Plugin code is [MIT licensed](LICENSE): Brumes by 4rtamis, modifications by François-Xavier Guillois. Bundled fonts retain their original licenses in [`licenses/fonts`](licenses/fonts). Game illustrations come from the vault and declared packs. Use of Son of Oak-derived assets is still under discussion.
