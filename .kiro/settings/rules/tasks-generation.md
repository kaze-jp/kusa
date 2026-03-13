# Task Generation Rules

These rules govern how implementation tasks are generated from design documents.

## Task Structure

- Each task MUST have a unique ID (T-001, T-002, etc.).
- Each task MUST have clear, verifiable acceptance criteria.
- Each task MUST specify the exact files to create or modify.
- Each task MUST include test requirements (what to test, expected coverage).
- Each task MUST have an effort estimate: Small (< 1hr), Medium (1-2hr), Large (2-4hr).

## Task Scope

- A single task SHOULD represent 1-4 hours of work. If larger, break it down.
- A single task SHOULD NOT modify more than 5 files. If more, split it.
- Each task MUST be independently verifiable; completion should not depend on subjective judgment.
- Tasks must not contain conditional logic ("if X then do Y, otherwise Z"); create separate tasks instead.

## Dependencies

- Dependencies between tasks MUST be explicit using task IDs.
- Infrastructure and shared utility tasks must come before feature tasks that depend on them.
- No implicit ordering; if order matters, it must be a declared dependency.
- Circular dependencies between tasks are not allowed.

## Parallelization

- Mark tasks that can execute in parallel with **(P)** after the title.
- A task can be marked (P) only if it shares NO file modifications with other (P) tasks in the same group.
- Parallel tasks must be independently testable without depending on each other's output.

## Traceability

- Every task MUST trace back to at least one requirement via the design document.
- The tasks document must include a requirements traceability table.
- Every requirement must be covered by at least one task.

## Special Tasks

- Always include a final integration or smoke-test task as the last task.
- Database migration tasks must precede tasks that depend on the new schema.
- Configuration or environment setup tasks must come first in the dependency chain.
