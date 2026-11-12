# Screens log

Every PR whose look changed (the `screens` compare step went red) and may merge unseen, because `screens`
is informational. One line each, added in the PR itself. The squash SHA on `main` is looked up from the
PR number. The workflow comments the exact line on the PR.

| PR | Head SHA | Run | Looks-ok by owner |
|---|---|---|---|
