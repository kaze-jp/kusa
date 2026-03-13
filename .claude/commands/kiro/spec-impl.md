# Start Implementation

Begin implementing approved tasks using TDD in an isolated worktree. This is the manual implementation command — for fully autonomous execution (implementation → PR → review → merge), use `/kiro:ao-run` instead.

## Usage

```
/kiro:spec-impl <feature-name> [task-numbers]
```

- `/kiro:spec-impl my-feature` — all pending tasks
- `/kiro:spec-impl my-feature 1.1` — single task
- `/kiro:spec-impl my-feature 1,2,3` — specific tasks

## Instructions

1. **Validate prerequisites**:
   - `.kiro/specs/$FEATURE_NAME/tasks.md` must exist. If not → `/kiro:spec-tasks` first.
   - `.kiro/specs/$FEATURE_NAME/design.md` must exist.
   - `.kiro/specs/$FEATURE_NAME/requirements.md` must exist.

2. **Read context**:
   - `.kiro/specs/$FEATURE_NAME/tasks.md` — task definitions, dependencies, `(P)` markers
   - `.kiro/specs/$FEATURE_NAME/design.md` — API contracts, data models, component design
   - `.ao/steering/tech.md` — coding standards, patterns
   - `.ao/steering/structure.md` — file placement conventions
   - `.ao/ao.yaml` — quality gate commands, git strategy

3. **Create worktree**:
   - Use `/superpowers:using-git-worktrees` to create an isolated worktree
   - Branch: `<git.branch_prefix><feature-name>`
   - All implementation happens in the worktree — never on the base branch

4. **Select tasks**:
   - If task numbers specified → execute those tasks only
   - Otherwise → execute all pending tasks (`- [ ]` in tasks.md)
   - Skip already completed tasks (`- [x]`)
   - Respect dependency ordering

5. **Execute each task with TDD** (invoke `/superpowers:test-driven-development`):

   For each task, follow Kent Beck's TDD cycle:

   - **RED**: Write a failing test that captures the acceptance criteria
   - **GREEN**: Write the minimum code to make the test pass
   - **REFACTOR**: Clean up while keeping tests green
   - **VERIFY**: Run quality gates from `ao.yaml` (typecheck, lint, test, build)
   - **MARK**: Update `tasks.md` checkbox from `- [ ]` to `- [x]`

6. **After each task**:
   - Run quality gates to catch regressions
   - Commit with task ID in message (e.g., `feat(feature): implement task 1.1`)
   - Update `tasks.md` status

7. **Handle failures**:
   - Use `/superpowers:systematic-debugging` for persistent test failures
   - If a task cannot be completed as designed, document the blocker
   - Do not proceed with dependent tasks until blockers are resolved

8. **On completion**, use `/superpowers:finishing-a-development-branch` to:
   - Verify all tests pass
   - Choose: merge locally, create PR, keep branch, or discard

## Output

- Implemented source files with tests (TDD)
- Updated `.kiro/specs/<feature-name>/tasks.md` with completion status

## Notes

- All work happens in a worktree — never commit directly to the base branch.
- Always follow the design document; do not improvise architectural decisions.
- If the design is ambiguous, ask the user rather than guessing.
- TDD is mandatory — no implementation code before a failing test.
- For fully autonomous execution (implementation → PR → review → merge), use `/kiro:ao-run` instead.
