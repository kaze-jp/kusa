# Show Spec Status

Display the current status of a feature specification, including phase completion and progress.

## Usage

```
/kiro:spec-status <feature-name>
```

## Instructions

1. **Locate the spec directory** at `.kiro/specs/$FEATURE_NAME/`. If it does not exist, report that no spec exists for this feature.

2. **Check each phase** by looking for the corresponding files:

   | Phase | File | Status |
   |-------|------|--------|
   | Init | `requirements-init.md` | Exists? |
   | Requirements | `requirements.md` | Exists? |
   | Design | `design.md` | Exists? |
   | Tasks | `tasks.md` | Exists? |
   | Implementation | (check task completion) | Progress? |

3. **If `tasks.md` exists**, analyze implementation progress:
   - Count total tasks
   - Count completed tasks (checked acceptance criteria)
   - Count parallelizable tasks remaining
   - Identify current blockers (tasks with unmet dependencies that are not complete)
   - Calculate percentage complete

4. **Check for blockers**:
   - Open questions in any document
   - Tasks marked as blocked
   - Design gaps noted during implementation

5. **Generate a status report**:

```markdown
# Spec Status: <feature-name>

## Phase Progress
- [x] Init (requirements-init.md)
- [x] Requirements (requirements.md)
- [x] Design (design.md)
- [ ] Tasks (tasks.md)
- [ ] Implementation

## Current Phase: <phase-name>
<Details about what needs to happen next>

## Implementation Progress (if applicable)
- Total tasks: X
- Completed: Y / X (Z%)
- Parallelizable remaining: N
- Blocked: M

## Blockers
- <blocker description>

## Next Steps
- <recommended next action>
```

6. **Display the report** to the user.

## Output

- Status report displayed to the user (not written to a file)

## Notes

- If no feature name is provided, list all specs found in `.kiro/specs/` with their statuses.
- This command is read-only; it does not modify any files.
