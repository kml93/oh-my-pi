# Ticket T3 — Synchroniser `omp/pr--approval-hotkeys` avec main (migration pi-tui)

## Contexte

- Repo : `/home/kml93/.config/local/opt/kml93@oh-my-pi` (checkout principal sur `kml93`, ne pas y travailler).
- `main` = `fd3f8e3c56` (v18.2.8). Branche `origin/omp/pr--approval-hotkeys`, 1 commit en vol :
  `de058648cf feat(approval): add configurable approval hotkeys` (2026-08-26, jamais sync).
- La PR ajoute : dans l'éditeur, l'interception des actions configurables
  `app.approval.cycle` (+ `onCycleApprovalMode`), `app.settings.open` (`onOpenSettings`),
  `app.thinking.toggle` (`onToggleThinking`) ; et `resolveApprovalModeCycle` dans
  `tools/approval.ts`. **Tout cela est absent de main.**
- Entre-temps upstream a **restructuré la TUI** : l'éditeur vit désormais dans
  `packages/tui/src/prompt/custom-editor.ts` (ancien chemin fork :
  `packages/coding-agent/src/modes/components/custom-editor.ts`, supprimé de main).
  Les tests éditeur sont dans `packages/tui/test/custom-editor-keybindings.test.ts`.
- `tools/approval.ts` reste dans coding-agent ; upstream y a ajouté
  `resolveApprovalFromContext` — les deux fonctions cohabitent (imports de test
  à combiner).

## Procédure

1. Charger : `.agents/skills/fork-workflow/SKILL.md` (+ `references/sync.md`) et
   `/home/kml93/.agents/skills/matt-pocock/resolving-merge-conflicts/SKILL.md`.
2. Worktree :
   ```bash
   git worktree add --track -b omp/pr--approval-hotkeys .worktrees/pr--approval-hotkeys origin/omp/pr--approval-hotkeys
   cd .worktrees/pr--approval-hotkeys
   bun install
   ```
3. `git merge main` → conflits modify/delete attendus (vieux chemins supprimés).
   Portage de la feature vers la nouvelle structure :
   - handlers + callbacks (`onCycleApprovalMode`, `onOpenSettings`, `onToggleThinking`)
     → `packages/tui/src/prompt/custom-editor.ts` (même motif que les interceptions
     existantes `app.display.reset`, `app.suspend`… ; type `ConfigurableEditorAction`
     à étendre) ;
   - `resolveApprovalModeCycle` → conserver dans `packages/coding-agent/src/tools/approval.ts`
     à côté de `resolveApprovalFromContext` ;
   - tests fork « routes configured approval and settings chords through handleInput »
     et précedence → `packages/tui/test/custom-editor-keybindings.test.ts` ;
     imports combinés dans `packages/coding-agent/test/tools/approval.test.ts`
     (`resolveApprovalModeCycle` + `resolveApprovalFromContext`).
4. Vérifier `tools.toggleVisibility` : upstream le gère désormais au niveau
   controller (`packages/coding-agent/src/modes/controllers/input-controller.ts`,
   `app-keybindings.ts`), pas dans l'éditeur. Ne pas re-porter l'interception
   éditeur fork si le chemin controller couvre le comportement ; le signaler
   dans le rapport.
5. Hunk insoluble → **STOP + rapport**. `bun run fix` si besoin, commit merge
   (`Merge branch 'main' into omp/pr--approval-hotkeys`).

## Tests (à la fin)

```bash
bun check
bun test packages/tui/test/custom-editor-keybindings.test.ts packages/coding-agent/test/tools/approval.test.ts packages/tui/test/keybindings-migration.test.ts
```

## Garde-fous

Aucun push, aucune action GitHub, ne pas toucher `kml93`/`main`/autres worktrees ;
tests ciblés uniquement.

## Livrable

Branche synchronisée dans `.worktrees/pr--approval-hotkeys`, tests verts.
Rapport : où chaque handler a atterri, décision `tools.toggleVisibility`, HEAD final.
