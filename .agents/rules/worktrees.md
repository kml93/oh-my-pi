---
alwaysApply: true
description: Keep repository worktrees under the local worktree directory.
trigger: always_on
---

# Worktree Location

- Create every Git worktree under `.worktrees/` in the primary repository checkout.
- Name the worktree directory after its branch purpose, for example `.worktrees/omp-pr--fix-name`.
- Never create repository worktrees as sibling directories outside the primary checkout.
