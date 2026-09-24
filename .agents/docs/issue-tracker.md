# Issue tracker: GitHub

Issues and specs for this fork live in `kml93/oh-my-pi` GitHub Issues. Use `gh` with `-R kml93/oh-my-pi` for issue and PR operations, regardless of the current branch or remote.

## Conventions

- Create: `gh issue create -R kml93/oh-my-pi --title "..." --body-file <file>`. Never a shell heredoc — heredocs execute backticks and mutilate the body.
- Read: `gh issue view <number> -R kml93/oh-my-pi --comments`; fetch labels too.
- List: `gh issue list -R kml93/oh-my-pi --state open --json number,title,body,labels,comments` with suitable filters.
- Comment: `gh issue comment <number> -R kml93/oh-my-pi --body "..."`.
- Label: `gh issue edit <number> -R kml93/oh-my-pi --add-label "..."` or `--remove-label "..."`.
- Close: `gh issue close <number> -R kml93/oh-my-pi --comment "..."`.

Before creating an issue or posting a GitHub comment, show the target and proposed text and obtain user confirmation, as required by `AGENTS.md`.

## Language and local mirror protocol

- Every issue or PR is first written as a French draft file (`draft@<slug_snake>.fr.md`) for direct IDE review; nothing is published without explicit approval. ADRs have no draft state — their flow lives in `.agents/docs/domain.md` (§ Naming).
- After approval: write the English version, then publish the issue/PR with the English body only, via `--body-file` pointing at the `.en.md` mirror file.
- Local mirrors: `.agents/issues/` (issues) and `.agents/prs/` (PRs), one file per language.
- File naming for mirrors and drafts: see `.agents/docs/domain.md` (§ Naming).
- Publication order: FR draft → approval → EN draft → publish → rename both files with the discovered number.

## Pull requests as a triage surface

**PRs as a request surface: no.** Set this to `yes` only if external PRs should enter the triage queue. GitHub shares issue and PR numbers: for a bare number, try `gh pr view <number> -R kml93/oh-my-pi`, then `gh issue view <number> -R kml93/oh-my-pi`.

## Skill operations

- "Publish to the issue tracker": create an issue on `kml93/oh-my-pi`, after confirmation.
- "Fetch the relevant ticket": read the issue on `kml93/oh-my-pi`.
- Bare `/implement`: browse all open issues in small pages through the interactive questionnaire, showing each ticket’s number, goal, and triage status. Let the user choose or request the next page; read the chosen ticket and clarify missing requirements before implementing. If none are open, ask for a spec or ticket.

## Wayfinding operations

- Map: one issue labelled `wayfinder:map`, with Notes, Decisions-so-far and Fog in its body.
- Child: a GitHub sub-issue of the map; if unavailable, use a task list in the map and `Part of #<map>` in the child's body. Label it `wayfinder:<type>` (`research`, `prototype`, `grilling`, or `task`).
- Blocking: use GitHub issue dependencies, with the blocker's numeric database ID. If unavailable, add `Blocked by: #<n>` to the child body.
- Frontier: first open, unassigned child in map order with no open blocker.
- Claim: `gh issue edit <number> -R kml93/oh-my-pi --add-assignee @me`.
- Resolve: comment with the answer, close the child, then add a context pointer to the map.
