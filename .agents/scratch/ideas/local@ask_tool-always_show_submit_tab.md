# Always Show Submit Tab in Ask Tool

Status: DORMANT idea (fork-local kml93, 2026-09-05)
Owner: kml93
Context: Interactive questionnaire experience on fork branch `kml93`

## Problem

In upstream OMP (`packages/coding-agent/src/modes/components/ask-dialog.ts`), questionnaires with only one single-choice question skip the final Submit tab entirely:
```ts
#hasSubmitTab(): boolean {
  return this.#questions.length > 1 || this.#questions.some(question => question.multi);
}
```
When `questions.length === 1 && !question.multi`, pressing Enter on an option immediately calls `#finishSubmit()`, closing the dialog and sending the answer.

This creates several issues on the `kml93` fork:
1. **No review step**: The user cannot review their choice or cancel before the answer is locked in.
2. **Blocks global remarks**: If the Submit tab includes a global remarks field (see `pr@ask_tool-submit_tab_global_remarks.md`), single-question questionnaires prevent the user from ever accessing that remarks input.
3. **Inconsistent interaction model**: Multi-question dialogs transition through an explicit review and confirmation step, while single-question dialogs trigger instant submission on selection.

Upstream OMP (`can1357`) prioritizes minimal keystrokes for quick single-question prompts. Therefore, enforcing a persistent Submit tab is a fork-specific customization for `kml93`.

## Proposal

On the `kml93` branch, always display the Submit/Review tab regardless of question count.

## Semantics & Scope

- In a 1-question dialog:
  - Selecting an option with Enter marks the answer and moves navigation to the Submit tab (`#submitTabIndex()`) instead of immediately closing.
  - On the Submit tab, the user can review their answer summary, attach a general remark, or navigate back (`Tab` / `Shift+Tab` / arrow keys) to change their selection.
  - Pressing Enter on the Submit tab finalizes and submits the result.
- Dialogs with 2+ questions continue their existing tabbed navigation behavior into the Submit tab.

## Implementation Notes (~30-50 lines)

### 1. Tab Bar & Height Determination (`packages/coding-agent/src/modes/components/ask-dialog.ts`)
- In `#hasSubmitTab()`: return `true` unconditionally (or guard with a fork setting `ask.alwaysShowSubmitTab = true`).
- In `#dialogHeight` and `#measureHeight`: ensure layout calculation always accounts for `tabBarRows = 1`.

### 2. Navigation Flow
- In `#advanceAfterQuestion()`:
  - Replace `if (this.#questions.length === 1) { this.#finishSubmit(); return; }` with a transition to `#submitTabIndex()`.
- Update prompt footer action label: display `Enter next` (or `Enter review`) instead of `Enter submit` when on question 1.

## Trigger to Implement

Apply directly onto branch `kml93` when integrating the global remarks feature or when accidental single-question submissions need to be prevented.
