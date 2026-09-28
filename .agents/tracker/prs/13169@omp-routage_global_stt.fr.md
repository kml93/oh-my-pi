# Routage de la dictée vers le champ texte focus via écouteur d'entrée global

## Résumé

Cette PR active le routage global de la synthèse vocale vers texte via le raccourci `app.stt.toggle`, en orientant la dictée vers le champ texte qui détient le focus clavier à travers l'ensemble du TUI. L'enregistrement survit naturellement aux transitions de dialogue, livrant la transcription finale au champ focalisé à l'arrêt de l'enregistrement (ou se repliant élégamment dans le brouillon du composeur si aucun champ texte n'est focalisé).

### Deux déclencheurs, un seul moteur

La dictée prend désormais en charge deux déclencheurs cohabitants alimentés par un `STTController` unifié :
1. **Geste de maintien (maintenir-Espace)** : Geste de maintien de la barre d'espace d'amont avec politique de validation directe par segment (`start(editor, options)`).
2. **Touche STT globale (`app.stt.toggle`)** : Cible du routeur global avec aperçu volatil et livraison en bloc à l'arrêt (`start(resolveEditor, fallbackEditor, options)`).

Les deux déclencheurs partagent le même moteur de dictée sous-jacent et le même cycle de vie de préflight sans conflit.

### Extensions dans cette synchronisation

- **Cible de dictée mono-ligne standardisée** : Élargissement de la résolution de cible de `TUI.getFocusedTextEditor()` et `submitFocusedTextEditor()` pour accepter tout composant exposant la surface de dictée standardisée (`setVolatileText`, `commitVolatileText`, `clearVolatileText`, `deleteBeforeCursor`, `submit`), activant les champs mono-lignes `Input` aux côtés des composants multi-lignes `Editor`.
- **Cible de follow-up du hub BTW History** : Déclaration du champ mono-ligne de suivi dans `BtwHistoryPanel` comme cible du routeur pour le raccourci global (`app.stt.toggle`).
- **Retour visuel du curseur récepteur** : Rendu de `MicCursor` lié au champ recevant activement la dictée sur les deux déclencheurs (bascule globale et geste de maintien). Correction d'un oubli de retour dans les composants `Input` mono-lignes où les surcharges de curseur étaient supprimées lorsqu'on n'était pas en fin de texte.
- **Aperçus volatils & livraison propre** : Maintien des aperçus en flux volatils dans la valeur du champ, livrant le texte final sous forme de bloc unique annulable à l'arrêt sans duplication entre aperçu et texte validé.

Réf : kml93/oh-my-pi#2
