# Domain Docs

Use a single context for this repository.

## Before exploring

- Read `.agents/CONTEXT.md` for terms relevant to the work.
- Read relevant ADRs under `.agents/docs/adr/`.

If these files do not exist, proceed without creating them upfront. Create domain docs when terms or decisions are actually resolved.

## Layout

- `.agents/CONTEXT.md`: repository-wide glossary and domain model.
- `.agents/docs/adr/`: decisions affecting the repository.

## Naming

Single home for every file-naming rule (Issues, PRs, ADRs, Drafts).

- Grammar: `@` separates top-level fields, `_` joins words inside the slug, `.` precedes the locale (`en`/`fr`). Numbers are zero-padded to 4 digits (`0003`, `0001`).
- Issues: `<number>@<slug_snake>.<locale>.md` in `.agents/issues/` — number = GitHub issue number.
- PRs: `<number>@<dest>@<slug_snake>.<locale>.md` in `.agents/prs/`, `<dest>` = `omp` (upstream can1357) or `kml93` (fork-local) — number = GitHub PR number.
- Drafts (issues/PRs only): `draft@<slug_snake>.<locale>.md`, renamed with the number discovered at publication.
- ADRs: `<number>@<slug_snake>.<locale>.md` in `.agents/docs/adr/`, bilingual twins, no draft state — the FR file is written with its final number as soon as the decision is resolved (IDE review and edits happen on it), the EN twin only after approval. The writing agent assigns the number: scan the highest existing, +1; never reuse, never renumber.
- Slugs: mechanical, never invented. Algorithm: take the file's H1 up to its first comma, colon, em dash, or opening parenthesis; slugify (lowercase ASCII, strip diacritics, non-alphanumeric runs → `_`, collapse repeats, trim); truncate at 48 chars on a word boundary; strip leading/trailing stopwords (fixed list: `le la les l d de des du un une en et ou pour pas si a an the and or of for in on not to with`). Each language mirror derives from its own-language H1; the number is the reference linking the twins. One rule for issues, PRs, and ADRs.

Use the glossary's terms in issue titles, proposals and tests. Flag any conflict with an existing ADR instead of silently overriding it.
