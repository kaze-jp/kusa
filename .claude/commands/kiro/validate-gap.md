# Gap Analysis

Perform a gap analysis between the design document and the actual implementation.

## Usage

```
/kiro:validate-gap <feature-name>
```

## Instructions

1. **Read the spec documents**:
   - `.kiro/specs/$FEATURE_NAME/design.md`
   - `.kiro/specs/$FEATURE_NAME/tasks.md`
   - `.kiro/specs/$FEATURE_NAME/requirements.md`

2. **Inventory the design** by extracting:
   - All components and their expected file locations
   - All API contracts and their signatures
   - All data models and their fields
   - All specified error handling behaviors
   - All testing requirements

3. **Inventory the implementation** by:
   - Reading each file referenced in the design
   - Checking for the existence of all specified components
   - Comparing actual function signatures against API contracts
   - Comparing actual data models against design specifications
   - Checking for test files

4. **Compare design vs implementation**:

   | Category | Check |
   |----------|-------|
   | Files | Do all designed files exist? |
   | Components | Are all components implemented? |
   | APIs | Do signatures match contracts? |
   | Data Models | Do fields and validations match? |
   | Error Handling | Are all error cases handled? |
   | Tests | Do required tests exist and pass? |
   | Behaviors | Are all specified behaviors present? |

5. **Classify gaps**:
   - **Missing**: Designed but not implemented
   - **Divergent**: Implemented but differs from design
   - **Extra**: Implemented but not in design (may be fine)
   - **Incomplete**: Partially implemented

6. **Generate gap analysis report**:

```markdown
# Gap Analysis: <feature-name>

## Summary
- Design components: X
- Implemented: Y
- Missing: Z
- Divergent: W

## Missing Components
- [ ] <component> - <designed location>

## Divergent Implementations
- [ ] <component>: Design says <X>, implementation does <Y>

## Incomplete Implementations
- [ ] <component>: Missing <specific aspect>

## Extra Implementations
- <component>: Not in design (review needed)

## Test Coverage
- Designed tests: X
- Implemented tests: Y
- Missing tests: [list]

## Recommendations
<Prioritized list of actions to close gaps>
```

7. **Display the report** to the user.

## Output

- Gap analysis report displayed to the user

## Notes

- Divergent implementations are not always bugs; the design may need updating.
- Extra implementations should be reviewed but are not automatically flagged as issues.
- Focus on behavioral gaps over stylistic differences.
