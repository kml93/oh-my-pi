# Feature Porting Guide (from `pi` to `omp`)

## Architectural Differences to Account For

| Domain | `pi` (`earendil-works/pi`) | `omp` (`can1357/oh-my-pi`) |
| :--- | :--- | :--- |
| **Language Runtime** | Pure TypeScript / Bun / Node | Hybrid TypeScript + Native Rust (`crates/`) |
| **Tools Format** | Standard unified diff `edit`, `find`, `ls` | `hashline` (anchored patches), `read` with selectors, `glob` |
| **Subagents / Orchestration** | Basic RPC / Session backends | Multi-agent runtime (`task`, `hub`, `dap`, `collab`) |
| **Structure** | `core/`, `modes/interactive/components/` | Modular directories in `packages/coding-agent/src/` |

## Porting Rules

1. **Native Integration over Artificial Shims**:
   - Place ported logic directly in the corresponding `omp` subsystem (`src/tools/`, `src/prompts/`, `src/modes/`, etc.).
   - Do not wrap in fragile compat namespaces unless isolating third-party extension compatibility.
2. **Type Alignment**:
   - Adapt `pi` type definitions (`@earendil-works/pi-*`) to `omp` equivalents (`@oh-my-pi/*`).
3. **Atomic Commits**:
   - One self-contained commit per ported module or feature:
     `port(pi): import html session exporter from v0.84.3`

## Porting Workflow

1. Fetch PI and create a worktree from `kml93`:
   ```bash
   git fetch upstream-pi
   git worktree add -b pi/port--<feature-name> .worktrees/pi-port--<feature-name> kml93
   ```
2. Inspect source without merging PI history:
   ```bash
   git show upstream-pi/main:<path/to/file>
   ```
3. Adapt the code into the corresponding OMP subsystem.
4. Verify imports, types, and runtime:
   ```bash
   bun packages/coding-agent/src/cli.ts --version
   bun dev
   ```
5. Commit, then integrate from the primary `kml93` checkout:
   ```bash
   git add -A
   git commit -m "port(pi): integrate <feature-name>"
   git -C <primary-checkout> merge pi/port--<feature-name>
   git -C <primary-checkout> push origin kml93
   git worktree remove .worktrees/pi-port--<feature-name>
   git branch -d pi/port--<feature-name>
   ```
