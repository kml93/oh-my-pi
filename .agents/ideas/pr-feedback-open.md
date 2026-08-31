# Native `?feedback=open` filter for `pr://` URLs

Status: DORMANT idea (fork-local, 2026-08-31)
Owner: kml93
Replaces when shipped: `.agents/skills/fork-workflow/scripts/pr-feedback.ts` + its `SKILL.md` line

## Problem

`read pr://<owner>/<repo>/<n>` returns the full review history. After pushing a
fix, an agent re-reading the PR gets every superseded comment alongside the
actionable ones (~90 lines where ~5 matter), and snapshots taken before a push
miss new bot feedback entirely. Both failure modes observed on PR #10408.

## Proposal

Opt-in filter on the internal `pr://` URL reader, additive and default-neutral
(mirrors the existing `?state=` / `?comments=` params):

```
read pr://<owner>/<repo>/<n>?feedback=open
```

## Semantics — three drawers

GitHub review threads (GraphQL `pullRequest.reviewThreads`) carry two flags:

- `isResolved` — a human marked the thread resolved (authoritative "done").
- `isOutdated` — GitHub auto-marks threads whose target line moved on a later
  push (automatic, but does NOT assert the point was addressed).

The `open` view classifies:

1. resolved threads -> excluded (explicit human decision);
2. unresolved + current (`!isOutdated`) -> full body (the actionable part);
3. unresolved + outdated -> collapsed one-line count, not bodies (probably
   addressed by a later push, unconfirmed — hidden but discoverable).

Plus:

- reviews on the current head -> one line each; bot review bodies are
  boilerplate, the signal is inline;
- conversation comments -> kept (no thread/commit binding);
- everything else (metadata, files) unchanged.

## Implementation notes

- `isResolved` / `isOutdated` exist only on GraphQL review threads; the `pr://`
  reader already speaks GraphQL, so this is a query + renderer change.
- Default behavior stays exactly today's (`?feedback=all` implied).
- Checks/CI are out of scope: separate concern, separate param if ever needed.

## Trigger to implement

Open an `omp/pr--*` worktree from `main` when the head-only read pattern proves
annoying enough across a few more PR cycles, or when a second user hits it.
