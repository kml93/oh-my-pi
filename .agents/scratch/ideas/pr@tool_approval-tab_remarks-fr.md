# Ajout de remarque utilisateur via TAB lors des demandes d'approbation d'outils

Statut : Idée DORMANTE (candidate PR upstream, 2026-09-05)
Auteur : kml93
Contexte : Inspiré par `$XDG_CONFIG_HOME/pi/extensions/modes/` (`gate.ts`, `ui.ts`)

## Problème

Dans l'upstream d'OMP (`packages/coding-agent/src/extensibility/extensions/wrapper.ts`), lorsqu'un outil nécessite une validation humaine (ex: sous `approvalMode: "always-ask"`, `approvalMode: "write"`, ou via les règles explicites `tools.approval.<tool>: prompt`), la boîte de dialogue impose un choix binaire rigide : `Approve` ou `Deny` via `uiContext.select(prompt, ["Approve", "Deny"])`.

1. Si l'utilisateur approuve, il ne peut pas ajouter de consignes ou de garde-fous (ex: "Approuvé, mais ne touche pas au fichier X"). L'agent s'exécute à l'aveugle sans connaître ces contraintes.
2. Si l'utilisateur refuse, l'agent reçoit une erreur brute et sans contexte : `Tool call denied by user: <tool>`. Le modèle doit deviner la cause du refus, ce qui provoque des répétitions ou des tours de discussion superflus.

## Proposition

Permettre d'appuyer sur la touche `TAB` lors de l'invite d'approbation d'outil pour ouvrir un champ de saisie de remarque/commentaire avant de valider avec `Approve` ou `Deny`.

## Sémantique & Portée

- **En cas d'approbation avec commentaire** : Le commentaire est ajouté au résultat de l'exécution de l'outil (ex: `\n\nUser comment: <commentaire>`), guidant le modèle directement dans son flux de travail.
- **En cas de refus avec commentaire** : Le message d'erreur de refus inclut l'explication (ex: `Tool call denied by user: <tool> (comment: <commentaire>)`), permettant au modèle d'adapter immédiatement son approche au tour suivant.
- Sans commentaire, le comportement d'approbation/refus standard reste strictement inchangé.

## Notes d'implémentation

### 1. Invite d'approbation UI (`packages/coding-agent/src/extensibility/extensions/wrapper.ts`)
- Remplacer l'appel basique `uiContext.select(safetyPrompt, ["Approve", "Deny"])` par un composant d'approbation ou un sélecteur interactif supportant la saisie d'une note.
- Lors de la pression de `Key.tab`, basculer vers un champ `Input` inline pour éditer la remarque (sur le modèle de `confirmGate` dans `pi/extensions/modes/ui.ts`).

### 2. Propagation du résultat et de l'erreur
- En cas de refus avec commentaire : formater l'erreur en `Tool call denied by user: ${this.tool.name}: ${comment}`.
- En cas d'approbation avec commentaire : transmettre le commentaire à `emitToolResult` pour l'ajouter au bloc de contenu :
  ```ts
  content: [...result.content, { type: "text", text: `\n\nUser comment: ${comment}` }]
  ```

### 3. Implémentation de référence
- Extension modes de Pi : `$XDG_CONFIG_HOME/pi/extensions/modes/gate.ts` et `ui.ts`.

## Déclencheur pour implémenter

Créer une branche `omp:pr--tool-approval-tab-remarks` depuis `main` dès que les refus/approbations sans consignes deviendront contraignants au quotidien.
