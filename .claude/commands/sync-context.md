Scan the current codebase and update all context files to reflect reality.

Arguments: $ARGUMENTS (optional focus area — e.g., "architecture only" or "conventions only")

## Workflow

1. Read the current state of all context files:
   - `.claude/context/project.md`
   - `.claude/context/architecture.md`
   - `.claude/context/conventions.md`

2. Scan the codebase:
   - Read the directory structure
   - Sample key files (entry points, config, main modules)
   - Check git log for recent changes: `git log --oneline -20`

3. For each context file, identify gaps or outdated information:
   - Is the tech stack still accurate?
   - Do the architectural decisions reflect the current code structure?
   - Are the conventions documented matching what the code actually does?

4. Propose updates:
   - Show the user what you'd change in each file
   - Ask for confirmation before writing

5. Apply confirmed updates and report what changed.
