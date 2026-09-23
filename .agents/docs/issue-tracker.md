# Issue tracker: GitHub

Issues and specs for this fork live in `kml93/oh-my-pi` GitHub Issues. Use `gh` with `-R kml93/oh-my-pi` for issue and PR operations, regardless of the current branch or remote.

## Conventions

- Create: `gh issue create -R kml93/oh-my-pi --title "..." --body "..."`. Use a heredoc for multiline bodies.
- Read: `gh issue view <number> -R kml93/oh-my-pi --comments`; fetch labels too.
- List: `gh issue list -R kml93/oh-my-pi --state open --json number,title,body,labels,comments` with suitable filters.
- Comment: `gh issue comment <number> -R kml93/oh-my-pi --body "..."`.
- Label: `gh issue edit <number> -R kml93/oh-my-pi --add-label "..."` or `--remove-label "..."`.
- Close: `gh issue close <number> -R kml93/oh-my-pi --comment "..."`.

Before creating an issue or posting a GitHub comment, show the target and proposed text and obtain user confirmation, as required by `AGENTS.md`.

## Pull requests as a triage surface

**PRs as a request surface: no.** Set this to `yes` only if external PRs should enter the triage queue. GitHub shares issue and PR numbers: for a bare number, try `gh pr view <number> -R kml93/oh-my-pi`, then `gh issue view <number> -R kml93/oh-my-pi`.

## Skill operations

- "Publish to the issue tracker": create an issue on `kml93/oh-my-pi`, after confirmation.
- "Fetch the relevant ticket": read the issue on `kml93/oh-my-pi`.

## Wayfinding operations

- Map: one issue labelled `wayfinder:map`, with Notes, Decisions-so-far and Fog in its body.
- Child: a GitHub sub-issue of the map; if unavailable, use a task list in the map and `Part of #<map>` in the child's body. Label it `wayfinder:<type>` (`research`, `prototype`, `grilling`, or `task`).
- Blocking: use GitHub issue dependencies, with the blocker's numeric database ID. If unavailable, add `Blocked by: #<n>` to the child body.
- Frontier: first open, unassigned child in map order with no open blocker.
- Claim: `gh issue edit <number> -R kml93/oh-my-pi --add-assignee @me`.
- Resolve: comment with the answer, close the child, then add a context pointer to the map.
