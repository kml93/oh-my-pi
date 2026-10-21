# Route dictation to the focused text field via global input listener

## Summary

This PR enables global speech-to-text routing via the `app.stt.toggle` keybinding, directing dictation into whichever text field currently holds keyboard focus across the entire TUI. Recording seamlessly survives dialog transitions, delivering the completed transcript to the field focused when recording ends (or gracefully falling back to the composer draft if no text field is focused).

### Two Triggers, One Engine

Dictation now supports two coexisting input triggers powered by a unified `STTController`:
1. **Push-to-Talk Gesture (hold-Space)**: Upstream space-bar hold gesture with direct per-segment commit policy (`start(editor, options)`).
2. **Global STT Key (`app.stt.toggle`)**: Global router target with volatile preview and one-shot block delivery on stop (`start(resolveEditor, fallbackEditor, options)`).

Both triggers share the same underlying speech-to-text engine and preflight lifecycle without conflicting.

### Extensions in this Sync

- **Standardized Single-Line Dictation Target**: Widened `TUI.getFocusedTextEditor()` and `submitFocusedTextEditor()` target resolution to accept any component exposing the standardized dictation surface (`setVolatileText`, `commitVolatileText`, `clearVolatileText`, `deleteBeforeCursor`, `submit`), enabling single-line `Input` fields alongside multi-line `Editor` components.
- **BTW History Hub Follow-Up Target**: Declared the single-line follow-up input in `BtwHistoryPanel` as a router target for the global shortcut (`app.stt.toggle`).
- **Receiving Cursor Feedback**: Bound `MicCursor` rendering to the actively receiving field across both triggers (global toggle and push-to-talk gesture alike). Fixed a feedback omission in single-line `Input` components where cursor overrides were previously suppressed when not at end-of-text.
- **Volatile Previews & Clean Delivery**: Kept streaming previews volatile inside the field value, delivering the final text as an undoable single block on stop with zero duplication between preview and committed text.

Ref: kml93/oh-my-pi#2
