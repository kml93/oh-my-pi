# Status line context unit: show used tokens instead of percentage

## Problem Statement

Context usage is displayed as a percentage on every status line surface: the `22%` label embedded in the border gauge (default embedded mode), the `22.5%/200K` chip (`context_pct` segment), and the footer stats line. A user who reasons in absolute token counts must mentally convert on every read. The used-token count is already computed internally (anchored estimate from the latest provider response) but never displayed.

## Solution

A single setting `statusLine.contextMetric` (enum `percentage` | `tokens`, default `percentage`) that swaps the percentage label for used tokens — same shape, same placement, across all three surfaces: the embedded gauge (`── 45K ──── 200K ──`), the `context_pct` segment chip (`45K/200K`), and the footer. The default `percentage` changes strictly nothing for existing users.

## User Stories

1. As an omp user, I want to display my used context tokens instead of a percentage, so that I can reason in absolute counts without mental conversion.
2. As an omp user, I want `percentage` to remain the default, so that my display does not change after an update.
3. As an omp user, I want a single setting driving all surfaces at once, so that I do not configure the gauge, the chip, and the footer separately.
4. As a `/settings` user, I want a "Context Unit" selector under Appearance › Status Line, so that I can flip the display without editing config files.
5. As a `/settings` user, I want a live preview while browsing the selector's options, so that I see the effect before committing — matching the neighboring status line settings.
6. As a box composer user (default config), I want the embedded gauge label to change from `22%` to `45K`, so that the surface I actually look at changes.
7. As a user of non-embedded context line modes, I want the `context_pct` chip to show `45K/200K`, so that the information follows the setting on my layout.
8. As a footer stats line user, I want the same swap there, so that all context displays stay consistent with each other.
9. As a user on a narrow terminal, I want the token label to keep the compact K/M abbreviation, so that the gauge does not overflow.
10. As a user at the very start of a session, I want a placeholder instead of a misleading number, so that I do not read `0K` as real usage.
11. As a user whose usage exceeds the window (switching to a smaller-window model), I want the overflow label in the error color at today's placement, so that the anomaly stays visible.
12. As a user whose provider omits context window metadata, I want `45K/?`, so that the missing data stays explicit.
13. As a user relying on threshold colors (normal/warning/purple/error), I want those colors unchanged in tokens mode, so that the signaling keeps its meaning.
14. As a custom preset user, I want the setting to be independent of segment composition, so that my `leftSegments`/`rightSegments` keep working unchanged.
15. As a user toggling the metric mid-session, I want the change applied immediately, without a restart.
16. As a settings documentation reader, I want the new key listed in the reference table, so that I can discover it without reading source code.
17. As the fork maintainer, I want this delivered as an upstream PR from main, so that no merge debt accrues on syncs.

## Implementation Decisions

- New setting `statusLine.contextMetric`: enum `["percentage", "tokens"]`, default `"percentage"`. UI under `/settings` › Appearance tab › Status Line group, label "Context Unit", options "Percent" / "Tokens", with a live status line preview following the existing pattern of neighboring settings (preset, separator, context line).
- The value list for the type lives in the status line schema module (TUI), like the other value lists of the family; the settings-schema entry (coding-agent) imports it and exposes the UI.
- The `contextMetric` field joins the status line settings type and flows through the existing propagation: every call site that forwards preset/segments/separator/contextLine today also forwards this field (status line host, interactive mode wiring, selector controller, and the preview path).
- The shared context usage formatter (used by the chip and the footer) takes the metric as a parameter: in `tokens` mode it renders `used/window` via the repo's shared number formatter; in `percentage` mode its current behavior is unchanged.
- Strict reuse of the existing number formatter: `743` → `743`, `9,000` → `4.5K`, `45,200` → `45K`, `1,200,000` → `1.2M`. No new formatter, no forced decimals.
- The embedded gauge's left label swaps from percentage to used tokens; the right (window) label stays; the >100% overflow case keeps today's placement and error color.
- The `context_pct` segment identifier stays unchanged (historical name; do not break existing configs); its content depends on the metric, and the docs mention this.
- Threshold colors and gauge fill stay derived from the internal percentage; only displayed labels change.
- Gauge embedding eligibility is unchanged (same conditions as today).
- Startup placeholder, unknown window (`?`), and post-compaction unknown-metric behavior mirror the current percentage behavior exactly.
- The footer reads the metric from the same status line settings source.
- Documentation: a row in the settings reference table plus a mention in the custom status line paragraph; a changelog `[Unreleased]` › `Added` entry (mandatory for a user-facing PR per repo rules).
- Delivery: an `omp:pr--*` branch cut from `main` (never from `kml93`), following the fork workflow.

## Testing Decisions

- A good test observes only external behavior: render the status line component with a settings snapshot and a fake session, then assert on visible strings (top border with the gauge, bar content) — never on internal helpers or source text.
- Existing seams only, no new seams:
  - the status line component render covers gauge + chip in one pass (highest seam available);
  - the footer component render covers the stats line.
- Prior art: the existing status line component suites asserting rendered top borders and effective settings, and the footer test rendering the component with a fake session.
- Cases covered: `percentage` default unchanged (regression guard on all three surfaces), `tokens` mode on the gauge, `tokens` mode on the chip, footer swap, startup placeholder, unknown window, >100% overflow.

## Out of Scope

- The `/context` panel and context report command: their formatting stays percentage-based.
- Per-segment or per-preset overrides of the metric: the setting is global, period.
- A new dedicated token status line segment (the cumulative `token_total` segment already exists for total session usage).
- Precision/decimal changes or a new number formatter.
- Renaming the `context_pct` segment identifier.
- Theme changes, threshold color changes, or gauge semantics changes.
- RPC/headless surfaces beyond what they naturally inherit from the shared formatter.

## Further Notes

- The displayed tokens are the internal anchored estimate from the latest provider response (the same number that feeds the percentage) — not a cumulative session counter.
- The gauge's numeric label only exists in embedded mode; other modes carry the information in the chip — both surfaces are covered.
- Before any push or PR creation: a contributor sentence in the contributor's own words (CONTRIBUTING requirement) and explicit user approval, both mandated by repo rules.
- Final render examples: gauge `── 45K ──── 200K ──`, chip `45K/200K`, footer likewise; unchanged default `── 22% ──── 200K ──` / `22.5%/200K`.
