# Implementation Plan

## Tasks

- [ ] 1. Tab State Management
- [ ] 1.1 Create tabStore.ts with Tab interface and signal-based store
  - Tab interface: { id, filePath, fileName, content, isDirty, scrollPosition }
  - Signals: tabs array, activeTabId
  - Actions: openTab, closeTab, switchTab, updateTabContent, markDirty, markClean
  - Max tab limit (20)
  - Duplicate detection by filePath
  - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3_

- [ ] 2. TabBar Component
- [ ] 2.1 Create TabBar.tsx component
  - Horizontal tab bar with filename and close button per tab
  - Active tab highlighting
  - isDirty indicator (dot)
  - Overflow horizontal scroll
  - Dark theme styling with Tailwind
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 3. App Integration
- [ ] 3.1 Integrate TabBar and tab store into App.tsx
  - Replace single-file state with tab store for directory mode
  - FileList click -> openTab()
  - TabBar above content area
  - Switch content based on active tab
  - Save/restore scroll position on tab switch
  - _Requirements: 2.1, 4.1, 4.2, 5.1, 5.3_

- [ ] 4. Keyboard Shortcuts
- [ ] 4.1 Add tab keyboard shortcuts to keyboard handler
  - Cmd+Shift+] / [ for next/prev tab
  - Cmd+1-9 for direct tab access
  - Cmd+W closes active tab (not window when tabs remain)
  - Vim gt/gT for next/prev tab
  - _Requirements: 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5. Type Check and Validation
- [ ] 5.1 Run type checking and verify build
  - pnpm build to verify TypeScript compilation
  - Verify no regressions in existing functionality

## Requirements Coverage

| Requirement | Tasks |
|-------------|-------|
| 1.1 | 2.1 |
| 1.2 | 2.1 |
| 1.3 | 2.1 |
| 1.4 | 2.1 |
| 1.5 | 2.1 |
| 2.1 | 1.1, 2.1, 3.1 |
| 2.2 | 1.1, 2.1 |
| 2.3 | 1.1, 3.1 |
| 2.4 | 4.1 |
| 3.1 | 4.1 |
| 3.2 | 4.1 |
| 3.3 | 4.1 |
| 3.4 | 4.1 |
| 3.5 | 4.1 |
| 4.1 | 1.1, 3.1 |
| 4.2 | 1.1, 3.1 |
| 4.3 | 1.1 |
| 5.1 | 1.1, 3.1 |
| 5.2 | 1.1 |
| 5.3 | 1.1, 3.1 |
