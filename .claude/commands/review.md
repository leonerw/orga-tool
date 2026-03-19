Review recent or staged changes using the Reviewer agent.

Arguments: $ARGUMENTS (optional — specific files or a description of what to review; defaults to git diff)

## Workflow

1. Load `.claude/agents/reviewer.md`

2. Gather the diff:
   - If files are specified in $ARGUMENTS, read those files
   - Otherwise, run `git diff HEAD` to get all uncommitted changes
   - If nothing is staged/changed, run `git diff HEAD~1` to review the last commit

3. Load context:
   - `.claude/context/conventions.md` — check adherence
   - `.claude/context/architecture.md` — check consistency with decisions

4. Apply the Reviewer checklist (correctness, edge cases, security, conventions, complexity, tests)

5. Output findings grouped by [BLOCK] / [SUGGEST] / [NOTE]

6. Give a final verdict: APPROVE, APPROVE WITH SUGGESTIONS, or REQUEST CHANGES
