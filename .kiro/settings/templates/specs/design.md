# Design Document Template

---
**Purpose**: Provide sufficient detail to ensure implementation consistency across different implementers, preventing interpretation drift.

**Approach**:
- Include essential sections that directly inform implementation decisions
- Omit optional sections unless critical to preventing implementation errors
- Match detail level to feature complexity
- Use diagrams and tables over lengthy prose

**Warning**: Approaching 1000 lines indicates excessive feature complexity that may require design simplification.
---

## Overview
2-3 paragraphs max
**Purpose**: This feature delivers [specific value] to [target users].
**Users**: [Target user groups] will utilize this for [specific workflows].
**Impact** (if applicable): Changes the current [system state] by [specific modifications].


### Goals
- Primary objective 1
- Primary objective 2
- Success criteria

### Non-Goals
- Explicitly excluded functionality
- Future considerations outside current scope
- Integration points deferred

## Architecture

### Existing Architecture Analysis (if applicable)
When modifying existing systems:
- Current architecture patterns and constraints
- Existing domain boundaries to be respected
- Integration points that must be maintained

### Architecture Pattern & Boundary Map
**RECOMMENDED**: Include Mermaid diagram showing the chosen architecture pattern and system boundaries

**Architecture Integration**:
- Selected pattern: [name and brief rationale]
- Frontend/Backend boundaries: [how responsibilities are separated]
- IPC contract: [Tauri commands bridging the two]
- Existing patterns preserved: [list key patterns]

### Technology Stack

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| Frontend | SolidJS + TypeScript | | |
| Editor | CodeMirror 6 | | |
| Markdown | unified/remark | | |
| Styling | Tailwind CSS | | |
| Backend | Rust (Tauri v2) | | |
| Build | pnpm + Vite | | |

## System Flows

Provide only the diagrams needed to explain non-trivial flows. Use pure Mermaid syntax.

## Requirements Traceability

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 1.1 | | | | |
| 1.2 | | | | |

## Components and Interfaces

Provide a quick reference before diving into per-component details.

| Component | Domain/Layer | Intent | Req Coverage | Key Dependencies | Contracts |
|-----------|--------------|--------|--------------|------------------|-----------|
| | | | | | |

### [Domain / Layer]

#### [Component Name]

| Field | Detail |
|-------|--------|
| Intent | 1-line description |
| Requirements | 2.1, 2.3 |

**Responsibilities & Constraints**
- Primary responsibility
- Domain boundary

**Dependencies**
- Inbound: Component — purpose (Criticality)
- Outbound: Component — purpose (Criticality)

**Contracts**: Service [ ] / IPC Command [ ] / Event [ ] / State [ ]

##### IPC Command Contract (if applicable)
```typescript
// TypeScript side
invoke('command_name', { arg: ArgType }): Promise<ReturnType>
```
```rust
// Rust side
#[tauri::command]
fn command_name(arg: ArgType) -> Result<ReturnType, String> { }
```

##### State Management (if applicable)
- Signal/Store model:
- Persistence & consistency:
- Cleanup strategy:

## Error Handling

### Error Strategy
Concrete error handling patterns and recovery mechanisms.

### Error Categories
**User Errors**: Invalid file path → error message with guidance
**System Errors**: File read failure → graceful degradation with notification
**IPC Errors**: Tauri command failure → retry or fallback

## Testing Strategy

### Default sections
- Unit Tests: Core logic functions (markdown parsing, state management)
- Integration Tests: IPC round-trips, component interactions
- E2E Tests (if applicable): Critical user paths (open file → edit → save)

## Optional Sections

### Security Considerations
- Tauri allowlist configuration
- File system access boundaries
- Markdown HTML sanitization
- External link handling

### Performance & Scalability
- Large file handling strategy
- Startup time targets
- Memory usage limits
- Bundle size optimization

## Supporting References (Optional)
- Only when keeping content in main body would hurt readability
