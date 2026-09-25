# Ticket — Separate PR: cloud-tolerant speech setup + working Escape

## Context

- Repo: `/home/kml93/.config/local/opt/kml93@oh-my-pi` (primary checkout on `kml93`, do not work there).
- Required base: the `omp/pr--openai-codex-stt-v2` branch (worktree `.worktrees/pr--openai-codex-stt`), as validated by kml93 — NOT main alone. Reason: the driver is the Codex cloud dictation introduced by that PR; the `openai-codex/transcribe` model must exist to test the setup end to end. If the codex PR gets merged into main in the meantime, rebase onto main.
- `omp setup speech` = the installation wizard for local speech artifacts (STT parakeet/whisper weights, TTS kokoro). Cloud providers have nothing to download there (credentials = `omp login`, out of scope).
- Design source: the old PR `origin/omp/pr--openai-codex-stt` (`git diff $(git merge-base origin/omp/pr--openai-codex-stt main) origin/omp/pr--openai-codex-stt -- packages/coding-agent/src/cli/setup-cli.ts`).

## Targeted bugs (current main)

1. Escape does not escape. The interactive loop of `handleSpeechSetup` (setup-cli.ts ~l.274) ignores the `await component.pick()` return — the picker returns `false` on cancel. Result: ESC → the flow continues → `ensure()` automatically downloads the configured model. Cancel must mean move to the next component, without assignment or download.
2. No visibility of the current step while picking: no STT/TTS title announced before the picker ("Preparing…" only appears afterwards).
3. Crash with a cloud role. `resolveLocalSpeechModelId` throws `Error("No local model is available for the ${role} role.")` when `modelRoles.dictation` (or `speech`) resolves to a cloud model — this already hits `openai/whisper-1`, `openrouter/…`, unrelated to codex.

## Design to port (role vocabulary, not registry)

Port the old PR, re-expressed with main's vocabulary (`modelRoles.dictation` / `modelRoles.speech`), in this order:

1. Escape = Escape: `const selected = await component.pick(); if (!selected) continue;`
2. Step title: each component announces its step (STT / TTS) before its picker.
3. `SpeechComponent.requiresLocalDeps(): boolean` on the interface — a cloud component does NOT enter the check flow at all (`checkComponents = components.filter(c => c.requiresLocalDeps())`), instead of scattered `undefined` guards per call. Fixes bug 3 for both STT and TTS.
4. `resolveLocalSpeechModelId(role, ...)`: take the primary of the chain (`resolveRoleChain(...)[0]?.model`); a cloud primary → `undefined` = "nothing to install locally". Do NOT scan the fallbacks (otherwise parakeet gets downloaded even though the user picked a cloud model). Deepest point of the old design: "which local artifact does this role use" becomes a question about the actual choice, not the inventory.
5. Cloud status/isReady: `"cloud transcription model — no local download"` / `ready: true` (already smoke-validated on the codex branch before revert).
6. Picker: unchanged for local models; `current` may be empty when the role is cloud (no preselection).

## Procedure

1. Load `skill://fork-workflow` (+ `references/pr-workflow.md`).
2. Worktree from the codex branch:
   ```bash
   git worktree add -b omp/pr--setup-speech-cloud .worktrees/pr--setup-speech-cloud omp/pr--openai-codex-stt-v2
   cd .worktrees/pr--setup-speech-cloud && bun install
   # copy the .node natives from the main checkout (see T2), stub
   # node_modules/axe-core if you need to run cli.ts directly
   ```
3. Implement the design above in `packages/coding-agent/src/cli/setup-cli.ts`.
4. Write `packages/coding-agent/test/cli/setup-speech.test.ts` (no setup-speech test exists on main):
   - cloud dictation → `--json` ready without crash, without downloader call;
   - local dictation → unchanged behavior;
   - cancelled pick (mock `selectSetupModel` → null) → `ensure` NOT called.
   Follow the pattern of `test/stt-cloud.test.ts` (beginSettingsTest, registry stub).
5. Interactive smoke (PTY): check Escape skips the component; `--json` with `dictation: openai-codex/transcribe` + `OPENAI_CODEX_OAUTH_TOKEN` (`HOME=$T PI_CONFIG_DIR=.omptest`, config in `$T/.omptest/agent/config.yml` — exact env validated in T2).

## Tests

```bash
bun check
bun test packages/coding-agent/test/cli/setup-speech.test.ts
bun test packages/coding-agent/test/stt-cloud.test.ts   # non-regression
```

## Guardrails

No push, no GitHub action, do not touch `kml93`/`main`/other worktrees; no commit without kml93 validation.

## Deliverable

Branch `omp/pr--setup-speech-cloud` in the worktree, green tests, not committed. Report: diff, primary-vs-fallback semantic decision, Escape smoke result. PR description: fixes the pre-existing crash for all cloud models (whisper-1 included), not only codex, + makes Escape work in the wizard.
