# Tauri IPC Patterns

## Command Definition Pattern

### Rust Side
```rust
#[tauri::command]
fn command_name(param: ParamType) -> Result<ReturnType, String> {
    // Implementation
}
```

### TypeScript Side
```typescript
import { invoke } from '@tauri-apps/api/core'

const result = await invoke<ReturnType>('command_name', { param: value })
```

## Type Contract Rules

- TypeScript types and Rust structs MUST match
- Use `serde` for Rust serialization
- Prefer `Result<T, String>` for error handling on Rust side
- Handle errors with try/catch on TypeScript side

## Command Categories

[Define command grouping patterns]

## Error Handling

[IPC error handling patterns]

---
_Document patterns, customize for project_
