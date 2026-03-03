# Steering Principles

Steering files are **project memory**, not exhaustive specifications.

---

## Content Granularity

### Golden Rule
> "If new code follows existing patterns, steering shouldn't need updating."

### ✅ Document
- Organizational patterns (feature-first, layered)
- Naming conventions (PascalCase rules)
- Import strategies (absolute vs relative)
- Architectural decisions (state management)
- Technology standards (key frameworks)

### ❌ Avoid
- Complete file listings
- Every component description
- All dependencies
- Implementation details
- Agent-specific tooling directories (e.g. `.cursor/`, `.gemini/`, `.claude/`)
- Detailed documentation of `.kiro/` metadata directories

### Example Comparison

**Bad** (Specification-like):
```markdown
- /src/components/Editor.tsx - CodeMirror editor wrapper
- /src/components/Preview.tsx - Markdown preview
- /src/components/Toolbar.tsx - Top toolbar
... (50+ files)
```

**Good** (Project Memory):
```markdown
## UI Components (`src/components/`)
Reusable SolidJS components
- Named by function (Editor, Preview, SplitView)
- Export component + TypeScript props interface
- Use Tailwind for styling, dark theme default
```

---

## Security

Never include:
- API keys, passwords, credentials
- Internal IPs or paths
- Secrets or sensitive data

---

## Quality Standards

- **Single domain**: One topic per file
- **Concrete examples**: Show patterns with code
- **Explain rationale**: Why decisions were made
- **Maintainable size**: 100-200 lines typical

---

## Preservation (when updating)

- Preserve user sections and custom examples
- Additive by default (add, don't replace)
- Add `updated_at` timestamp
- Note why changes were made

---

## File-Specific Focus

- **product.md**: Purpose, value, business context (not exhaustive features)
- **tech.md**: Key frameworks, standards, conventions (not all dependencies)
- **structure.md**: Organization patterns, naming rules (not directory trees)
- **Custom files**: Specialized patterns (IPC, testing, security, etc.)
