# Unité de contexte de la ligne d'état : tokens utilisés au lieu du pourcentage

## Problème

L'usage du contexte est affiché en pourcentage sur toutes les surfaces de la ligne d'état : label `22%` incrusté dans la jauge de bordure (mode embedded par défaut), puce `22.5%/200K` (segment `context_pct`), et ligne de stats du footer. Un utilisateur qui raisonne en tokens absolus doit reconvertir mentalement à chaque lecture. Le nombre de tokens utilisés est pourtant déjà calculé en interne (estimation ancrée sur la dernière réponse du provider) mais jamais affiché.

## Solution

Un réglage unique `statusLine.contextMetric` (enum `percentage` | `tokens`, défaut `percentage`) qui remplace le label de pourcentage par les tokens utilisés — même forme, même emplacement, sur les trois surfaces : jauge embedded (`── 45K ──── 200K ──`), puce du segment `context_pct` (`45K/200K`), et footer. La valeur par défaut `percentage` ne change strictement rien pour les utilisateurs existants.

## User Stories

1. En tant qu'utilisateur d'omp, je veux afficher les tokens de contexte utilisés au lieu du pourcentage, afin de raisonner en valeurs absolues sans conversion mentale.
2. En tant qu'utilisateur d'omp, je veux que `percentage` reste la valeur par défaut, afin que mon affichage ne change pas après une mise à jour.
3. En tant qu'utilisateur d'omp, je veux un réglage unique qui pilote toutes les surfaces d'un coup, afin de ne pas configurer la jauge, la puce et le footer séparément.
4. En tant qu'utilisateur de `/settings`, je veux un sélecteur « Context Unit » dans Appearance › Status Line, afin de basculer l'affichage sans éditer de fichier de config.
5. En tant qu'utilisateur de `/settings`, je veux un aperçu live en parcourant les options du sélecteur, afin de voir l'effet avant de valider — comme pour les réglages voisins de la ligne d'état.
6. En tant qu'utilisateur du composer à box (config par défaut), je veux que le label de la jauge embedded passe de `22%` à `45K`, afin que la surface que je regarde réellement change.
7. En tant qu'utilisateur des modes de context line non embedded, je veux que la puce `context_pct` affiche `45K/200K`, afin que l'information suive le réglage sur mon layout.
8. En tant qu'utilisateur de la ligne de stats du footer, je veux le même échange sur cette surface, afin que tous les affichages du contexte restent cohérents entre eux.
9. En tant qu'utilisateur sur terminal étroit, je veux que le label tokens garde l'abréviation compacte (K/M), afin que la jauge ne déborde pas.
10. En tant qu'utilisateur en tout début de session, je veux un placeholder au lieu d'un nombre trompeur, afin de ne pas lire `0K` comme une usage réelle.
11. En tant qu'utilisateur dont l'usage dépasse la fenêtre (changement de modèle vers une fenêtre plus petite), je veux le label de débordement en couleur d'erreur au même emplacement qu'aujourd'hui, afin que l'anomalie reste visible.
12. En tant qu'utilisateur dont le provider n'expose pas la fenêtre de contexte, je veux `45K/?`, afin que l'absence de métadonnée reste explicite.
13. En tant qu'utilisateur qui s'appuie sur les couleurs de seuil (normal/warning/purple/error), je veux que ces couleurs restent inchangées en mode tokens, afin que la signalisation ne change pas de signification.
14. En tant qu'utilisateur du preset custom, je veux que le réglage soit indépendant de la composition des segments, afin que mes `leftSegments`/`rightSegments` continuent de fonctionner tels quels.
15. En tant qu'utilisateur qui bascule le métric en cours de session, je veux que le changement s'applique immédiatement, sans redémarrage.
16. En tant que lecteur de la documentation des settings, je veux la nouvelle clé documentée dans la table de référence, afin de la découvrir sans lire le code source.
17. En tant que mainteneur du fork, je veux ce changement livré en PR upstream depuis main, afin qu'aucune dette de merge ne s'accumule aux syncs.

## Décisions d'implémentation

- Nouveau réglage `statusLine.contextMetric` : enum `["percentage", "tokens"]`, défaut `"percentage"`. UI `/settings` › onglet Appearance › groupe Status Line, label « Context Unit », options « Percent » / « Tokens », avec aperçu live de la ligne d'état selon le pattern existant des réglages voisins (preset, separator, context line).
- La liste des valeurs du type vit dans le module de schéma de la ligne d'état (TUI), comme les autres listes de valeurs de la famille ; l'entrée settings-schema (coding-agent) l'importe et expose l'UI.
- Le champ `contextMetric` est ajouté au type de settings de la ligne d'état et traverse la propagation existante : tous les call-sites qui transfèrent aujourd'hui preset/segments/separator/contextLine transfèrent aussi ce champ (host de ligne d'état, câblage du mode interactif, contrôleur du sélecteur et chemin de preview).
- Le formateur partagé d'usage du contexte (utilisé par la puce et le footer) prend le métric en paramètre : en mode `tokens` il rend `utilisé/fenêtre` via le formateur de nombres partagé du repo, en mode `percentage` son comportement actuel est inchangé.
- Réutilisation stricte du formateur de nombres existant : `743` → `743`, `9 000` → `4.5K`, `45 200` → `45K`, `1 200 000` → `1.2M`. Aucun nouveau formateur, aucune décimale forcée.
- Le label gauche de la jauge embedded passe de pourcentage à tokens utilisés ; le label droit (fenêtre) reste ; le cas de débordement >100% conserve le placement et la couleur d'erreur actuels.
- L'identifiant du segment `context_pct` reste inchangé (nom historique, ne pas casser les configs existantes) ; son contenu dépend du métric, et la doc le mentionne.
- Les couleurs de seuil et le remplissage de la jauge restent dérivés du pourcentage interne ; seuls les labels affichés changent.
- L'éligibilité à l'embedding de la jauge est inchangée (mêmes conditions qu'aujourd'hui).
- Placeholder de démarrage, fenêtre inconnue (`?`) et comportement post-compaction (métric inconnu) calquent exactement le comportement actuel du pourcentage.
- Le footer lit le métric depuis la même source de settings de ligne d'état.
- Documentation : ligne dans la table de référence des settings + mention dans le paragraphe sur la ligne d'état custom ; entrée changelog `[Unreleased]` › `Added` (obligatoire pour un PR user-facing selon les règles du repo).
- Livraison : branche `omp:pr--*` coupée depuis `main` (jamais depuis `kml93`), selon le workflow du fork.

## Décisions de test

- Un bon test n'observe que le comportement externe : rendre le composant de ligne d'état avec un snapshot de settings et une session factice, puis assérer sur les chaînes visibles (bordure haute avec la jauge, contenu de la barre) — jamais sur des helpers internes ni sur le texte source.
- Seams existants, aucun nouveau seam :
  - le rendu du composant de ligne d'état couvre jauge + puce en une passe (seam le plus haut disponible) ;
  - le rendu du composant de footer couvre la ligne de stats.
- Prior art : les suites existantes du composant de ligne d'état qui assèrent les bordures rendues et les settings effectifs, et le test du footer qui rend le composant avec une session factice.
- Cas couverts : défaut `percentage` inchangé (garde de régression sur les trois surfaces), mode `tokens` sur la jauge, mode `tokens` sur la puce, échange du footer, placeholder de démarrage, fenêtre inconnue, débordement >100%.

## Hors périmètre

- Panneau `/context` et rapport de contexte (commande) : leur formatage reste en pourcentage.
- Overrides du métric par segment ou par preset : le réglage est global, point.
- Nouveau segment de ligne d'état dédié aux tokens (le compteur cumulé `token_total` existe déjà pour l'usage total de session).
- Changement de précision/décimales ou nouveau formateur de nombres.
- Renommage de l'identifiant de segment `context_pct`.
- Changements de thème, de couleurs de seuil ou de sémantique de la jauge.
- Surfaces RPC/headless au-delà de ce qu'elles héritent naturellement du formateur partagé.

## Notes

- Les tokens affichés sont l'estimation interne ancrée sur la dernière réponse du provider (même nombre que celui qui alimente le pourcentage) — pas un compteur cumulé de session.
- Le label numérique de la jauge n'existe qu'en mode embedded ; les autres modes portent l'info dans la puce — les deux surfaces sont couvertes.
- Avant tout push ou création de PR : phrase du contributeur dans ses propres mots (exigence CONTRIBUTING) et approbation explicite de l'utilisateur, toutes deux requises par les règles du repo.
- Exemples de rendu final : jauge `── 45K ──── 200K ──`, puce `45K/200K`, footer idem ; défaut inchangé `── 22% ──── 200K ──` / `22.5%/200K`.
