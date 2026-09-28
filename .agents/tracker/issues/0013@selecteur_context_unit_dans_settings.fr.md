# Sélecteur Context Unit dans /settings: preview, docs, changelog

## Parent

#11 (spec : Unité de contexte de la ligne d'état)

## À construire

L'utilisateur ouvre `/settings` › onglet Appearance › groupe Status Line et voit un sélecteur « Context Unit » avec les options « Percent » / « Tokens ». Parcourir les options prévisualise la ligne d'état en direct — même pattern que les réglages voisins (preset, separator, context line) — et l'annulation restaure l'état d'avant. La sélection persiste et s'applique immédiatement en session, sans redémarrage.

Complète la livraison : ligne dans la table de référence des settings, mention dans le paragraphe sur la ligne d'état custom (le contenu du segment `context_pct` dépend du métric), entrée changelog `[Unreleased]` › `Added`. La PR upstream unique (branche `omp:pr--*` depuis `main`) porte ce ticket et le ticket core ; les portes d'approbation (phrase du contributeur + go explicite avant push/PR) sont décrites dans le parent #11.

## Critères d'acceptation

- [ ] Sélecteur « Context Unit » visible dans Appearance › Status Line, options « Percent » / « Tokens », sélection persistée.
- [ ] Preview live de la ligne d'état en parcourant les options ; restaurée à l'annulation.
- [ ] Changement appliqué immédiatement en session, sans redémarrage.
- [ ] Table de référence des settings documente la clé ; le paragraphe custom mentionne la dépendance du contenu au métric.
- [ ] Entrée changelog `[Unreleased]` › `Added` rédigée.
- [ ] `bun check` et suites de tests de la ligne d'état vertes.

## Blocked by

Le ticket core (jauge/puce/footer) — le sélecteur et la preview exposent un réglage qui doit exister et rendre.
