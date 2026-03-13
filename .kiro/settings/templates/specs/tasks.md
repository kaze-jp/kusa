# {{FEATURE_NAME}} — Implementation Tasks

> Generated from approved design

## Parallel Analysis

- **Total tasks:** {{N}}
- **Parallelizable:** {{M}} tasks marked with (P)
- **Sequential:** {{K}} tasks with dependencies
- **Estimated integration points:** {{list}}

## Tasks

### Task 1: {{title}} (P)

- **Description:** {{description}}
- **Files:**
  - Create: {{file}}
  - Modify: {{file}}
- **Test requirements:**
  - [ ] {{test description}}
- **Acceptance criteria:**
  - [ ] {{criteria}}
- **Dependencies:** None
- **Branch:** `konbini/{{feature}}-task-1`

### Task 2: {{title}} (P)

- **Description:** {{description}}
- **Files:**
  - Create: {{file}}
- **Test requirements:**
  - [ ] {{test description}}
- **Acceptance criteria:**
  - [ ] {{criteria}}
- **Dependencies:** None
- **Branch:** `konbini/{{feature}}-task-2`

### Task 3: {{title}}

- **Description:** {{description}}
- **Files:**
  - Modify: {{file}}
- **Test requirements:**
  - [ ] {{test description}}
- **Acceptance criteria:**
  - [ ] {{criteria}}
- **Dependencies:** Task 1, Task 2
- **Branch:** `konbini/{{feature}}-task-3`

## File Conflict Analysis

| File | Task 1 | Task 2 | Task 3 | Conflict Risk |
|------|--------|--------|--------|---------------|
| {{file}} | ✓ | | ✓ | Low |

---

**Status:** ⏳ Awaiting R3 approval
**Next:** After approval, run `/kiro:spec-impl` or `/kiro:ao-run` to begin implementation.
