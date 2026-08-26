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

## Step-by-Step Porting Workflow

1. Create temporary port branch:
   ```bash
   git checkout kml93
   git checkout -b pi/port--<feature-name>
   ```
2. Inspect source in `upstream-pi`:
   ```bash
   git show upstream-pi/main:<path/to/file>
   ```
3. Copy/adapt code into the appropriate `packages/coding-agent/src/` location.
4. Verify imports, types, and runtime:
   ```bash
   bun packages/coding-agent/src/cli.ts --version
   bun dev
   ```
5. Commit and merge into `kml93`:
   ```bash
   git add -A
   git commit -m "port(pi): integrate <feature-name>"
   git checkout kml93
   git merge pi/port--<feature-name>
   git branch -d pi/port--<feature-name>
   git push origin kml93
   ```
