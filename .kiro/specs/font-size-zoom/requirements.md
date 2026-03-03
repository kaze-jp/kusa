# Font Size Zoom — Requirements

## Overview
Allow users to adjust font size in the preview and editor via keyboard shortcuts, with persistent preference storage.

## Functional Requirements

### FR-1: Zoom In
- **When** the user presses `Cmd+=` (macOS) or `Ctrl+=` (other platforms)
- **Then** the font size increases by one step (10%)
- **And** the zoom level does not exceed 200%

### FR-2: Zoom Out
- **When** the user presses `Cmd+-` (macOS) or `Ctrl+-` (other platform)
- **Then** the font size decreases by one step (10%)
- **And** the zoom level does not go below 50%

### FR-3: Reset Zoom
- **When** the user presses `Cmd+0` (macOS) or `Ctrl+0` (other platform)
- **Then** the zoom level resets to 100% (default)

### FR-4: Scope
- The zoom applies to both the preview container (`.markdown-body`) and the CodeMirror editor
- The zoom does NOT affect UI chrome (TOC panel, status bar, heading picker, hint bar)

### FR-5: Persistence
- **When** the user changes the zoom level
- **Then** the preference is saved via Tauri IPC (`save_preference`)
- **And** on next launch the saved zoom level is restored

### FR-6: Default Browser Zoom Prevention
- The keyboard shortcuts must prevent the default browser/webview zoom behavior

## Non-Functional Requirements

- Zoom range: 50% to 200%, step 10%
- Default zoom: 100%
- Storage key: `"zoom-level"`
- CSS approach: CSS custom property `--zoom-font-size` on containers
