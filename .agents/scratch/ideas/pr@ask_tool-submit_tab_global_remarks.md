# Global Remarks Input in Ask Tool Submit Tab

Status: DORMANT idea (upstream-PR candidate, 2026-09-05)
Owner: kml93
Context: Inspired by `$XDG_CONFIG_HOME/pi/extensions/tools/questionnaire/` (`dialog.ts`, `core.ts`, `schema.ts`)

## Problem

In upstream OMP (`packages/coding-agent/src/modes/components/ask-dialog.ts`), the `ask` tool dialog allows answering individual questions, including custom free-text notes per question (`n note` / "Type something...").

However, the final Submit tab (`#renderSubmitBody`) only renders:
1. A summary recap of the questions and answers.
2. A single cursor item: `Submit answers`.

There is no field for entering an overarching, general remark that applies to the entire questionnaire or provides global project guidance. When users have global feedback, they are forced to wait for the dialog to close and then send a separate follow-up prompt in chat.

In contrast, Pi's questionnaire dialog (`~/.config/pi/extensions/tools/questionnaire/dialog.ts`) provides a dedicated action on the final Submit tab: `1. Add a general remark unrelated to a specific question`, followed by `2. Submit answers`.

## Proposal

Add a global remarks action to the Submit tab of `AskDialog` in OMP upstream, allowing the operator to provide high-level notes before submitting.

## Semantics & Scope

- On the Submit tab, the user can navigate to the "General remark" row (or press a dedicated shortcut like `r` or `1`) to open an inline editor.
- Once entered, the remark preview is displayed on the Submit tab right above the `Submit answers` row.
- When submitted:
  - The remark is returned as an optional `remarks?: string` field in the dialog result and the `ask` tool execution outcome.
  - The text output shown to the model includes the remark:
    ```
    1. Scope: Full refactor
    2. Tests: Add unit tests
    Remarks: Please make sure not to break existing exports in index.ts
    ```
- If no remark is typed, behavior remains identical to today's summary submit.

## Implementation Notes

### 1. Dialog Component (`packages/coding-agent/src/modes/components/ask-dialog.ts`)
- Add `#remarks: string = ""` state to `AskDialog`.
- In `#renderSubmitBody(width, rows)`:
  - Add two selectable actions on the Submit tab instead of just one:
    1. Remark action (e.g. `1. Add a general remark unrelated to a specific question` or displaying current remark if non-empty).
    2. `Submit answers` action.
- When Enter is pressed on the remark action, open an `Input` overlay to edit `#remarks`.
- Return `remarks: this.#remarks || undefined` in `#finishSubmit()`.

### 2. Ask Tool Definition (`packages/coding-agent/src/tools/ask.ts`)
- Include `remarks` in `AskDialogResultItem` or as a top-level property on the tool result.
- Append `\nRemarks: ${remarks}` to the formatted markdown response returned to the model.

### 3. Prompt Documentation (`packages/coding-agent/src/prompts/tools/ask.md`)
- Note in the tool description that the user may attach an overall remark upon submission.

## Trigger to Implement

Open a dedicated branch `omp:pr--ask-global-remarks` off `main` when coordinating questionnaires with global instructions requires too many follow-up chat messages.
