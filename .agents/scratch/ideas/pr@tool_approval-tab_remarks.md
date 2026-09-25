# Add User Remarks on TAB during Tool Approval Prompts

Status: DORMANT idea (upstream-PR candidate, 2026-09-05)
Owner: kml93
Context: Inspired by `$XDG_CONFIG_HOME/pi/extensions/modes/` (`gate.ts`, `ui.ts`)

## Problem

In upstream OMP (`packages/coding-agent/src/extensibility/extensions/wrapper.ts`), when a tool call requires user confirmation (e.g. under `approvalMode: "always-ask"`, `approvalMode: "write"`, or via explicit `tools.approval.<tool>: prompt` rules), the prompt presents a rigid binary choice: `Approve` or `Deny` via `uiContext.select(prompt, ["Approve", "Deny"])`.

1. If the user approves, they cannot provide steering notes or attach boundaries (e.g. "Approved, but do not touch file X"). The agent executes without knowing user constraints.
2. If the user denies, the agent receives an uninformative error: `Tool call denied by user: <tool>`. The model must guess why it was rejected, often leading to repeated identical attempts or unnecessary follow-up chat turns.

## Proposal

Allow pressing `TAB` during the tool approval prompt to enter an inline remark/comment before submitting `Approve` or `Deny`.

## Semantics & Scope

- **On Approve with comment**: The comment is appended to the tool execution result (e.g. `\n\nUser comment: <comment>`), giving the model direct guidance alongside the tool output.
- **On Deny with comment**: The denial error message incorporates the user's comment (e.g. `Tool call denied by user: <tool> (comment: <comment>)`), allowing the model to immediately understand the rejection reason and pick an alternative action.
- If no comment is entered, standard approval/denial behavior remains completely unchanged.

## Implementation Notes

### 1. UI Approval Gate (`packages/coding-agent/src/extensibility/extensions/wrapper.ts`)
- Replace the bare `uiContext.select(safetyPrompt, ["Approve", "Deny"])` call with an approval component or interactive selector supporting a comment input buffer.
- When `Key.tab` is pressed, toggle an inline `Input` component for comment editing (mirroring `confirmGate` in `pi/extensions/modes/ui.ts`).

### 2. Result & Error Propagation
- On denial with comment: format error message as `Tool call denied by user: ${this.tool.name}: ${comment}`.
- On approval with comment: pass comment to `emitToolResult` to append to the content block:
  ```ts
  content: [...result.content, { type: "text", text: `\n\nUser comment: ${comment}` }]
  ```

### 3. Reference Implementation
- Pi mode gate: `$XDG_CONFIG_HOME/pi/extensions/modes/gate.ts` and `ui.ts`.

## Trigger to Implement

Open a dedicated branch `omp:pr--tool-approval-tab-remarks` off `main` when manual interventions during tool approvals become a frequent friction point.
