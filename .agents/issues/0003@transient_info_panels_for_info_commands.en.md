# Transient info panels for info commands (`/context`, `/hotkeys`, `/tools`, `/memory`, `/jobs`, `/ssh`)

## Problem Statement

Every invocation of `/context` (and the other info commands of the same family) appends a permanent block into the chat transcript. Run several times in a row, they bury the conversation and pollute history. `/session info` already has the desired behavior: a focused panel that replaces itself and leaves no trace.

## Solution

Info commands open a *transient info panel* (the `/session info` idiom): anchored above the editor, captures focus, ↑/↓ scrolls, Esc closes, snapshot at open, replaced on each new invocation, zero transcript residue. `SessionInfoOverlay` is generalized (parameterized title, Text or Markdown content) and reused everywhere. Each panel exposes one unbound key action (`defaultKeys: []`). Fullscreen overlays stay reserved for interactive hubs and dashboards; ACP text output is unchanged. Decision recorded in `.agents/docs/adr/0001@info_commands_render_in_transient_panels.en.md`; vocabulary in `.agents/CONTEXT.md`.

## User Stories

1. As a user, `/context` opens a panel instead of stacking a chat block.
2. A new invocation replaces the existing panel — never two at once.
3. Esc closes the panel and returns focus to the editor.
4. ↑/↓ scrolls when content exceeds the screen.
5. Content is a snapshot at open time (no live refresh).
6. `/hotkeys` shows the keyboard shortcut reference in this panel.
7. `/tools` shows the tools visible to the agent, same panel.
8. `/memory view` shows the injected memory payload, same panel.
9. `/memory stats` shows memory statistics, same panel.
10. `/jobs` shows background jobs, same panel.
11. `/ssh list` and `/ssh help` show hosts/help, same panel.
12. I can map a key to `app.context.show` via my keybindings config.
13. Same for `app.hotkeys.show`, `app.tools.show`, `app.memory.view`, `app.memory.stats`, `app.jobs.show`.
14. No default key is assigned to any of them (nothing intrusive).
15. Markdown is rendered in the panels that carry markdown content.
16. ACP clients keep receiving the current text output — no regression.
17. `/usage`, `/settings`, `/agents` keep their fullscreen overlays (unchanged).
18. `/changelog`, `/mcp*`, `/advisor*` keep transcript blocks (deliberate exclusion).

## Implementation Decisions

- Generalize `SessionInfoOverlay` (`packages/tui/src/overlays/session-info-overlay.ts`): title + Text|Markdown content, reused by all conversions.
- A shared presenter on the coding-agent side destroys the previous panel before opening a new one (the `showSessionInfo`/`#hideSessionInfo` pattern, `interactive-mode.ts:6089`).
- Key actions declared in `packages/tui/src/app-keybindings.ts` with `defaultKeys: []` (precedent `app.approval.cycle`), wired like `app.agents.hub` (`input-controller.ts:707`).
- Conversions: `/context` (`command-controller.ts:699`), `/hotkeys` (:688), `/tools` (:691), `/memory view` (:721) + `/memory stats` (showMarkdownPanel), `/jobs` (:590), `/ssh list` + `/ssh help` (`helpers/ssh.ts`).
- Snapshot semantics: no live subscription; close and reopen to refresh (consistent with `/session info`).
- Single PR (user decision).

## Out of Scope

- `/changelog`, `/mcp*`, `/advisor*` conversions.
- Live-updating panels.
- ACP text paths.

## Verification

In the interactive TUI: run `/context` repeatedly and confirm a single self-replacing panel with no transcript residue; Esc returns focus to the editor; ↑/↓ scrolls long payloads (`/hotkeys`, `/memory view`); markdown renders; mapped custom keys open `app.*.show` panels while defaults bind nothing; ACP output for the converted commands is byte-identical to before.

Target: upstream OMP PR, branch from `main`, tracked in this fork repository.
