# Brief: repo rules (who reviews what)

Read this to know how pull requests (PRs) get approved in this repo, why, and what it costs.
Written 2026-11-12 by Design-system-builder-Sonnet5.5-agent. Owner: `@pyfork`.

## In one line

The owner reviews risky files only. Every other PR merges on three green checks with no review.

## Intent

Before this change, `.github/CODEOWNERS` was `* @pyfork` ("The owner reviews every file"), and the
`protect main` ruleset has `require_code_owner_review: true`. So every PR waited for the owner,
including a one-line config. Nothing records why: it arrived in PR #1 as a default.

The intent now: put the owner's attention where a mistake could switch off a safety check, and let
the machines judge everything else. A typo in a doc and a change to a CI workflow are not the same
risk, so they no longer get the same review.

## The rule

| Kind | Touches | Who | Merge |
|---|---|---|---|
| Risky | any path in [`docs-public/guard-data/risk-map.txt`](docs-public/guard-data/risk-map.txt) | Owner reviews and merges | Owner merges by hand |
| Routine | anything else | Nobody | `gh pr merge <n> --auto --squash` once `rebuild`, `pages` and `screens` are green |

A PR with even one risky path is risky.

## Risky paths

| Path | Why it is risky |
|---|---|
| `/.github/` | Workflows run with the repo token. A change here can disable a check or loosen this very rule. `CODEOWNERS` lives here. |
| `/tests/` | A looser test passes anything. |
| `/tools/` | Builds the pages and checks the build. It could hide a mismatch. |
| `/playwright.config.mjs`, `/playwright.screens.config.mjs` | Test settings, such as the pixel tolerance and timeouts. |
| `/docs-public/guard-data/` | The risk map itself. Editing it moves the line. |
| `/README-brief-repo-rules.md` | This brief. It states the rule, so changing it should be seen. |

Not risky, so routine: `src/`, the built `heavy-light-*.html`, `docs-public/*.md`, `README.md`, `art/`,
`diagrams/`, fonts and icons.

## How it is enforced

1. `.github/CODEOWNERS` lists only the risky paths. GitHub asks the code owner only for those. A path
   with no owner needs no review (the ruleset requires 0 approvals beyond code owners).
2. `docs-public/guard-data/risk-map.txt` is the same list, for people and scripts (the `csc` alias reads
   it). The two files must stay identical.
3. The ruleset `protect main` is unchanged: three required checks (`rebuild`, `pages`, `screens`),
   squash only, no force push, no delete, branch must be up to date.
4. Auto-merge and delete-branch-on-merge are on, so a merged branch deletes itself.

## Pros

- Routine PRs need no human. The owner reviews roughly the few PRs that matter.
- The review effort goes to the files that guard everything else.
- The rule is written down and readable by a person, a script and the code-owner system alike.
- One owner approval is still needed for this change itself, since it edits `.github/`.

## Cons and risks

- A routine PR can change how the pages look and merge unseen, if `screens` is turned informational
  (open PR #4). While `screens` is required and red on a look change, the owner's `looks-ok` label
  still gates look changes. Do not merge PR #4 without deciding that.
- Two files must agree. If `CODEOWNERS` and `risk-map.txt` drift, the script and GitHub will disagree
  about what is risky. Change both in the same PR.
- `src/hl-ui.js` and `src/hl.js` ship to users. They are routine here because `pages` and `rebuild`
  test them, but a bug those tests don't cover can merge unreviewed.
- Path rules miss intent. A harmless-looking file can be risky, and a risky path can hold a harmless
  edit. The owner can always review a routine PR by hand.
- New top-level folders are routine until added to the list. Add risky ones on creation.

## Not changed here

The `protect main` ruleset, repo settings, secrets, and the `screens` / `pages` / `rebuild` workflows.

## Undo

Restore `* @pyfork` in `.github/CODEOWNERS` and delete `docs-public/guard-data/risk-map.txt`. That is the
old rule exactly.

## How to reference this

Say "read README-brief-repo-rules.md". PR number and commit SHA are in the PR that added it.
