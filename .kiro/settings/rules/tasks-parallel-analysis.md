# Parallel Execution Analysis Rules

These rules govern how tasks are analyzed for safe parallel execution during autonomous implementation.

## File Conflict Detection

- For every pair of tasks, compare their file modification lists.
- Tasks that modify ANY of the same files CANNOT be marked as parallelizable (P).
- Tasks that create new files in the same directory CAN be parallel if the files are different.
- Tasks that modify a shared configuration file (e.g., `package.json`, `tsconfig.json`) conflict with each other.

## Conflict Matrix

- Every tasks document MUST include a file conflict matrix.
- The matrix must list each task, its files, and which other tasks it conflicts with.
- Tasks with no conflicts should be explicitly marked as "None" in the conflicts column.

## Parallel Execution Groups

- Group parallelizable tasks into execution batches.
- All tasks within a batch must have their dependencies satisfied by prior batches.
- No two tasks in the same batch may share file modifications.
- Batch ordering must respect the dependency graph.

## Shared State

- Minimize shared state between parallel tasks.
- If parallel tasks must share state (e.g., a common type definition), extract the shared element into a prerequisite task.
- Parallel tasks must not depend on side effects from each other (e.g., database seeding, file system state).

## Independent Testability

- Each parallel task MUST be independently testable.
- Tests for parallel tasks must not depend on artifacts produced by sibling tasks in the same batch.
- Test fixtures must be self-contained within each task's scope.

## Integration Points

- Document all integration points between parallel tasks.
- Integration points are where the outputs of parallel tasks must work together.
- A dedicated integration test task should follow any batch of parallel tasks that share integration points.
- The integration task must verify that all parallel outputs compose correctly.

## Safety Constraints

- When in doubt about file conflicts, mark tasks as sequential rather than parallel.
- The orchestrator must re-validate the conflict matrix before execution.
- If a file is added to a task during implementation, re-check parallel safety.
