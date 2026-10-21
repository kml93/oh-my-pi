# Toujours afficher l'onglet Submit dans l'outil `ask`

Statut : Idée DORMANTE (fork-local kml93, 2026-09-05)
Auteur : kml93
Contexte : Expérience interactive des questionnaires sur la branche fork `kml93`

## Problème

Dans l'upstream d'OMP (`packages/coding-agent/src/modes/components/ask-dialog.ts`), les questionnaires ne comportant qu'une seule question à choix unique ignorent totalement l'onglet final Submit :
```ts
#hasSubmitTab(): boolean {
  return this.#questions.length > 1 || this.#questions.some(question => question.multi);
}
```
Lorsque `questions.length === 1 && !question.multi`, appuyer sur Entrée sur une option déclenche immédiatement `#finishSubmit()`, fermant le dialogue et validant la réponse.

Cela pose plusieurs problèmes sur le fork `kml93` :
1. **Aucune étape de relecture** : L'utilisateur ne peut pas vérifier son choix avant validation définitive.
2. **Blocage des remarques globales** : Si l'onglet Submit comporte un champ de remarques générales (voir `pr@ask_tool-submit_tab_global_remarks.md`), les questionnaires à question unique empêchent tout accès à ce champ.
3. **Modèle mental incohérent** : Les questionnaires multi-questions passent par une étape explicite de relecture/validation, alors que les questionnaires à question unique se soumettent instantanément.

L'upstream d'OMP (`can1357`) privilégie délibérément le minimum de frappes pour les questions simples. Par conséquent, conserver systématiquement l'onglet Submit est une fonctionnalité propre au fork `kml93`.

## Proposition

Sur la branche `kml93`, toujours afficher l'onglet de confirmation/Submit, quel que soit le nombre de questions.

## Sémantique & Portée

- Dans un dialogue à une seule question :
  - Sélectionner une option avec Entrée enregistre la réponse et bascule le curseur vers l'onglet Submit (`#submitTabIndex()`) au lieu de fermer la boîte.
  - Sur l'onglet Submit, l'utilisateur peut relire son choix, ajouter une remarque générale, ou revenir en arrière (`Tab` / `Shift+Tab` / flèches) pour modifier son option.
  - Appuyer sur Entrée sur l'onglet Submit finalise et transmet les réponses.
- Les questionnaires à 2+ questions continuent leur comportement habituel jusqu'à l'onglet Submit.

## Notes d'implémentation (~30-50 lignes)

### 1. Présence de l'onglet et calcul de hauteur (`packages/coding-agent/src/modes/components/ask-dialog.ts`)
- Dans `#hasSubmitTab()` : renvoyer `true` inconditionnellement (ou lié à un paramètre fork `ask.alwaysShowSubmitTab = true`).
- Dans `#dialogHeight` et `#measureHeight` : s'assurer que le calcul de hauteur prend toujours en compte `tabBarRows = 1`.

### 2. Flux de navigation
- Dans `#advanceAfterQuestion()` :
  - Remplacer `if (this.#questions.length === 1) { this.#finishSubmit(); return; }` par une transition vers `this.#submitTabIndex()`.
- Mettre à jour l'indication du pied de page : afficher `Enter next` (ou `Enter review`) au lieu de `Enter submit` sur la première question.

## Déclencheur pour implémenter

À intégrer directement sur la branche `kml93` lors de la mise en place des remarques globales ou si les validations accidentelles sur question unique deviennent gênantes.
