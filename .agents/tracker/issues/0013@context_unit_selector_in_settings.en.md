# Context Unit selector in /settings: preview, docs, changelog

## Parent

#11 (spec: Status line context unit)

## What to build

The user opens `/settings` › Appearance tab › Status Line group and sees a "Context Unit" selector with "Percent" / "Tokens" options. Browsing the options live-previews the status line — same pattern as the neighboring settings (preset, separator, context line) — and cancelling restores the prior state. The selection persists and applies immediately in-session, without a restart.

Completes the delivery: a row in the settings reference table, a mention in the custom status line paragraph (the `context_pct` segment's content depends on the metric), and a changelog `[Unreleased]` › `Added` entry. The single upstream PR (branch `omp:pr--*` from `main`) carries this ticket and the core ticket; the approval gates (contributor sentence + explicit go before push/PR) are described in parent #11.

## Acceptance criteria

- [ ] "Context Unit" selector visible in Appearance › Status Line, options "Percent" / "Tokens", selection persisted.
- [ ] Live status line preview while browsing the options; restored on cancel.
- [ ] Change applied immediately in-session, without a restart.
- [ ] Settings reference table documents the key; the custom status line paragraph mentions the metric-dependent content.
- [ ] Changelog `[Unreleased]` › `Added` entry written.
- [ ] `bun check` and status line test suites green.

## Blocked by

The core ticket #12 (gauge/chip/footer) — the selector and preview expose a setting that must exist and render.
