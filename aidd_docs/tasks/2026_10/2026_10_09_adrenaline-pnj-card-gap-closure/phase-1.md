---
status: pending
---

# Instruction: Audit au rendu et réponses aux questions ouvertes

## Tasks to do

1. Construire et déployer Handbook dans un coffre de test ; rendre `agent-de-securite.toml` ; comparer à `preview.html` zone par zone : en-tête, description, caractéristiques, santé, formations, compétences, équipement, pistes Malus et Stress
2. Vérifier chaque critère d'acceptation de l'issue et chaque ligne des tableaux « Écarts de contrat » et « Écarts de présentation » : verdict livré / écart / à décider, avec une preuve (extrait de schéma, capture, sortie de commande)
3. Lire `validate:pack` : paires encre/fond des jetons de badge de dés (`--adrenaline-dice-badge-*`) et de déclencheur, en light et en dark ; relever si la réduction a un jeton propre (le pack n'en publie pas aujourd'hui) et, sinon, trancher entre en créer un et la rendre avec le badge existant
4. Poser à l'utilisateur les questions 1 à 5 qui restent ouvertes, avec la capture ; consigner la réponse dans #41
5. Issue sœur Handbook : rattacher #64 (ouverte) ; n'en ouvrir une que si un écart retenu sort de son périmètre

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | ------------------- |
| 1-2 | Chaque ligne de l'issue porte un verdict et une preuve ; aucun « à voir » |
| 3 | Paires de jetons vérifiées ; paire du badge de réduction identifiée (jeton propre ou badge de dés), contraste mesuré |
| 4-5 | Cinq questions tranchées par l'utilisateur ; issue sœur identifiée |
