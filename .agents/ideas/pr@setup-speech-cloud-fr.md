# Ticket — PR séparée : setup speech cloud-tolerant + Échap fonctionnel

## Contexte

- Repo : `/home/kml93/.config/local/opt/kml93@oh-my-pi` (checkout principal sur `kml93`, ne pas y travailler).
- Base obligatoire : la branche `omp/pr--openai-codex-stt-v2` (worktree `.worktrees/pr--openai-codex-stt`), telle que validée par kml93 — PAS main seul. Raison : le driver est la dictée cloud Codex introduite par cette PR ; il faut le modèle `openai-codex/transcribe` présent pour tester le setup de bout en bout. Si la PR codex est merge dans main entre-temps, rebaser sur main.
- `omp setup speech` = assistant d'installation des artefacts locaux de la parole (poids STT parakeet/whisper, TTS kokoro). Les providers cloud n'ont rien à y télécharger (credentials = `omp login`, hors scope).
- Source du design : l'ancienne PR `origin/omp/pr--openai-codex-stt` (`git diff $(git merge-base origin/omp/pr--openai-codex-stt main) origin/omp/pr--openai-codex-stt -- packages/coding-agent/src/cli/setup-cli.ts`).

## Bugs ciblés (main actuel)

1. Échap ne fait pas Échap. La boucle interactive de `handleSpeechSetup` (setup-cli.ts ~l.274) ignore le retour de `await component.pick()` — le picker renvoie pourtant `false` sur annulation. Résultat : ESC → le flow continue → `ensure()` télécharge automatiquement le modèle configuré. Annuler doit = passer au composant suivant, sans assignation ni téléchargement.
2. Aucune visibilité de l'étape courante pendant le picking : pas de titre STT/TTS annoncé avant le picker (« Preparing… » n'apparaît qu'après).
3. Crash avec un rôle cloud. `resolveLocalSpeechModelId` fait `throw new Error("No local model is available for the ${role} role.")` quand `modelRoles.dictation` (ou `speech`) résout un modèle cloud — touche déjà `openai/whisper-1`, `openrouter/…`, sans rapport avec le codex.

## Design à porter (vocabulaire rôle, pas registry)

Reprendre l'ancienne PR en ré-exprimant sur le vocabulaire de main (`modelRoles.dictation` / `modelRoles.speech`), dans cet ordre :

1. Échap = Échap : `const selected = await component.pick(); if (!selected) continue;`
2. Titre de l'étape : chaque composant annonce le step (STT / TTS) avant son picker.
3. `SpeechComponent.requiresLocalDeps(): boolean` sur l'interface — un composant cloud n'entre PAS du tout dans le check flow (`checkComponents = components.filter(c => c.requiresLocalDeps())`), au lieu de guards `undefined` éparpillés par appel. Fix le bug 3 pour STT et TTS.
4. `resolveLocalSpeechModelId(role, ...)` : prendre le primaire de la chaîne (`resolveRoleChain(...)[0]?.model`) ; primaire cloud → `undefined` = « rien à installer localement ». Ne PAS scanner les fallbacks (sinon on télécharge parakeet alors que l'utilisateur a choisi un modèle cloud). C'est le point le plus profond de l'ancien design : « quel artefact local ce rôle utilise-t-il » devient une question sur le choix effectif, pas sur l'inventaire.
5. Status/isReady cloud : `"cloud transcription model — no local download"` / `ready: true` (déjà validé en smoke sur la branche codex avant revert).
6. Picker : inchangé pour les modèles locaux ; `current` peut être vide quand le rôle est cloud (pas de présélection).

## Procédure

1. Charger `skill://fork-workflow` (+ `references/pr-workflow.md`).
2. Worktree depuis la branche codex :
   ```bash
   git worktree add -b omp/pr--setup-speech-cloud .worktrees/pr--setup-speech-cloud omp/pr--openai-codex-stt-v2
   cd .worktrees/pr--setup-speech-cloud && bun install
   # copier les natives .node depuis le checkout principal (voir T2), stub
   # node_modules/axe-core si besoin de lancer cli.ts en direct
   ```
3. Implémenter le design ci-dessus dans `packages/coding-agent/src/cli/setup-cli.ts`.
4. Écrire `packages/coding-agent/test/cli/setup-speech.test.ts` (aucun test setup-speech n'existe sur main) :
   - dictation cloud → `--json` ready sans crash, sans appel downloader ;
   - dictation locale → comportement inchangé ;
   - pick annulé (mock `selectSetupModel` → null) → `ensure` PAS appelé.
   S'inspirer du pattern de `test/stt-cloud.test.ts` (beginSettingsTest, registry stub).
5. Smoke interactif (PTY) : vérifier Échap saute bien le composant ; `--json` avec `dictation: openai-codex/transcribe` + `OPENAI_CODEX_OAUTH_TOKEN` (`HOME=$T PI_CONFIG_DIR=.omptest`, config dans `$T/.omptest/agent/config.yml` — env exact validé en T2).

## Tests

```bash
bun check
bun test packages/coding-agent/test/cli/setup-speech.test.ts
bun test packages/coding-agent/test/stt-cloud.test.ts   # non-régression
```

## Garde-fous

Aucun push, aucune action GitHub, ne pas toucher `kml93`/`main`/autres worktrees ; aucun commit sans validation kml93.

## Livrable

Branche `omp/pr--setup-speech-cloud` dans le worktree, tests verts, non commitée. Rapport : diff, décision sémantique primaire-vs-fallback, résultat du smoke Échap. Description PR : corrige le crash préexistant pour tous les modèles cloud (whisper-1 inclus), pas seulement codex, + rend Échap fonctionnel dans le wizard.
