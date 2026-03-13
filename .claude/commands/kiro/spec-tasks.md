# Generate Implementation Tasks

Break a technical design into concrete implementation tasks with parallel execution analysis.

## Usage

```
/kiro:spec-tasks <feature-name>
```

## Instructions

1. **Read the design document** from `.kiro/specs/$FEATURE_NAME/design.md`. If it does not exist, instruct the user to run `/kiro:spec-design` first.

2. **Read the requirements** from `.kiro/specs/$FEATURE_NAME/requirements.md` for traceability.

3. **Read project structure** from `.ao/steering/structure.md` to understand file organization.

4. **Break the design into tasks**. Each task must include:
   - **Task ID**: T-001, T-002, etc.
   - **Title**: Short descriptive name
   - **Description**: What needs to be done
   - **Files to create/modify**: Explicit file paths
   - **Dependencies**: Other task IDs that must complete first
   - **Acceptance criteria**: How to verify the task is done
   - **Test requirements**: What tests to write
   - **Estimated effort**: Small (< 1hr), Medium (1-2hr), Large (2-4hr)

5. **Apply task generation rules**:
   - Each task should be 1-4 hours of work maximum
   - Tasks must be independently verifiable
   - No task should modify more than 5 files
   - Shared utilities should be separate tasks that others depend on
   - Test tasks can be bundled with implementation tasks

6. **Perform parallel execution analysis**:
   - For each pair of tasks, check if they modify the same files
   - Tasks that share NO file dependencies can be marked with **(P)**
   - Tasks that share files MUST have explicit ordering via dependencies
   - Document the conflict matrix showing which tasks share files

7. **Generate `tasks.md`** with this structure:

```markdown
# Implementation Tasks: <feature-name>

## Document Info
- Feature: <name>
- Total tasks: <count>
- Parallelizable: <count of (P) tasks>
- Created: <date>

## Task Dependency Graph
<ASCII visualization of task dependencies>

## Parallel Execution Groups
<Groups of tasks that can run simultaneously>

## Tasks

### T-001: <title> (P)
- **Description**: <what to do>
- **Files**: <file paths to create/modify>
- **Dependencies**: None
- **Acceptance Criteria**:
  - [ ] <criterion 1>
  - [ ] <criterion 2>
- **Tests**: <test requirements>
- **Effort**: Small | Medium | Large

### T-002: <title>
- **Dependencies**: T-001
...

## File Conflict Matrix
| Task | Files | Conflicts With |
|------|-------|---------------|
| T-001 | src/foo.ts | None |
| T-002 | src/foo.ts, src/bar.ts | T-001 (src/foo.ts) |

## Requirements Traceability
| Requirement | Tasks |
|------------|-------|
| FR-001 | T-001, T-003 |
```

8. **Report** the output path and suggest `/kiro:spec-impl` or `/kiro:ao-run` to begin implementation.

## Output

- `.kiro/specs/<feature-name>/tasks.md`

## Notes

- Prefer more smaller tasks over fewer large tasks.
- Infrastructure and shared code tasks should come first.
- Always include a final integration/smoke-test task.
- The parallel analysis is critical for autonomous execution efficiency.
