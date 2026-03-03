# Project Structure

## Organization Philosophy

[Describe approach: feature-first, layered, etc.]

## Directory Patterns

### Frontend Source (`src/`)
**Location**: `src/`
**Purpose**: SolidJS application code
**Subdirectories**:
- `components/` — Reusable UI components
- `views/` — Page-level view components
- `stores/` — Signal/Store state management
- `lib/` — Utility functions and helpers
- `types/` — TypeScript type definitions

### Tauri Backend (`src-tauri/`)
**Location**: `src-tauri/`
**Purpose**: Rust backend (file I/O, CLI, OS integration)
**Subdirectories**:
- `src/commands/` — Tauri IPC command handlers
- `src/lib.rs` — Main entry point and command registration

### Tests
**Location**: `tests/` or `src/**/__tests__/`
**Purpose**: Frontend test files

## Naming Conventions

- **TS/TSX Files (Components)**: PascalCase (`MarkdownPreview.tsx`)
- **TS Files (Others)**: camelCase (`markdown.ts`)
- **Rust Files**: snake_case (`file_commands.rs`)
- **Components**: PascalCase (`SplitView`)
- **Functions**: camelCase (TS) / snake_case (Rust)
- **Types**: PascalCase (`EditorState`)

## Import Organization

```typescript
// External packages
import { createSignal } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'

// Internal modules
import { EditorState } from '@/types/editor'
import { MarkdownPreview } from '@/components/MarkdownPreview'
```

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
