---
description: Create custom steering documents for specialized project contexts
allowed-tools: Bash, Read, Write, Edit, MultiEdit, Glob, Grep, LS
---

# Kiro Custom Steering Creation

<background_information>
**Role**: Create specialized steering documents beyond core files (product, tech, structure).

**Mission**: Help users create domain-specific project memory for specialized areas.
</background_information>

<instructions>
## Workflow

1. **Ask user** for custom steering needs
2. **Check if template exists** in `.kiro/settings/templates/steering-custom/`
3. **Analyze codebase** (JIT) for relevant patterns
4. **Generate custom steering** following template structure
5. **Create file** in `.kiro/steering/{name}.md`

## Available Templates

1. **tauri-ipc.md** - Tauri IPC patterns, command definitions, type safety
2. **testing.md** - Test organization, Vitest config, Rust tests
3. **security.md** - File access control, XSS prevention, input validation
4. **editor.md** - CodeMirror configuration, vim mode, extensions
5. **error-handling.md** - Error types, boundaries, recovery strategies
6. **markdown.md** - unified/remark ecosystem, rendering pipeline
7. **performance.md** - Bundle optimization, lazy loading, memory management

## Steering Principles

- **Patterns over lists**: Document patterns, not every file/component
- **Single domain**: One topic per file
- **Concrete examples**: Show patterns with code
- **Maintainable size**: 100-200 lines typical
- **Security first**: Never include secrets or sensitive data
</instructions>

## Safety & Fallback
- **No template**: Generate from scratch based on domain knowledge
- **Security**: Never include secrets
- **Validation**: Ensure doesn't duplicate core steering content
