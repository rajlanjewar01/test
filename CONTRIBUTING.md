# Contributing

## Branches

| Branch                  | Purpose                                                        | Created from | Merged into                      |
| ----------------------- | -------------------------------------------------------------- | ------------ | -------------------------------- |
| `feature/STORY-ID-name` | One story, for example `feature/E4-02-page-sizes`              | `develop`    | `develop`                        |
| `hotfix/TICKET-name`    | Urgent production fix, for example `hotfix/BD-123-login-error` | `main`       | `main`, then `uat` and `develop` |
| `develop`               | Integration branch (default)                                   | n/a          | `uat`                            |
| `uat`                   | Acceptance testing                                             | `develop`    | `main`                           |
| `main`                  | Production                                                     | `uat`        | n/a                              |

Names are lowercase kebab-case after the ID. CI rejects other names.

## Merge strategy

| Into      | Method       | Why                                 |
| --------- | ------------ | ----------------------------------- |
| `develop` | Squash merge | One conventional commit per story   |
| `uat`     | Merge commit | Keeps the history of each promotion |
| `main`    | Merge commit | Keeps the history of each release   |

Rebase merging is disabled. Direct pushes to `develop`, `uat` and `main` are not allowed:
every change goes through a pull request with review and the required **CI passed** check.

## Day to day

1. `git switch develop && git pull`
2. `git switch -c feature/E4-02-page-sizes`
3. Commit with Conventional Commits, for example `feat(api): add page size validation`.
4. `npm run check` before you push.
5. Open a PR into `develop`. The PR title must be a Conventional Commit because it becomes the
   squash commit message. Fill in the PR template.
6. After approval and a green **CI passed**, squash-merge. The branch is deleted automatically.

## Promotion

- `develop` to `uat`: open a PR with head `develop` and base `uat`, titled
  `chore(release): promote develop to uat`. Merge with a merge commit.
- `uat` to `main`: open a PR with head `uat` and base `main`, titled
  `chore(release): promote uat to main`. Merge with a merge commit.

## Hotfix

1. `git switch main && git pull && git switch -c hotfix/BD-123-login-error`
2. Fix it, with a test, and open a PR into `main`. Merge with a merge commit after review.
3. Back-merge: open PRs from the same hotfix branch into `uat` (merge commit) and into
   `develop` (squash). GitHub deletes the head branch after the first merge, so use
   **Restore branch** on the merged PR to open the back-merge PRs.
4. Do not leave `uat` or `develop` without the fix: a hotfix is finished only after both
   back-merges are merged.

## Reviews

- Code owners (see `.github/CODEOWNERS`) review every PR. At least one approval is required, and
  approvals are dismissed when new commits are pushed. Conversations must be resolved.
- A solo maintainer either uses a second reviewer account, or applies the settings with
  `--bypass`, which lets a repository admin merge a PR without approval but never push directly.

## Applying the repository settings

The branch protection and repository settings are code. Preview and apply them with the
GitHub CLI (`gh auth login`, admin rights):

```bash
node scripts/apply-github-settings.mjs --dry-run
node scripts/apply-github-settings.mjs --repo OWNER/bigdaddy --bypass
```

The script is safe to run again: it updates the rulesets by name.
