# Implementation Tasks

## Task 1: Create search service (src/lib/searchService.ts)
- [ ] Implement DOM-based text search using TreeWalker for preview mode
- [ ] Highlight all matches by wrapping with `<mark>` elements
- [ ] Track current match index and total count
- [ ] Provide next/prev navigation with wrap-around
- [ ] scrollIntoView for current match
- [ ] Cleanup function to remove all highlights
- [ ] Case-insensitive search by default

## Task 2: Create SearchBar component (src/components/SearchBar.tsx)
- [ ] Floating search bar with input, match count, nav buttons, close button
- [ ] Auto-focus input on open
- [ ] Real-time search on input change
- [ ] Enter for next, Shift+Enter for prev
- [ ] Esc to close
- [ ] Tailwind CSS styling, dark theme compatible
- [ ] Match count display "N/M" format

## Task 3: Integrate search into App.tsx
- [ ] Add search open/close state signal
- [ ] Rebind Ctrl+F from focus mode to search (move focus mode to different shortcut)
- [ ] Pass previewRef to SearchBar for DOM search
- [ ] Render SearchBar in FullContent layout

## Task 4: Add Vim `/` trigger in useVimNav
- [ ] Handle `/` key to trigger search open callback
- [ ] Guard against input/textarea/contentEditable targets
- [ ] Guard against already-open search bar

## Task 5: Add search highlight CSS styles
- [ ] Add CSS for search match highlights (mark elements)
- [ ] Add CSS for current match distinction
- [ ] Theme-compatible colors for both dark and light themes

## Task 6: TypeScript validation
- [ ] Run `bun exec tsc --noEmit` to verify no type errors
