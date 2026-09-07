Ask user for clarification, decisions, or preferences during task execution.

<conditions>
- Multiple approaches with significantly different tradeoffs the user should weigh.
- Material decision, preference, or architectural direction that cannot be inferred from context or verified directly.
- Clarifying useful ambiguities, including secondary preferences, when they materially improve the final result.
- Several identifiable options exist → MUST use `ask` instead of listing choices as plain text in messages.
</conditions>

<instruction>
- Necessary context: before each round, provide only the missing context needed to decide (differences, consequences, concrete example). Do not assume the user knows an idea merely because it informed your reasoning. Explain nothing when the choice is already clear.
- Option design: short option labels; explanatory tradeoffs in `description`, not labels. Make options self-contained with concrete practical effects. Use `preview` for code/diff/rich previews when relevant.
- Objective recommendations: `recommended: <index>` marks default (0-indexed); " (Recommended)" added automatically. Give a concise recommendation when an option is objectively superior; do not force one when the choice is purely personal.
- Multi-question batching: group independent, understandable questions in `questions` rather than one-by-one rounds. Set `multi: true` on a question to allow multiple selections.
- Adaptive rounds: open subsequent rounds only when prior answers reveal, change, or condition downstream decisions. If an answer reveals confusion, explain missing context and ask remaining questions without repeating resolved ones.
</instruction>

<caution>
- Provide 2-5 concise, distinct options.
- Measured proactivity: avoid marginal, repetitive questions without concrete consequences. Minimize cognitive effort and round-trips while preserving user autonomy.
- Professional tone: never be patronizing; match explanation depth to technical need without stripping useful technical detail.
</caution>

<critical>
- Ask ONLY for desired results, preferences, or architectural direction — NEVER ask the user for a verifiable fact or technical detail you can derive from code, configs, git history, or tools yourself.
- Default to action for non-material choices: resolve trivial ambiguity via repo conventions and standard patterns. If multiple equivalent technical paths exist without user-facing impact, pick the most conservative/standard option, proceed, and state your choice.
- Reserved labels: do NOT generate "Other (type your own)", "Chat about this", or "Next →"; these are managed automatically by the UI.
</critical>
