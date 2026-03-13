# Validate Design

Validate a design document against its requirements for completeness, consistency, and correctness.

## Usage

```
/kiro:validate-design <feature-name>
```

## Instructions

1. **Read both documents**:
   - `.kiro/specs/$FEATURE_NAME/requirements.md`
   - `.kiro/specs/$FEATURE_NAME/design.md`

   If either is missing, report which file is absent and what command to run.

2. **Perform traceability check**:
   - For EVERY requirement ID in `requirements.md`, verify it appears in the design's traceability section
   - Flag any requirement that has no corresponding design component
   - Flag any design component that does not trace back to a requirement

3. **Check for gaps**:
   - Error handling: Does every API contract specify error cases?
   - Edge cases: Are boundary conditions from requirements addressed?
   - Security: Are authentication/authorization requirements covered?
   - Performance: Are performance requirements reflected in design choices?
   - Accessibility: Are accessibility requirements addressed?

4. **Check for inconsistencies**:
   - Data model fields must match what API contracts reference
   - Component interfaces must be compatible with their consumers
   - State management must account for all state transitions in requirements
   - Naming must be consistent across all design sections

5. **Check design quality**:
   - Architecture decisions have rationale documented
   - Component boundaries are clear and explicit
   - No circular dependencies between components
   - Testing strategy covers all components
   - No premature optimization

6. **Generate validation report**:

```markdown
# Design Validation: <feature-name>

## Traceability
- Requirements covered: X / Y
- Uncovered requirements: [list]
- Orphan design components: [list]

## Gaps Found
- [ ] <gap description with severity: Critical/Major/Minor>

## Inconsistencies Found
- [ ] <inconsistency description>

## Design Quality
- [ ] All decisions have rationale: Pass/Fail
- [ ] Component boundaries clear: Pass/Fail
- [ ] No circular dependencies: Pass/Fail
- [ ] Error handling complete: Pass/Fail

## Verdict: PASS / NEEDS REVISION
<Summary and recommended fixes>
```

7. **Display the report** to the user.

## Output

- Validation report displayed to the user

## Notes

- A single uncovered requirement is grounds for NEEDS REVISION.
- Be specific about what is missing; vague feedback is not actionable.
