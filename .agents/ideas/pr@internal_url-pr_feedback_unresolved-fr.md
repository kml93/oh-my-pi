# Filtre natif `?feedback=unresolved` pour les URLs `pr://`

Statut : Idée DORMANTE (candidate PR upstream, 2026-08-31)
Auteur : kml93
Remplace à terme : `.agents/skills/fork-workflow/scripts/pr-feedback.ts` et sa référence dans `SKILL.md`

## Problème

Actuellement, `read pr://<owner>/<repo>/<n>` renvoie l'historique complet de la review. Après avoir poussé un correctif, un agent qui relit la PR reçoit tous les commentaires obsolètes aux côtés des commentaires encore actionnables (~90 lignes de texte pour seulement ~5 lignes utiles). De plus, les snapshots pris avant un push ignorent complètement les nouveaux retours des bots. Ces deux écueils ont été constatés sur la PR #10408.

## Proposition

Ajouter un filtre optionnel sur le lecteur d'URL interne `pr://`, additif et neutre par défaut (dans le même esprit que les paramètres existants `?state=` et `?comments=`) :

```
read pr://<owner>/<repo>/<n>?feedback=unresolved
```

## Sémantique — Les 3 niveaux de tri

Les fils de review GitHub (GraphQL `pullRequest.reviewThreads`) possèdent deux indicateurs clés :
- `isResolved` : Un humain a marqué le fil comme résolu (décision explicite "terminé").
- `isOutdated` : GitHub marque automatiquement les fils dont la ligne de code ciblée a bougé lors d'un push ultérieur (automatique, mais ne garantit pas que la remarque a été prise en compte).

La vue `unresolved` classe les commentaires ainsi :
1. **Fils résolus (`isResolved: true`)** -> Exclus (décision humaine explicite).
2. **Fils non résolus et actuels (`!isOutdated`)** -> Corps complet affiché (la partie actionnable prioritaire).
3. **Fils non résolus mais obsolètes (`isOutdated: true`)** -> Résumés en une ligne de décompte, sans le corps (probablement traités lors d'un push ultérieur, non confirmé — masqués mais repérables).

En complément :
- **Reviews sur le commit de tête (`HEAD`)** : Une ligne résumée chacune ; le corps des reviews de bots est répétitif, le signal utile est en ligne.
- **Commentaires généraux de conversation** : Conservés (non rattachés à un fil de code ou un commit).
- **Tout le reste (métadonnées, liste des fichiers)** : Inchangé.

## Notes d'implémentation

- `isResolved` et `isOutdated` existent uniquement sur les `reviewThreads` GraphQL ; le lecteur `pr://` utilise déjà GraphQL, il s'agit donc d'une évolution de la requête et du rendu.
- Le comportement par défaut reste strictement celui d'aujourd'hui (`?feedback=all` implicite).
- La vérification des checks/CI est hors de portée : préoccupation distincte, paramètre séparé si nécessaire.

## Déclencheur pour implémenter

Créer un worktree `omp/pr--*` depuis `main` lorsque la consultation manuelle via le script deviendra trop contraignante au fil des cycles de PR, ou si un second utilisateur en exprime le besoin.
