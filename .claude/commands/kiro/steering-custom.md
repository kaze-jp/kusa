# Add Custom Steering Document

Create a custom steering document for specific project concerns that the core documents do not cover.

## Usage

```
/kiro:steering-custom <document-name>
```

## Instructions

1. **Validate the document name**: Must be kebab-case (e.g., `performance-budgets`, `accessibility`, `api-versioning`).

2. **Check for conflicts**: Ensure no existing document at `.ao/steering/<document-name>.md`.

3. **Ask the user** for the document's purpose and content:
   - What concern does this document address?
   - What rules or constraints should it define?
   - Which spec phases should reference it? (requirements, design, tasks, implementation)

4. **Generate the steering document** with this structure:

```markdown
# <Document Title>

## Purpose
<Why this steering document exists>

## Scope
<Which phases and commands should reference this document>

## Rules

### <Rule Category>
- <Rule 1>
- <Rule 2>

### <Rule Category>
- <Rule 1>

## Examples

### Correct
<Example of following these rules>

### Incorrect
<Example of violating these rules>

## References
<Links to standards, specs, or documentation>
```

5. **Save the document** to `.ao/steering/<document-name>.md`.

6. **Confirm** the document was created and explain how it will be picked up by spec commands.

## Common Custom Documents

- **performance-budgets**: Page load times, bundle sizes, API response times
- **accessibility**: WCAG level, screen reader support, keyboard navigation
- **api-versioning**: Versioning strategy, deprecation policy
- **data-privacy**: PII handling, retention policies, GDPR compliance
- **internationalization**: Supported locales, translation workflow
- **error-codes**: Standardized error code format and registry

## Output

- `.ao/steering/<document-name>.md`

## Notes

- Custom steering documents are automatically discovered by spec commands that read from `.ao/steering/`.
- Use `/kiro:steering` to view all documents including custom ones.
