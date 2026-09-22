# Ticket T2 — Synchroniser `omp/pr--openai-codex-stt` avec main

## Contexte

- Repo : `/home/kml93/.config/local/opt/kml93@oh-my-pi` (checkout principal sur `kml93`, ne pas y travailler).
- `main` = `fd3f8e3c56` (v18.2.8). Branche `origin/omp/pr--openai-codex-stt` tip `f02e334b4d`, dernière sync main le 2026-09-08.
- La PR introduit le **transcribeur STT OpenAI Codex** + une registry :
  `stt/transcriber-registry.ts`, `stt/types.ts` (`DEFAULT_STT_TRANSCRIBER_ID`,
  `STT_TRANSCRIBER_OPTIONS/VALUES` avec entrée `codex`), réglage `stt.transcriber`.
  Ces fichiers **n'existent pas dans main**.
- Upstream a évolué en parallèle vers `stt.modelName` + `stt/models.ts`
  (`DEFAULT_STT_MODEL_KEY`, `STT_MODEL_OPTIONS/VALUES`) — modèles locaux uniquement,
  pas de cloud. Le fork structure aussi `stt/local/models.ts` (mêmes clés que
  `stt/models.ts` : `parakeet`, whisper tiers…).

## Conflits attendus et intention de résolution

1. `packages/coding-agent/src/config/settings-schema.ts` (imports + bloc STT) :
   garder le vocabulaire fork `stt.transcriber` (registry + codex), qui est un
   sur-ensemble d'`stt.modelName` ; penser à importer `type SttSubmitTrigger`
   si le type est utilisé. Import thinking : suivre upstream
   (`@oh-my-pi/pi-tui/thinking`) si `../thinking` n'existe plus.
2. Modules `stt/*` : préserver l'architecture fork (local/ + providers/codex +
   registry) en réconciliant les évolutions upstream des modèles locaux.
3. `packages/coding-agent/src/cli/setup-model-picker.ts` : **supprimé dans main**
   (fonction déplacée vers `@oh-my-pi/pi-tui/apps/setup-model-picker`) ;
   `setup-cli.ts` l'importe déjà depuis pi-tui. Accepter la suppression, veiller
   à ce que le picker couvre l'entrée `codex` via `STT_TRANSCRIBER_OPTIONS`.

## Procédure

1. Charger : `.agents/skills/fork-workflow/SKILL.md` (+ `references/sync.md`) et
   `/home/kml93/.agents/skills/matt-pocock/resolving-merge-conflicts/SKILL.md`.
2. Worktree :
   ```bash
   git worktree add --track -b omp/pr--openai-codex-stt .worktrees/pr--openai-codex-stt origin/omp/pr--openai-codex-stt
   cd .worktrees/pr--openai-codex-stt
   bun install
   ```
3. `git merge main`, résoudre selon les intentions ci-dessus.
4. Hunk insoluble en préservant les deux intentions → **STOP + rapport**, ne rien inventer.
5. `bun run fix` si besoin, commit merge (`Merge branch 'main' into omp/pr--openai-codex-stt`).

## Tests (à la fin)

```bash
bun check
bun test packages/coding-agent/test/settings-manager.test.ts
# + tout test stt/ speech/ présent sur la branche (chercher: ls packages/coding-agent/test | stt)
```

## Garde-fous

Aucun push, aucune action GitHub, ne pas toucher `kml93`/`main`/autres worktrees ;
tests ciblés uniquement.

## Livrable

Branche synchronisée dans `.worktrees/pr--openai-codex-stt`, tests verts.
Rapport : résolutions, vocabulaire STT retenu, HEAD final.
