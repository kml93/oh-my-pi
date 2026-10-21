# Champ de remarques globales dans l'onglet Submit de l'outil `ask`

Statut : Idée DORMANTE (candidate PR upstream, 2026-09-05)
Auteur : kml93
Contexte : Inspiré par `$XDG_CONFIG_HOME/pi/extensions/tools/questionnaire/` (`dialog.ts`, `core.ts`, `schema.ts`)

## Problème

Dans l'upstream d'OMP (`packages/coding-agent/src/modes/components/ask-dialog.ts`), la boîte de dialogue de l'outil `ask` permet de répondre aux questions individuelles, y compris en ajoutant des notes textuelles par question (`n note` / "Type something...").

Cependant, le dernier onglet (onglet Submit, `#renderSubmitBody`) ne propose que :
1. Un récapitulatif des questions et réponses sélectionnées.
2. Une seule ligne d'action sélectionnable : `Submit answers`.

Il n'y a aucun moyen de saisir une remarque générale ou globale s'appliquant à l'ensemble du questionnaire (ex: contraintes globales d'architecture, mise en garde). Si l'utilisateur a une consigne globale, il est contraint de valider puis d'attendre le tour suivant pour envoyer un message de chat séparé.

À l'inverse, le questionnaire de Pi (`~/.config/pi/extensions/tools/questionnaire/dialog.ts`) propose sur l'onglet final deux actions : `1. Add a general remark unrelated to a specific question` et `2. Submit answers`.

## Proposition

Ajouter une action de saisie de remarques globales sur l'onglet Submit d'`AskDialog` dans l'upstream d'OMP, permettant à l'utilisateur d'ajouter des consignes générales avant validation.

## Sémantique & Portée

- Sur l'onglet Submit, l'utilisateur peut se positionner sur la ligne "Remarque générale" (ou utiliser un raccourci) pour ouvrir un champ d'édition inline.
- Une fois renseignée, la remarque s'affiche en prévisualisation dans l'onglet Submit juste au-dessus du bouton de soumission.
- Lors de la validation :
  - La remarque est retournée sous forme de champ optionnel `remarks?: string` dans le résultat du dialogue et de l'outil `ask`.
  - Le texte renvoyé au modèle contient la remarque générale :
    ```
    1. Périmètre : Refactorisation complète
    2. Tests : Ajouter des tests unitaires
    Remarques : Veiller à ne casser aucun export public dans index.ts
    ```
- Si aucune remarque n'est saisie, le fonctionnement reste identique à la soumission actuelle.

## Notes d'implémentation

### 1. Composant Dialog (`packages/coding-agent/src/modes/components/ask-dialog.ts`)
- Ajouter la propriété d'état `#remarks: string = ""` dans `AskDialog`.
- Dans `#renderSubmitBody(width, rows)` :
  - Rendre deux éléments sélectionnables dans la liste d'actions de soumission :
    1. Ligne de remarque (ex: `1. Saisir une remarque globale` ou affichage de la remarque existante).
    2. Ligne `Submit answers`.
- Gérer la touche Entrée sur la ligne de remarque pour ouvrir un composant `Input` inline d'édition.
- Transmettre `remarks: this.#remarks || undefined` dans l'objet de résultat de `#finishSubmit()`.

### 2. Outil `ask` (`packages/coding-agent/src/tools/ask.ts`)
- Mettre à jour le type de retour pour inclure `remarks?: string`.
- Formater la remarque à la fin du texte retourné au modèle : `\nRemarques : ${remarks}`.

### 3. Documentation du prompt (`packages/coding-agent/src/prompts/tools/ask.md`)
- Documenter la possibilité pour l'utilisateur de fournir une remarque globale lors de la soumission.

## Déclencheur pour implémenter

Créer une branche `omp:pr--ask-global-remarks` depuis `main` dès que la répétition de messages de chat post-questionnaire devient gênante.
