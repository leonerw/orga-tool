Debug a specific issue using the Debugger agent.

Arguments: $ARGUMENTS (describe the bug — error message, unexpected behavior, or reproduction steps)

## Workflow

1. Load `.claude/agents/debugger.md`

2. Gather information:
   - Parse the error message and stack trace from $ARGUMENTS
   - Identify the files most likely involved
   - Read those files

3. Hypothesize:
   - List 2–3 plausible root causes
   - Ask the user for any missing reproduction information before proceeding

4. Isolate:
   - Trace the execution path to find where the failure actually occurs
   - Identify the exact line/call that produces the wrong behavior

5. Fix:
   - Apply the minimal targeted fix
   - Do not refactor unrelated code

6. Report:
   - State the root cause in one sentence
   - Show the diff
   - Explain why the fix works
   - Note any follow-up items
