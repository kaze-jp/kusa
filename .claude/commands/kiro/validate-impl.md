# Validate Implementation

Perform full traceability validation from requirements through design to implementation.

## Usage

```
/kiro:validate-impl <feature-name>
```

## Instructions

1. **Read all spec documents**:
   - `.kiro/specs/$FEATURE_NAME/requirements.md`
   - `.kiro/specs/$FEATURE_NAME/design.md`
   - `.kiro/specs/$FEATURE_NAME/tasks.md`

   If any are missing, report which files are absent.

2. **Build the traceability chain**:
   - Requirements -> Design components (from design traceability section)
   - Design components -> Tasks (from task traceability section)
   - Tasks -> Files (from task file lists)

3. **For each requirement**, trace the full chain:
   - Which design component addresses it?
   - Which task(s) implement that component?
   - Which files were created/modified?
   - Does the implementation actually satisfy the requirement?

4. **Validate implementation correctness**:
   - Read each implemented file referenced in tasks
   - Check that the code matches the design's API contracts
   - Verify error handling matches specified error cases
   - Verify data validation matches model specifications
   - Check that tests exist and cover the requirement

5. **Check acceptance criteria**:
   - For each task, verify all acceptance criteria are met
   - Run tests if possible to confirm passing state

6. **Generate full traceability report**:

```markdown
# Implementation Validation: <feature-name>

## Traceability Matrix

| Requirement | Design Component | Task(s) | Files | Status |
|------------|-----------------|---------|-------|--------|
| FR-001 | ComponentA | T-001 | src/a.ts | PASS |
| FR-002 | ComponentB | T-002, T-003 | src/b.ts | FAIL: missing validation |

## Passing Requirements: X / Y

## Failing Requirements
### FR-002: <requirement text>
- **Expected**: <what should happen>
- **Actual**: <what the code does>
- **Fix**: <suggested fix>

## Test Coverage
- Requirements with tests: X / Y
- Tests passing: Z / X

## Overall Verdict: PASS / FAIL
<Summary of validation results>

## Recommended Actions
1. <action>
2. <action>
```

7. **Display the report** to the user.

## Output

- Full traceability validation report displayed to the user

## Notes

- This is the most thorough validation command; use it before marking a feature complete.
- PASS requires 100% requirement coverage with passing tests.
- Be precise about failures; include file paths and line numbers where possible.
