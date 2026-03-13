# Manage Steering Documents

View and edit the project's steering documents that guide spec generation and implementation.

## Usage

```
/kiro:steering [show|edit <document>]
```

## Instructions

### Show Mode (default)

1. **Read all steering documents** from `.ao/steering/`:
   - `product.md` - Product vision, goals, target users
   - `tech.md` - Technology stack, patterns, conventions
   - `structure.md` - Project structure and file organization

2. **Display a summary** of each document:

```markdown
# Steering Documents

## Product (.ao/steering/product.md)
<First 5-10 lines or key points summary>
Status: Found | Missing

## Tech (.ao/steering/tech.md)
<First 5-10 lines or key points summary>
Status: Found | Missing

## Structure (.ao/steering/structure.md)
<First 5-10 lines or key points summary>
Status: Found | Missing

## Custom Documents
<List any additional .md files in .ao/steering/>
```

3. If any core document is missing, offer to create it with sensible defaults derived from the codebase.

### Edit Mode

1. When the user specifies `edit <document>`, read the full content of that steering document.

2. **Present the current content** and ask the user what they want to change.

3. **Apply the edits** as requested by the user.

4. **Validate the edited document**:
   - Ensure it still has required sections
   - Check for internal consistency
   - Warn if changes conflict with other steering documents

5. **Save the updated document** and confirm the changes.

## Output

- Display of steering document status and content
- Modified steering documents when editing

## Notes

- Steering documents are the source of truth for all spec commands.
- Changes to steering documents do not retroactively update existing specs.
- If `.ao/steering/` does not exist, create it when the user wants to add a document.
- Custom steering documents (added via `/kiro:steering-custom`) are also listed here.
