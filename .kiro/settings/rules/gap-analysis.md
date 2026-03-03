# Gap Analysis Process

## Objective
Analyze the gap between requirements and existing codebase to inform implementation strategy decisions.

## Analysis Framework

### 1. Current State Investigation

- Scan for domain-related assets:
  - Key files/modules and directory layout
  - Reusable components/services/utilities
  - Dominant architecture patterns and constraints

- Extract conventions:
  - Naming, layering, dependency direction
  - Import/export patterns and dependency hotspots
  - Testing placement and approach

- Note integration surfaces:
  - Tauri IPC commands, Signal/Store patterns, component interfaces

### 2. Requirements Feasibility Analysis

- From EARS requirements, list technical needs:
  - SolidJS components, Tauri commands, TypeScript types
  - Business rules/validation
  - Non-functionals: performance, security

- Identify gaps and constraints:
  - Missing capabilities in current codebase
  - Unknowns to be researched later (mark as "Research Needed")
  - Constraints from existing architecture and patterns

### 3. Implementation Approach Options

#### Option A: Extend Existing Components
**When to consider**: Feature fits naturally into existing structure

#### Option B: Create New Components
**When to consider**: Feature has distinct responsibility

#### Option C: Hybrid Approach
**When to consider**: Complex features requiring both extension and new creation

### 4. Out-of-Scope for Gap Analysis
- Defer deep research activities to the design phase
- Record unknowns as concise "Research Needed" items only

### 5. Implementation Complexity & Risk

- Effort: S (1–3 days) / M (3–7 days) / L (1–2 weeks) / XL (2+ weeks)
- Risk: High / Medium / Low

### Output Checklist

- Requirement-to-Asset Map with gaps tagged
- Options A/B/C with rationale and trade-offs
- Effort and Risk with one-line justification each
- Recommendations for design phase

## Principles

- **Information over decisions**: Provide analysis and options, not final choices
- **Multiple viable options**: Offer credible alternatives
- **Explicit gaps and assumptions**: Flag unknowns clearly
- **Context-aware**: Align with existing patterns
