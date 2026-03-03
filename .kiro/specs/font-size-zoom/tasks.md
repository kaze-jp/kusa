# Font Size Zoom — Implementation Tasks

## Task 1: Create Zoom Store (`src/lib/useZoom.ts`)
- [x] Create `useZoom()` hook with SolidJS signal for zoom level
- [x] Default: 100, range: 50-200, step: 10
- [x] Functions: `zoomIn()`, `zoomOut()`, `resetZoom()`, `zoomLevel()` accessor
- [x] Load persisted value on init via `load_preference("zoom-level")`
- [x] Save on change via `save_preference("zoom-level", value)`
- [x] Apply CSS custom property `--zoom-font-size` to `document.documentElement`

## Task 2: Register Keyboard Shortcuts in App.tsx
- [x] Add Cmd+= / Ctrl+= for zoom in
- [x] Add Cmd+- / Ctrl+- for zoom out
- [x] Add Cmd+0 / Ctrl+0 for reset
- [x] Prevent default browser zoom on these shortcuts
- [x] Call zoom store functions

## Task 3: Apply CSS Zoom to Preview and Editor
- [x] Use `var(--zoom-font-size)` for `.markdown-body` base font-size
- [x] Use `var(--zoom-font-size)` for `.cm-editor` font-size
- [x] Keep UI chrome (TOC, status bar, etc.) at fixed size

## Task 4: Type Check and Validate
- [x] Run `pnpm tsc` to verify no type errors
- [x] Verify zoom keyboard shortcuts don't conflict with existing shortcuts
