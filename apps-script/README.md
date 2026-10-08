# Gestionnaire de repas (Google Apps Script)

Interface pour chercher, consulter, ajouter, modifier et supprimer les repas de la feuille **Idee Repas**.

## Installation

1. Ouvrir le Google Sheet **Idee Repas**.
2. Menu **Extensions > Apps Script**.
3. Remplacer le contenu de `Code.gs` par celui du fichier `Code.gs` d'ici.
4. Cliquer sur **+ > HTML**, nommer le fichier `Index` (exactement), et coller le contenu de `Index.html`.
5. Enregistrer (💾), puis recharger le Google Sheet.
6. Un menu **🍽️ Repas** apparaît : **Ouvrir le gestionnaire** (la première fois, Google demande l'autorisation).

> Si l'onglet des repas ne s'appelle pas `Feuille 1`, changer la constante `NOM_FEUILLE` en haut de `Code.gs`.

## Onglet « Ingrédients »

Au premier chargement, le script crée un onglet **Ingrédients** et le remplit avec les ingrédients de vos repas :

| INGREDIENT | FAMILLE | SYNONYMES | ICONE | QTE / PERS | UNITE |
|---|---|---|---|---|---|
| POULET | PROTÉINES | DJEJ | | 150 | g |
| OIGNON | LÉGUMES | BSAL | | 50 | g |
| OEUF | PROTÉINES | | | 1 | pièce |

- **FAMILLE** : le groupe affiché dans l'interface (PROTÉINES, LÉGUMES, FÉCULENTS, PRODUITS LAITIERS, ÉPICES & SAUCES, FRUITS, ou toute famille que vous inventez). Vide = « À classer ».
- **SYNONYMES** : autres noms du même ingrédient, séparés par `/` (ex. `BSAL`). Ils sont regroupés avec l'ingrédient.
- **ICONE** : facultatif, un emoji pour remplacer l'icône automatique.
- **QTE / PERS** et **UNITE** : quantité **approximative par personne** (unités : `g`, `kg`, `ml`, `l`, `pièce`). Elle sert à calculer la liste de courses. Des estimations sont proposées pour les ingrédients courants ; **corrigez-les à votre goût**, dans le Sheet ou avec le crayon ✏️ de la liste de courses. Vide = « à définir ».

Quand un repas contient un ingrédient absent de l'onglet, il y est ajouté automatiquement (famille et quantité proposées si l'ingrédient est reconnu). Un ancien onglet à 4 colonnes reçoit les deux colonnes de quantités une seule fois, sans toucher à vos données.

## Onglet « Planning »

Créé automatiquement. Une ligne par repas planifié :

| DATE | SERVICE | CODE | PERSONNES |
|---|---|---|---|
| 2026-10-05 | MIDI | R001 | |
| 2026-10-05 | SOIR | R004 | 6 |

`PERSONNES` vide = nombre de personnes par défaut (réglé avec le **👥** du calendrier). Supprimer un repas le retire aussi du planning.

## Fonctions

- Recherche par **nom de repas** et/ou **ingrédient** (sans tenir compte des accents ni des majuscules).
- Filtre par **catégorie** de repas (REPAS, FAST FOOD…) et par **ingrédients**, rangés par **famille** (onglets Protéines, Légumes…), avec le nombre de repas pour chaque ingrédient.
- Fiche détaillée, ajout (code `R00x` automatique), modification, suppression.
- Détection des **doublons** de repas (nom identique une fois nettoyé, ou faute de frappe).
- Bouton **Idée au hasard**.
- **📅 Semaine** : calendrier du lundi au dimanche, midi et soir. Ajout avec **＋** ou en **glissant** une carte de repas sur un créneau ; glisser un créneau le déplace ou l'échange avec un autre. Nombre de personnes par défaut (👥) et modifiable pour chaque repas. Navigation de semaine en semaine.
- **🛒 Liste de courses** : total de la semaine par ingrédient (quantité par personne × personnes, repas par repas), rangé par famille, avec cases à cocher, copie dans le presse-papiers et impression. Option pour inclure les ingrédients facultatifs.

## Option : utiliser sur téléphone

Dans Apps Script : **Déployer > Nouveau déploiement > Application Web** (exécuter en tant que : moi ; accès : moi). Après chaque modification du code : **Déployer > Gérer les déploiements > ✏️ > Nouvelle version > Déployer**.
