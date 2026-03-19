Process a task end-to-end using the full agent pipeline.

Arguments: $ARGUMENTS (the task description)

## Workflow

1. **Read context** — load `.claude/context/project.md`, `architecture.md`, `conventions.md`

2. **Classify** — determine which agents are needed:
   - If the task requires design decisions → run Architect first
   - If the task requires implementation → run Coder
   - If code was written → run Reviewer at the end

3. **Architect phase** (skip if pure implementation):
   - Load `.claude/agents/architect.md`
   - Produce a design spec for the task
   - Ask the user to confirm before proceeding if the design involves significant structural changes

4. **Coder phase**:
   - Load `.claude/agents/coder.md`
   - Implement based on the spec (or directly if no design phase)
   - Read every file before editing it

5. **Reviewer phase** (always runs):
   - Load `.claude/agents/reviewer.md`
   - Review the changes made in this session
   - Report findings grouped by severity

6. **Update context**:
   - Update `architecture.md` with any new ADRs
   - Update `conventions.md` with any new patterns
   - Update `project.md` status if the project phase changed
