# Core de l'unité de contexte: tokens sur jauge, puce et footer

## Parent

#11 (spec : Unité de contexte de la ligne d'état)

## À construire

Sans UI : l'utilisateur définit `statusLine.contextMetric: tokens` dans sa config (fichier ou CLI) et les trois surfaces d'affichage du contexte échangent le pourcentage contre les tokens utilisés — même forme, même emplacement :

- jauge embedded : `── 45K ──── 200K ──` au lieu de `── 22% ──── 200K ──` ;
- puce du segment `context_pct` : `45K/200K` au lieu de `22.5%/200K` ;
- ligne de stats du footer : même échange.

La valeur par défaut `percentage` laisse les trois surfaces strictement identiques au rendu actuel. Les nombres passent par le formateur partagé du repo (`743`, `4.5K`, `45K`, `1.2M`). Traversée complète en une passe : liste de valeurs du schéma de ligne d'état (TUI) → entrée settings-schema (coding-agent) → propagation existante du réglage → formateur d'usage contexte → jauge/segments/footer → tests.

## Critères d'acceptation

- [ ] Défaut `percentage` : jauge, puce et footer rendus identiques au comportement d'avant (garde de régression sur les trois surfaces).
- [ ] Mode `tokens` : label gauche de la jauge = tokens utilisés via le formateur partagé ; label droit (fenêtre) inchangé ; débordement >100% conserve placement et couleur d'erreur.
- [ ] Mode `tokens` : puce `45K/200K` ; fenêtre inconnue `45K/?`.
- [ ] Footer échangé à l'identique via la même source de settings.
- [ ] Placeholder de démarrage calqué sur le comportement actuel du pourcentage.
- [ ] Réglage validé comme enum (`percentage` | `tokens`), défaut `percentage`, définissable par fichier de config.
- [ ] Couleurs de seuil et remplissage de la jauge inchangés dans les deux modes.
- [ ] Suites de tests du composant de ligne d'état et du footer vertes ; `bun check` propre.

## Blocked by

Aucun (démarrable immédiatement).
