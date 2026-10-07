# Main-only agent execution

- Run all agent work on `main`.
- Never switch away from `main`.
- Never create Git branches.
- Never create Git worktrees by hand (`git worktree add`).
- Keep plans in the active worktree.

## Exception: supervisor worktrees

- A train may run beside other work in progress through `pnpm supervise worktree <dir>`, which creates one detached worktree per repository at `origin/main`. Commands then take `--root <dir>`.
- Work prepared there is still pushed to `main` (`HEAD:main`); no branch is created.
- Never remove a worktree unless the user asks.
