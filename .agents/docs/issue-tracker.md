# Issue tracker: GitHub

CLI Base: `gh issue <action> [<num>] -R kml93/oh-my-pi [flags]` (issues are strictly fork-local).
PR Target: `-R <kml93|can1357>/oh-my-pi` (`can1357` for upstream `omp`, `kml93` for fork-local).

## Conventions

- Never use shell heredocs (avoids backtick/variable expansion).
- Query (`view|list`): `<num> --comments` (view; fetch labels) | `--state open --json number,title,body,labels,comments` (list; filter as needed).
- Mutate (`create|comment|edit|close`): `--title "..." --body-file <file>` (create) | `<num> --body "..."` (comment) | `<num> --add-label|--remove-label "..."` (edit) | `<num> --comment "..."` (close).
- Guardrail: Before creating an issue or posting a comment, show the target repo and proposed text, then obtain user confirmation (`AGENTS.md`).

## Local mirror protocol

Drafts/mirrors live in `tracker/{issues,prs}/` per `domain.md`. Pipeline:

1. Draft FR (`draft@...fr.md`) for IDE review
2. User approval (mandatory before proceeding; nothing published without review)
3. Mirror EN (`draft@...en.md`) translation
4. Publish (`gh ... --body-file <file>.en.md`)
5. Promote (`draft` → assigned GitHub number in both file names)

## Triage

- PRs in triage queue: `no` (PRs do not enter the triage queue).

## Skill bindings & Wayfinding

- Hooks: "publish to the issue tracker" (create issue via mirror protocol above, after confirmation), "fetch the relevant ticket" (`gh issue view <num> --comments`).
- Bare `/implement`: browse open issues via questionnaire (small pages: number, goal, triage status; choose or request next page). Read ticket & clarify missing requirements before implementing. If none open, ask for spec/ticket.
- Wayfinding:
  - Map: one issue labelled `wayfinder:map` (body: `Notes`, `Decisions-so-far`, `Fog`).
  - Child: GitHub sub-issue (`wayfinder:research|prototype|grilling|task`; fallback: task list in map, `Part of #<map>` in child body).
  - Dependencies: blocker DB ID (fallback: `Blocked by: #<num>` in child body).
  - Frontier: first open unassigned child in map order with no open blocker.
  - Claim & Resolve: claim (`gh issue edit <num> --add-assignee @me`) → resolve (comment with answer, close child, link context in map).
