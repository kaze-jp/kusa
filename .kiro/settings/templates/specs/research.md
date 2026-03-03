# Research & Design Decisions Template

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:
- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.
---

## Summary
- **Feature**: `<feature-name>`
- **Discovery Scope**: New Feature / Extension / Simple Addition / Complex Integration
- **Key Findings**:
  - Finding 1
  - Finding 2
  - Finding 3

## Research Log
Document notable investigation steps and their outcomes. Group entries by topic for readability.

### [Topic or Question]
- **Context**: What triggered this investigation?
- **Sources Consulted**: Links, documentation, API references, benchmarks
- **Findings**: Concise bullet points summarizing the insights
- **Implications**: How this affects architecture, contracts, or implementation

_Repeat the subsection for each major topic._

## Architecture Pattern Evaluation
List candidate patterns or approaches that were considered.

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| | | | | |

## Design Decisions
Record major decisions that influence `design.md`.

### Decision: `<Title>`
- **Context**: Problem or requirement driving the decision
- **Alternatives Considered**:
  1. Option A — short description
  2. Option B — short description
- **Selected Approach**: What was chosen and how it works
- **Rationale**: Why this approach fits the current project context
- **Trade-offs**: Benefits vs. compromises
- **Follow-up**: Items to verify during implementation or testing

_Repeat the subsection for each decision._

## Risks & Mitigations
- Risk 1 — Proposed mitigation
- Risk 2 — Proposed mitigation

## References
- [Title](https://example.com) — brief note on relevance
