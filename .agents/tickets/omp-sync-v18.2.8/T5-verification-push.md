# Ticket T5 — Vérification finale et push (après review manuelle de kml93)

## Prérequis

T4 terminé ET review manuelle de kml93 faite par kml93 (l'utilisateur).
Ne pas lancer avant son GO explicite.

## Procédure

1. Charger `.agents/skills/fork-workflow/SKILL.md` (+ `references/sync.md`).
2. Vérifications dans le checkout principal (kml93) :
   ```bash
   git status                     # propre, sur kml93
   scripts/setup-minimum-runtime-dev.sh
   omp --smoke-test
   bun check
   bun test packages/coding-agent/test/file-mentions.test.ts \
              packages/coding-agent/test/tools/approval.test.ts \
              packages/tui/test/custom-editor-keybindings.test.ts
   ```
3. Si tout est vert, push (pré-approuvé par l'utilisateur pour ce chantier,
   uniquement vers origin, aucune action GitHub — pas de PR/commentaire) :
   ```bash
   git push origin main                          # miroir upstream (déjà fetché en local)
   git push origin kml93
   git push origin omp/pr--file-mention-ranges omp/pr--openai-codex-stt omp/pr--approval-hotkeys
   ```
4. Nettoyage des worktrees du chantier (après push réussi) :
   ```bash
   git worktree remove .worktrees/pr--file-mention-ranges
   git worktree remove .worktrees/pr--openai-codex-stt
   git worktree remove .worktrees/pr--approval-hotkeys
   ```

## Notes

- `omp/pr--at-dir-completion` : acceptée upstream, branche obsolète — NE PAS
  supprimer sans accord explicite (action GitHub).
- Hors périmètre du chantier : `omp/pr--ide-edit-approval` (15 commits en vol),
  `omp/pr--fix-package-json-indent` (1) — non synchronisés ici, à traiter dans
  un chantier séparé si souhaité.

## Livrable

Pushs effectués + URLs des branches ; résultats des vérifications ; état final
des branches locales/origin.
