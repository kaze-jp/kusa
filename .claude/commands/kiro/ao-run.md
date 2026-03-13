# AO Autonomous Execution

Launch the Agent Orchestrator for fully autonomous feature development. The orchestrator takes approved specs and drives the entire pipeline: implementation → integration → PR → review → merge.

## Usage

```
/kiro:ao-run <feature-name>
```

## Instructions

1. **Validate prerequisites**: Verify all required spec documents exist:
   - `.kiro/specs/$FEATURE_NAME/requirements.md` (required, R1 approved)
   - `.kiro/specs/$FEATURE_NAME/design.md` (required, R2 approved)
   - `.kiro/specs/$FEATURE_NAME/tasks.md` (required, R3 approved)

   If any are missing, report which documents are absent and which commands to run:
   - `/kiro:spec-init` → `/kiro:spec-requirements` → `/kiro:spec-design` → `/kiro:spec-tasks`

2. **Read configuration** from `.ao/ao.yaml`:
   - `preset` and `autonomy.downstream` — determines how much human intervention is needed
   - `git.strategy` and `git.base_branch` — worktree vs branch strategy
   - `quality_gates.commands` — project-specific test/lint/build commands
   - `reviews.*` — which review points require human vs AI actors

3. **Read steering documents** for implementation constraints:
   - `.ao/steering/product.md` — product vision and priorities
   - `.ao/steering/tech.md` — tech stack and coding conventions
   - `.ao/steering/structure.md` — directory structure and naming rules

4. **Launch the orchestrator agent** (`orchestrator.md`) with the feature name. The orchestrator autonomously executes the full pipeline:

   ```
   Phase 1: Task analysis + worktree branch creation
   Phase 2: Context generation for implementation workers
   Phase 3: Parallel implementation (TDD + Team Agents + quality gates)
   Phase 4: Integration (merge worktrees) + Simplify
   Phase 5: Ship-Before Checkpoint
   Phase 6: PR creation + Multi-specialist code review (GH comments)
   Phase 7: Fix loop (address review feedback until approved)
   Phase 8: Pre-merge review (human/ai per downstream setting)
   Merge:   Merge to base branch + cleanup
   ```

5. **Downstream behavior** (determined by `autonomy.downstream`):

   | Setting | Phase 3-7 | Phase 8 | Merge |
   |---------|-----------|---------|-------|
   | `full-auto` | AI autonomous | Skip | Auto |
   | `approve-only` | AI autonomous | Human approval | Auto after approval |
   | `review-and-approve` | AI autonomous | Human review + approval | Auto after approval |

6. **Escalation**: The orchestrator will pause and ask for human help when:
   - Phase 7 fix loop hits `max_iterations` (default: 10)
   - Same review issue repeats 3+ times
   - Merge conflicts cannot be auto-resolved
   - Quality gates fail after `max_retries` (default: 3)

## Resume Support

If execution is interrupted, run `/kiro:ao-run <feature-name>` again. The orchestrator reads task completion status from `tasks.md` and resumes from where it left off.

## Output

The orchestrator produces:
- Implemented source files with tests (TDD)
- Merged PR on GitHub with full review trail (🤖 [ao-review/*] comments)
- Updated `.ao/memory/review-patterns/` with learned patterns
- Updated `.kiro/specs/<feature-name>/tasks.md` with completion status

## Notes

- The orchestrator controls the full git workflow (branch, commit, push, PR, merge) as defined in `ao.yaml`.
- For `solo-full-auto`, the entire pipeline runs without human intervention after this command.
- For `approve-only` and `team`, the orchestrator pauses at Phase 8 for human approval.
- Large features benefit from `/kiro:ao-run`; small features may be faster with `/kiro:spec-impl`.
