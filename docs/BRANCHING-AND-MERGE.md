# Branching and merge strategy (youtextme)

North Star: **main is always shippable**; every open PR is either mergeable this week or closed.

## Branch names

| Kind | Pattern | Example |
|------|---------|---------|
| Cursor / Cloud agent | `cursor/<short-slug>-<4hex>` | `cursor/helio-evening-activity-72c3` |
| Human feature | `feat/<short-slug>` | `feat/whatsapp-connector` |
| Fix | `fix/<short-slug>` | `fix/gumroad-payout-docs` |
| Docs / playbook | `docs/<short-slug>` | `docs/branching-merge` |
| Devin (legacy) | prefer `cursor/…` going forward | avoid `devin/<epoch>-…` |

Rules:
- Lowercase only; hyphens; no spaces.
- One outcome / one job per branch.
- Never reuse a branch after merge (delete remote branch on merge).
- Cloud agents: append the session suffix when required (`-781f` style).

## When to open a PR

1. Branch from latest `main`.
2. Keep the PR focused (one outcome). Prefer squash merge.
3. Ready (non-draft) only when CI is green and the outcome is evaluable.
4. Draft = WIP; do not pile drafts older than ~14 days without a rebase plan.

## Merge method

| Change type | Method |
|-------------|--------|
| Feature / docs / agent work | **Squash** (default) |
| Pure revert or already-clean single commit | Rebase merge OK |
| Release / multi-author integration | Merge commit only if history must be preserved |

Delete the head branch on merge.

## Parallel PRs (same repo)

1. Prefer **non-overlapping paths**. If two PRs touch the same file (especially evolve logs), merge the higher-priority one first, then rebase the other.
2. Never land two ready PRs that both edit the same hot file without a planned order.
3. After each merge: `git fetch origin main && git rebase origin/main` on remaining open branches.

## Conflict / stale triage

| State | Action |
|-------|--------|
| Ready + CI green + MERGEABLE | Squash-merge same day |
| Ready + CONFLICTING | Rebase onto `main` within 48h or close |
| Draft + CONFLICTING + superseded by `main` | Close with reason; reopen fresh if needed |
| Draft + still valuable | Leave open; comment `needs-rebase`; refresh weekly |

Do **not** force-merge dirty PRs. Extract unique files onto a new `cursor/<slug>-xxxx` branch from current `main` when the old branch history is tangled.

## PR hygiene checklist

- [ ] Title describes the outcome, not the tool
- [ ] Body: what changed, how to verify, kill criteria if outcome-based
- [ ] CI green
- [ ] No secrets
- [ ] Branch deleted after merge

## Agent rule of thumb

Ship through PRs on shared repos. Direct-to-`main` only when the Cloud New Project flow explicitly says so for that empty repo.
