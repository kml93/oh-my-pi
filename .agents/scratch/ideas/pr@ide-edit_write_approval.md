# Feature: Inspect and Revise OMP Edits Directly in the IDE

## Core Intent (The True Need)

When OMP prompts for approval to modify files, I want to inspect the proposed changes in MY IDE as diff tabs (left = before, right = after), edit the right pane directly inside the IDE, save, and approve directly FROM the IDE. OMP then executes MY revised version of the edited files.

## Exact Scope

- Limited strictly to `edit` and `write` tools.
- Only when interactive approval is required ("ask-approval" mode: OMP renders its Approve/Deny prompt in the terminal).
- Outside this scope (yolo, auto-approved, headless mode without UI): native OMP behavior remains strictly untouched; we handle nothing.

## Current Problem

1. Only the terminal Approve/Deny dialog can respond. An extension can observe, but cannot reply.
2. The payload received by an extension is encoded in the active edit mode format — unreadable on the extension side without extensive parsing machinery.

## The MAJOR Constraint: Edit Modes (Must Be Solved at the Root)

OMP supports 5 edit modes: `hashline` (default), `replace`, `patch`, `apply_patch`, and `sloppy`. Each mode represents a distinct format. In `hashline`, A SINGLE request can combine modifying multiple files, deleting files (`REM` op), and renaming files (`MV` op).

**Absolute Rule: The extension must NEVER know about or parse these edit modes.**

**Decomposition Directive:** Internally, OMP ALREADY decomposes every request into individual files with their operation nature (content change / deletion / rename) and their before/after states — this is the exact mechanism driving live TUI previews and the approval screen (see `waitForToolApprovalPreview` in the tool wrapper and EditSession preview batches). The hook must expose THIS pre-computed decomposition, filtered:
- One IDE tab per file with a REAL content change (modification or creation).
- NOTHING for deletions or renames: no tab, as this creates unnecessary noise — these operations remain visible in the standard TUI approval prompt and simply execute as part of the approved request.

## Revision Semantics (Strict Compliance Required)

The extension returns ONLY the final text of files that the user actually edited. OMP executes the original request with those substituted contents: unedited files (and structural operations like renames/deletions) execute AS-IS. No silent drop of operations.

## Architectural Questions to Settle BEFORE Coding

1. **Unified API?** Can we provide a simple API for the extension: receiving `{ files: [{ path, before, after }] }` (content changes only) and returning `{ files: [{ path, finalContent }] }` (only edited files)? The extension remains trivial: display + return.
2. **Snapshot Tag / Hash Staleness.** OMP anchors file reads and edits using snapshot tags `[file#TAG]` (content hash). Following a revised edit, the tag known to the model is stale. Ensure the result of the revised edit carries a FRESH tag (the snapshot store can issue one) — otherwise the model fails or is forced to re-read everything.
3. **Hook Location & Race Conditions.** Identify the precise hook location (the approval gate in the tool wrapper) and handle the race between IDE and TUI responses: the TUI dialog is ALWAYS open in ask-approval; the first response wins; the other dismisses immediately; late extension responses are rejected (return `false`); abort unlocks everything even if an extension handler is blocked.
4. **Dismissal Notification.** When the response originates from the TUI (not the IDE), the extension must receive a resolution event to close its open tabs.

## Security Constraints (Non-Negotiable)

- Returned content is VALIDATED against the tool schema, and EACH edited file is re-checked against approval policy (an extension must not slip in an unreviewed file).
- Paths remain in the model's coordinate space (relative to cwd when residing inside it).
- Provider safety checks (e.g. computer tool) remain exclusive to UI.

## PR Breakdown

- **PR on OMP side only**: The hook (exposed decomposition + response API), race handling, validation, resolution notification, tests (multiple modes, mixed modify+delete+rename request, fresh tag, abort, TUI response closes tabs), and documentation. Minimal: maximize reuse of existing machinery, zero duplication, no re-invention.
- **IDE Extension is OUT OF SCOPE for PR**: It lives in personal user config, remaining simple and completely agnostic of edit modes.

## Target Behavior (Acceptance Criteria)

1. `edit`/`write` in ask-approval mode → one IDE tab per file with MODIFIED CONTENT. Nothing for deletions/renames.
2. User edits the right pane, saves, and approves in the IDE → OMP executes the user's version for those files; all remaining operations in the request execute as-is.
3. The TUI Approve/Deny dialog stays open in parallel; whichever responds first (IDE or TUI) dismisses the other instantly.
4. If answered via TUI → the extension is notified and closes its diff tabs.
5. Functions identically across all configured edit modes without any extension-side modifications.
6. The resulting tool output presented to the model carries a fresh snapshot tag.
7. Outside ask-approval or in headless mode → native OMP behavior is completely unchanged.
