# Technical Design: fix-create-window-error

## Document Info

- Feature: fix-create-window-error
- Status: Draft
- Created: 2026-05-27
- Requirements: ./requirements.md
- Related issue: kusa #69

## Architecture Overview

The fix is local to `src-tauri/src/lib.rs`. Two code regions are touched:

1. **`create_window` — Full mode branch** (lib.rs lines 119–129):
   primary builder may fail → safe-defaults fallback builder runs → fallback may fail → return `Err`. On either success, `window.show()` is called and any error is logged (not silently dropped).

2. **`setup` closure — `create_window` invocation** (lib.rs lines 246–248):
   on `Err`, the previous code merely `eprintln!`ed and returned `Ok(())`. New code returns the `Err`, which is converted to `Box<dyn std::error::Error>` and propagated by Tauri's setup machinery, ultimately causing `tauri::Builder::build(...).expect("error while building kusa")` to panic visibly.

All edits stay inside `src-tauri/src/lib.rs`. The fallback uses the existing `FULL_SIZE` constant (already imported on line 9), so no helper module changes are needed. A minimal `#[cfg(test)] mod tests` block is added at the bottom of `lib.rs` to verify the safe-defaults configuration shape via a small in-file helper (`safe_default_full_size()`), keeping the change file-local per the task constraint.

```
setup()
  └── create_window(app, &peek_config)
        ├── is_peek == true  → Peek primary build
        │     └── (already has Full-mode fallback)  → unchanged
        └── is_peek == false → Full primary build
              ├── Ok(w)  → w.show() (errors logged, not dropped)
              └── Err(e) → log + safe-defaults fallback build
                              ├── Ok(w)  → w.show() (errors logged)
                              └── Err(e2) → return Err(e2) ← bubbles up to setup
  └── if Err(e) → eprintln + return Err(e) ← Tauri panics
```

## Component Design

### Component: `create_window` (Full mode branch)

- **Purpose**: Build the main WebView window in Full mode; on builder failure, retry with safe-defaults to avoid plugin-restored-state corruption.
- **Location**: `src-tauri/src/lib.rs` lines 119–129 (current), replaced by ~18 lines after the fix.
- **Dependencies**: `tauri::WebviewWindowBuilder`, `tauri::WebviewUrl`, `window_presets::FULL_SIZE`.
- **Interface**: same as today — `fn create_window(app: &tauri::App, peek_config: &PeekConfig) -> Result<(), Box<dyn std::error::Error>>`.

### Component: `setup` closure (`create_window` invocation)

- **Purpose**: Run `create_window`; on failure, return the error so Tauri panics rather than silently leaving a zombie process.
- **Location**: `src-tauri/src/lib.rs` lines 246–248.
- **Interface**: same closure signature; behavioural change only.

### Component (new, file-local): `safe_default_full_size` (in `lib.rs`)

- **Purpose**: Module-private const fn returning the size used by the Full-mode safe-defaults fallback. Exists so the fallback's size is verifiable in unit tests without launching a Tauri runtime, while keeping all edits inside `lib.rs`.
- **Location**: bottom of `src-tauri/src/lib.rs`, immediately above the new `#[cfg(test)] mod tests` block.
- **Interface**: `const fn safe_default_full_size() -> WindowSize { FULL_SIZE }` (module-private; no `pub`).
- **Rationale for `const fn`**: matches existing constants idiom in `window_presets` and enables compile-time use if ever needed.

## API Contracts

### `create_window` (unchanged signature)

- **Signature**: `fn create_window(app: &tauri::App, peek_config: &PeekConfig) -> Result<(), Box<dyn std::error::Error>>`
- **Input**: `app` — Tauri application handle; `peek_config` — resolved peek/full configuration.
- **Output**: `Ok(())` on success (either primary or fallback build path), `Err(_)` if every attempted build fails.
- **Errors**:
  - `Err` from primary Full-mode `build()` → swallowed (logged, then fallback runs).
  - `Err` from fallback Full-mode `build()` → returned to caller (final failure).
  - `Err` from Peek mode primary `build()` → swallowed (logged, existing Full-mode fallback runs).
  - `Err` from existing Peek→Full fallback `build()` → returned to caller (existing behaviour preserved via `?`).
- **`window.show()` errors**: never propagated — they are logged via `eprintln!`. Rationale: the frontend always invokes `show()` again later when ready (instant-read flow), so a single failed `show()` call is not fatal; build success is the meaningful gate.

### `setup` closure (relevant excerpt)

- **Before**:
  ```rust
  if let Err(e) = create_window(app, &peek_config) {
      eprintln!("Fatal: failed to create window: {}", e);
  }
  ```
- **After**:
  ```rust
  if let Err(e) = create_window(app, &peek_config) {
      eprintln!("Fatal: failed to create window: {}", e);
      return Err(e);
  }
  ```
- **Errors**: returned `Err` propagates through Tauri setup → `Builder::build(...).expect("error while building kusa")` → panic.

## Data Models

No new persistent data models. One new file-local helper in `lib.rs`:

### `WindowSize` (existing in `window_presets`, unchanged)
- Fields: `width: f64`, `height: f64`.

### `safe_default_full_size() -> WindowSize` (new, module-private in `lib.rs`)
- Returns: `FULL_SIZE` (currently `{ width: 1200.0, height: 800.0 }`).
- Validation: covered by unit tests inside `lib.rs`'s new `#[cfg(test)] mod tests` block.

## State Management

- `WindowModeState`: not modified in this fix. The Full-mode path does not touch it (its initial value, set on lib.rs lines 238–243, already encodes `"full"`).
- `CliArgsState`: not affected.

## Error Handling Strategy

| Failure | Action | User-facing surface |
| --- | --- | --- |
| Full primary `build()` fails | `eprintln!` + fallback `build()` | stderr message; user gets working window (best case) |
| Full safe-defaults `build()` fails | return `Err` | Tauri panic ("error while building kusa") + stderr `Fatal: failed to create window: …` |
| `window.show()` fails (any path) | `eprintln!` only | stderr message; frontend can retry show |
| Peek primary `build()` fails | unchanged: `eprintln!` + existing Full-mode fallback | (same as today) |
| Peek's existing Full-mode fallback `build()` fails | `?` propagates `Err` | Tauri panic (same as today, but now triggered via FR-001) |

Rationale: surfacing a panic is preferable to a silent zombie process. The panic appears in the Console.app log on macOS and in stderr.

## Testing Strategy

### Unit tests (added to `src-tauri/src/lib.rs` in a new `#[cfg(test)] mod tests` block)

Pure helpers only — no Tauri runtime.

- **`safe_default_full_size_matches_full_size`**: verifies `safe_default_full_size().width == FULL_SIZE.width && height == FULL_SIZE.height`. Locks the contract that the fallback uses the canonical full size.
- **`safe_default_full_size_is_positive`**: defensive — width > 0, height > 0.

### Manual verification

- `cargo check` and `cargo build` inside `src-tauri/` succeed.
- `cargo test` inside `src-tauri/` passes (existing tests plus the two new ones).
- Optional smoke test (not required for CI but documented in task): user can manually corrupt `~/Library/Application Support/com.kazejp.kusa/.window-state.json` to trigger restore failure, then start kusa to observe the fallback behaviour.

### Why no integration test

Tauri's runtime cannot be driven from `cargo test` without a heavy harness, and forcing a `build()` failure deterministically would require mocking `WebviewWindowBuilder`, which is outside this fix's scope. The acceptance criteria in `requirements.md` therefore rely on (a) the type-checked control flow, (b) the unit tests of the safe-defaults config, and (c) manual smoke testing.

## Security Considerations

- No new file I/O, no new IPC commands, no new permissions added.
- Returning `Err` from `setup()` does not leak sensitive information; the panic message is the static string `error while building kusa` from the existing `.expect()` call site.

## Requirements Traceability

| Requirement | Fulfilled by |
| --- | --- |
| FR-001 | setup closure `Err(e) → return Err(e)` |
| FR-002 | new fallback `match builder.build()` arm |
| FR-003 | safe-defaults config in fallback (title/inner_size/decorations/visible) |
| FR-004 | fallback `Ok(w)` → `window.show()` + log on err |
| FR-005 | fallback `Err(e2)` → return `Err(e2)` |
| FR-006 | Peek branch (lines 78–118) untouched |
| FR-010 | `eprintln!("Failed to create full window: {}, retrying with safe defaults", e)` |
| FR-011 | `if let Err(e) = window.show() { eprintln!("Failed to show window: {}", e); }` |
| FR-012 | preserved `eprintln!("Fatal: failed to create window: {}", e)` |
| FR-020 | no write to `WindowModeState` in Full path |
| FR-021 | no `app.emit("window-mode", …)` in Full path |
| FR-030 | Peek primary success returns early as before |
| FR-031 | existing `build()?` on Peek→Full fallback preserved |
| NFR-001 | only `src-tauri/src/lib.rs` modified |
| NFR-002 | edits confined to the two declared regions |
| NFR-003 | line 183–191 untouched |
| NFR-010 | `.visible(false)` preserved everywhere |
| NFR-011 | primary build still calls `.min_inner_size(400.0, 300.0)` |
| NFR-020 | `safe_default_full_size()` is pure |
| NFR-021 | two unit tests added |
| NFR-030 | commits made without `--no-verify` |
| NFR-031 | `fix:` Conventional Commits prefix |

## Scope Boundary Notes

- Lines 183–191 (single-instance plugin) are explicitly excluded — that area belongs to issue #70.
- The optional `--reset-window` flag (issue #69 item 3) is **out of scope**. Future issue can address it.
- All edits are confined to `src-tauri/src/lib.rs`. The unit-test helper `safe_default_full_size()` and the `#[cfg(test)] mod tests` block live in `lib.rs` itself (not in `window_presets.rs`) per the task constraint that only `lib.rs` is touched.
