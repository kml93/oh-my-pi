# Transient info panels for info commands

## What

I often use `/context` and similar commands to follow what the agent is doing, but their permanent output makes the chat unusable: the blocks pile up in history, and during an agent turn, after just two or three commands nothing is visible until it finishes. The chat should stay focused on the conversation, not on noise — this PR shows these commands in a transient panel, modeled on `/session info`.

Info commands (`/context`, `/hotkeys`, `/tools`, `/memory view`, `/memory stats`, `/jobs`, `/session info`, `/ssh list`, `/ssh help`) now open a focused transient panel above the editor instead of appending permanent transcript blocks:

- `SessionInfoOverlay` generalized and renamed to `InfoPanelOverlay` (parameterized title, Text or Markdown content) and reused everywhere.
- A single `showInfoPanel` presenter on `InteractiveMode` destroys the previous panel before opening a new one — never two at once, zero transcript residue.
- Panels are snapshots at open time; ↑/↓ scrolls, Esc closes and returns focus to the editor.
- Six keybinding actions with no default keys: `app.context.show`, `app.hotkeys.show`, `app.tools.show`, `app.memory.view`, `app.memory.stats`, `app.jobs.show`.
- ACP text output is unchanged; `/usage`, `/settings`, `/agents` keep their fullscreen overlays; `/changelog`, `/mcp*`, `/advisor*` keep transcript blocks.

## Why

Every invocation appended a permanent block into the chat transcript. Run several times in a row, they bury the conversation and pollute history; worse, deferred command output during a streaming turn stacks preview panels until nothing else is visible (#4806 mechanism). The `/session info` panel already had the desired behavior; this PR generalizes that idiom to the whole family.

## Testing

- `bun run check:ts`, `bun run lint:ts`, `bun run check:tools` pass.
- Full TS test suite passes (only pre-existing machine-specific failures remain, reproduced identically on clean `main`: Kitty placeholder PNG conversion, VS Code URL percent-encoding of `@` in the checkout path).
- Interactive TUI smoke, exercised end to end: `/context` run twice → single self-replacing panel, no transcript residue; Esc closes and returns focus to the editor; ↑/↓ scrolls long Markdown payloads (`/hotkeys`, `/memory stats` render tables); `/jobs`, `/ssh list`, `/tools`, `/session info` panels verified.
- Tests: `InfoPanelOverlay` (title + Markdown case), input-controller keybinding wiring (mapped key opens the panel, defaults bind nothing), and a `handleToolsCommand` zero-residue test across a streaming turn.

---

- [x] `bun check` passes
- [x] Tested locally
- [ ] CHANGELOG updated with the required attribution (if user-facing; internal issue fixes use issue links, external contributions add the PR link and contributor credit after creation)
