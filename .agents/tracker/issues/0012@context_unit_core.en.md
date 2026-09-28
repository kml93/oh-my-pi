# Context unit core: tokens on gauge, chip, and footer

## Parent

#11 (spec: Status line context unit)

## What to build

No UI yet: the user sets `statusLine.contextMetric: tokens` in their config (file or CLI) and all three context display surfaces swap the percentage for used tokens — same shape, same placement:

- embedded gauge: `── 45K ──── 200K ──` instead of `── 22% ──── 200K ──`;
- `context_pct` segment chip: `45K/200K` instead of `22.5%/200K`;
- footer stats line: same swap.

The default `percentage` leaves all three surfaces strictly identical to today's rendering. Numbers go through the repo's shared formatter (`743`, `4.5K`, `45K`, `1.2M`). One complete pass: status line schema value list (TUI) → settings-schema entry (coding-agent) → existing setting propagation → context usage formatter → gauge/segments/footer → tests.

## Acceptance criteria

- [ ] Default `percentage`: gauge, chip, and footer render identically to the pre-change behavior (regression guard on all three surfaces).
- [ ] `tokens` mode: gauge left label = used tokens via the shared formatter; right (window) label unchanged; >100% overflow keeps its placement and error color.
- [ ] `tokens` mode: chip shows `45K/200K`; unknown window shows `45K/?`.
- [ ] Footer swapped identically, reading the same settings source.
- [ ] Startup placeholder mirrors the current percentage behavior.
- [ ] Setting validated as an enum (`percentage` | `tokens`), default `percentage`, settable via config file.
- [ ] Threshold colors and gauge fill unchanged in both modes.
- [ ] Status line component and footer test suites green; `bun check` clean.

## Blocked by

None (can start immediately).
