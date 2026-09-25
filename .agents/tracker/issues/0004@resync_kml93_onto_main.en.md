# Resync kml93 onto main via the conflicted upstream PRs

## Problem Statement

kml93 is ~280 commits behind `main` (242 at handoff + 38 since, tip `ba344f5e69`). A direct merge conflicts on 6 files, caused by 3 fork PRs still OPEN upstream (can1357) but already merged early into kml93. On top of that, `main` merged its own STT implementation that overlaps one of those PRs: a naive merge would silently drop either the upstream fix or the fork's global dictation routing.

## Solution

Re-run the 3 PR-branch merges targeting the `main` tip at execution time (immediate re-fetch before relaunch; `ba344f5e69` as of spec day) — the worktrees hold the raw auto-merge state with no manual resolution in place, so relaunching costs ≈ 0 — resolve conflicts in each branch with a minimal diff, then assemble kml93 (`main` first, then each branch), verify, and push last. The STT overlap is reconciled semantically: upstream's refactored controller becomes the shared base, upstream's hold-Space gesture stays untouched, and the fork's dictation router re-expresses itself on top AND extends its global hotkey to single-line fields (including the `/btw` follow-up) — made possible by the standardized dictation surface upstream just gave those components.

## User Stories

1. As the fork maintainer, I want kml93 updated with every upstream commit (the `main` tip at execution time — re-fetch before relaunching), so that I get all of `main`'s fixes and features.
2. As the fork maintainer, I want conflicts resolved in the PR branches rather than in kml93, so that my integration branch never carries resolution noise belonging to open PRs.
3. As the fork maintainer, I want the 3 merges relaunched against the `main` tip at execution time, so that the PR branches and kml93 end up 100% up to date (the 38 commits known at spec day touch none of the conflict zones; any newer tip is checked the same way before proceeding).
4. As the fork maintainer, I want the Codex STT backend PR resynced first, so that the transcription conflict is settled before the overlapping routing one.
5. As the fork maintainer, I want the global STT routing PR resynced second, so that its resolution builds on the already-resynced backend.
6. As the fork maintainer, I want the file-mention line-ranges PR resynced independently, so that it progresses in parallel without STT entanglement.
7. As the fork maintainer, I want `main`'s refactors (settings registry, internal URLs, path utilities) recognized as upstream-owned, so that my resolutions re-express fork changes on top of them instead of reverting them.
8. As the fork maintainer, I want upstream's refactored STT controller as the shared base, so that the hold-Space gesture and the global hotkey share a single underlying engine.
9. As the fork maintainer, I want upstream's hold-Space gesture untouched (main input field + `/btw` follow-up), so that can1357 has nothing to re-review and approval stays easy.
10. As the fork maintainer, I want the `app.stt.toggle` global hotkey extended to single-line fields in THIS sync — the `/btw` follow-up field becomes a declared router target — so that my dictation covers every text field without exception, in a single resync PR.
11. As the fork maintainer, I want the coexistence of the two triggers and the scope extension documented in the PR body, so that upstream reviewers understand what coexists, why, and what the PR adds.
12. As the fork maintainer, I want the fork-only fixup on the STT cloud test signature folded into the global routing PR, so that the PR is self-contained.
13. As the fork maintainer, I want the removal of the fork's legacy STT registry kept fork-local, so that the upstream PR diff stays minimal.
14. As the fork maintainer, I want conflicts on generated catalog files resolved by the dedicated fixer script, so that the bundled catalog stays deterministic with no hand-edit drift.
15. As the fork maintainer, I want the standard test suite (minus Rust compilation) validated on each resynced branch before merging into kml93, so that a broken PR never reaches my integration branch.
16. As the fork maintainer, I want the assembly verified by the type gate and the standard test suite (minus Rust), so that the assembled fork is provably sound on the agent side.
17. As the fork maintainer, I want to personally verify dictation in the real TUI after assembly (main field, `/btw` follow-up, ask prompts), so that I validate the final behavior of the two merged mechanisms.
18. As the fork maintainer, I want pushes done last (PR branches then kml93, `main` included), so that nothing public moves before everything is verified locally.
19. As the upstream maintainer, I want resynced PR branches with a minimal diff against their reviewed state, so that I only re-review the conflict resolution and the announced scope extension.
20. As the upstream maintainer, I want the STT reconciliation explained in the PR description, so that I understand the relationship between the two STTs before merging.
21. As a fork user, I want dictation via the mapped global hotkey (`app.stt.toggle`) in the main field, ask prompts, the extension editor, overlays AND the `/btw` follow-up, so that I can dictate wherever I type.
22. As a fork user, I want hold-Space working in the main input field and the `/btw` follow-up, so that the quick gesture stays available without configuration.
23. As a fork user, I want transcription to keep going through my Codex subscription backend, so that dictation needs no extra API key.
24. As a fork user, I want dictation previews visible in the field while I speak in streaming transcription, and the text delivered as a block on stop in one-shot transcription, so that I get mode-appropriate feedback without duplication.
25. As a fork user, I want the mic icon visible at the cursor of the field receiving dictation — main field and single-line fields alike (including the `/btw` follow-up), via the hotkey or the gesture — so that I always know recording is active.
26. As a fork user, I want file-mention line ranges intact after the sync, so that my existing mention syntax keeps resolving.
27. As the autonomous agent running the sync, I want a deterministic branch order and explicit conflict-ownership rules, so that assembly requires no improvisation.

## Implementation Decisions

- Relaunch the 3 merges against the `main` tip at execution time (immediate re-fetch before relaunch; `ba344f5e69` as of spec day): the worktrees hold the raw auto-merge state (no manual resolution), and the 38 commits known at spec day touch none of the conflict zones — abort + relaunch costs ≈ 0. If the tip moved again at execution time, check the delta's touched files against the conflict zones before proceeding. Local `main` branch updated immediately; `main` pushed with everything else, at the very end.
- Resync PR branches first, never resolve in kml93. Order: Codex STT backend (#12853) then global routing (#13169, STT-controller overlap); file-mentions (#10623) parallelizable. kml93 assembly: `main` first, then each branch; push last — PR branches then kml93.
- STT reconciliation (the call): the shared base is upstream's refactored STT controller (start/stop split, per-capture callbacks, preview-in-value fix). The fork's router re-expresses itself on that base: the `app.stt.toggle` hotkey (global input listener, transcript to the focused declared text field on stop, focus-change tracking, main-field draft fallback) is EXTENDED to single-line fields — target resolution accepts any component exposing the standardized dictation surface (multi-line AND single-line fields), and the `/btw` follow-up field is declared as a target. User decision: extension lands in THIS sync. Upstream's hold-Space gesture stays untouched in its scope (main field + `/btw` follow-up). Coexistence documented in the PR body: two triggers, one engine.
- Mic indicator: the cursor mic icon (the glyph upstream standardized and made measurable) shows in the field receiving dictation while recording — main field and single-line fields, via the hotkey or the gesture — fixing the absence observed in single-line fields (no visual feedback while recording).
- Extension context: the routing PR sits on a base predating upstream's commit that gave single-line fields the dictation surface (a 24-hour race — hence the conflicts, and hence the resync as the natural vehicle for the extension). Triggering is centralized (one global listener); target declaration remains per component (each panel exposes its text field).
- Cross-conflict ownership at assembly: routing → the global routing PR wins; transcription backend → the Codex backend PR wins; gesture/previews/component dictation surfaces → upstream wins.
- Refactor attribution: `main` rewrote the interactive mode (settings registry, internal URLs) and the path utilities — not the fork PRs. Resync resolutions re-express fork changes on top of the upstream refactor, never the reverse.
- Issue #2 (STT v2 spec): keep open and linked to the global routing PR; close the day the PRs merge upstream.
- Fork-only fixups: fold the STT cloud test signature fixup into the global routing PR; the legacy STT registry removal (path utilities) stays fork-local, settled at assembly.
- Generated catalog files (compiled compat rules, model catalog): conflicts resolved by the dedicated catalog fixer script — never by hand, never by regeneration (non-deterministic, network-dependent).
- Merge only — no rebase of the public PR branches; assembly commit in the `sync(omp): …` format.

## Testing Decisions

- A good test here asserts externally observable behavior, not implementation detail: the global hotkey's transcript lands in the focused field (main field, ask, extension editor, overlays, AND the `/btw` follow-up); hold-Space triggers dictation in the main field and the `/btw` follow-up; transcription goes through the Codex backend; dictation previews stay inside the field's value (streaming: volatile preview; one-shot: text as a block on stop); the mic icon appears at the receiving field's cursor while recording, single-line fields included; file-mention line ranges keep resolving.
- Standard suite minus Rust compilation: on each resynced PR branch (before merging into kml93) and on the kml93 assembly — monorepo type gate + standard JS test suite. No Rust compilation in this sync.
- Prior art: the coding-agent package's existing STT suite (controller, submit trigger, cloud, preflight), existing TUI tests (overlay focus, ask dialogs, editor), the file-mention line-range tests of PR #10623, the catalog-fixer precedent in the fork workflow.
- The real-TUI dictation pass after assembly is explicitly the maintainer's responsibility, not the agent's (manual test: main field, `/btw` follow-up, ask prompts).

## Out of Scope

- Replacing or removing upstream's hold-Space gesture (untouchable — maintainer decision, confirmed). Extending the gesture beyond the main field + `/btw` follow-up (ask/overlays) is deferred to a separate future PR.
- Rebasing the public PRs (merge only).
- Resyncing the other fork branches (approval-hotkeys, ide-edit-approval…): unaffected by the conflicts.
- New STT features beyond the reconciliation and the hotkey extension to single-line fields; reworking the upstream transcription backend.
- Upstream merge decisions for the PRs (can1357); tracking upstream-pi.
- Rust compilation in verification; manual TUI pass (maintainer).
- Changelog updates (forbidden unless explicitly requested).

## Further Notes

- Handoff-time gap: 242 commits, `main` = `6204b75080`, kml93 = `14e93bdce7`. Since: 38 more upstream commits (tip `ba344f5e69`), none touching the conflict zones (empty grep across STT/interactive mode/path utilities/catalog); the primary checkout advanced by one chore commit (tracker folder reorg), no impact.
- 6 conflicting files spread over 3 OPEN upstream PRs merged early into kml93: generated catalog ×2 + STT cloud test (backend PR); interactive mode + STT controller (routing PR); path utilities (file-mentions PR).
- STT race: the routing PR's base is 2026-09-24 (`ef1ea204bc`); upstream's commit giving single-line fields the dictation surface (`9e479ac12f`, 2026-09-23, merged into main after that base) is not contained in it — the two efforts crossed without coordination, which explains both the conflicts and the extension the sync enables.
- Router mechanics (code-confirmed): the old `app.stt.toggle` wiring targeted only the main field; the PR replaces it with a global listener + resolution of the declared focused text field (fallback: main-field draft with a status message), with per-panel declaration (ask, advisors, agents hub, plan review, hook editor… wired in the PR).
- `/btw` behavior (code-confirmed): an ephemeral side question (brief answer, no tools, outside the main history); bare `/btw` opens the BTW History hub; follow-up (`f` key, empty editor) opens a single-line field in the hub — the field upstream's commit wires to hold-Space and the resync will declare to the router.
- Issue #2 is currently OPEN with the `ready-for-agent` label; the link to the global routing PR remains to be materialized.
- Vocabulary (multi-line/single-line field, dictation, upstream) recorded in `.agents/CONTEXT.md`.
- Reference procedure: the fork workflow's sync guide (in-flight PR resync, scripted catalog fix).

Target: local fork branches + kml93 assembly; issue strictly fork-local (kml93/oh-my-pi).
