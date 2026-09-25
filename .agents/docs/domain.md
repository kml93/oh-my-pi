# Domain Docs

Single repository context.

## Rules

- Read `.agents/CONTEXT.md` (glossary) and relevant ADRs in `.agents/docs/adr/` before exploring. If missing, proceed without creating them upfront.
- Lazy creation: create domain docs only when terms or decisions are resolved, never upfront.
- Conflict guard: flag any conflict with an existing ADR instead of silently overriding it.
- Terminology: use glossary terms in issue titles, proposals, and tests.

## Layout

- `.agents/CONTEXT.md`: glossary & domain model.
- `.agents/docs/`: governance (`domain.md`, `issue-tracker.md`, `triage-labels.md`) & `adr/` (decisions).
- `.agents/tracker/`: GitHub mirrors & drafts (`issues/`, `prs/`).
- `.agents/scratch/`: ephemeral workspace (`handoffs/` deleted post-use, `spikes/`, `ideas/`).

## Naming (single home for all naming rules)

- Grammar: `@` field separator, `-` PR target, `_` in slug, `.` locale (`en`/`fr`). 4-digit zero-padded Numbers (`0001`).
- Issues: `<number>@<slug_snake>.<locale>.md` — number = GitHub issue number.
- PRs: `<number>@<target>-<slug_snake>.<locale>.md` — number = GitHub PR number (`<target>`: `omp` upstream can1357, `kml93` fork-local).
- Drafts (issues/PRs): `draft@...` replaces `<number>` in Issue/PR pattern, renamed with assigned number at publication.
- Handoffs: `<slug_snake>.<locale>.md` — content only, no process narration; rules/skills stay out (deleted once superseded by a published spec/issue/PR — never kept until the work is done).
- ADRs: `<number>@<slug_snake>.<locale>.md` — bilingual twins, no draft state. FR written directly with next ID (scan max + 1, no reuse/renumber) for IDE review & edits; EN on approval.
- Slugs: from H1 before punctuation (`:,-()—`), slugified (lowercase ASCII, strip diacritics, `_`).
