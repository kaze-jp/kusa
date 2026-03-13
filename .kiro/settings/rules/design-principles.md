# Design Document Principles

These principles govern all technical design documents generated during the spec workflow.

## Architecture Decisions

- Every architecture decision MUST include a rationale explaining why it was chosen.
- Document alternatives considered and why they were rejected.
- Reference steering documents (`.ao/steering/tech.md`) for technology constraints.
- Prefer existing patterns in the codebase over introducing new patterns.

## Component Boundaries

- Component boundaries MUST be explicit with clearly defined interfaces.
- Each component must have a single, well-defined responsibility.
- Dependencies between components must be documented and unidirectional where possible.
- No circular dependencies between components.
- Shared state between components must be minimized and explicitly documented.

## API Contracts

- Every API contract MUST specify all input parameters with types and validation rules.
- Every API contract MUST specify the return type and structure.
- Every API contract MUST specify all error cases with error codes and messages.
- Include at least one usage example per API contract.
- Contracts must be versioning-aware if the project uses API versioning.

## Data Models

- All data model fields MUST include type definitions.
- All data models MUST include validation rules (required, min/max, format).
- Relationships between models must be explicitly documented.
- Default values must be specified where applicable.
- Document indexing and query patterns for persistence-backed models.

## General Principles

- No premature optimization in design; optimize only for documented performance requirements.
- Design for testability: components must be testable in isolation.
- Design for observability: specify logging and monitoring touch points.
- Favor composition over inheritance in component design.
- Keep the design at the appropriate abstraction level; avoid pseudo-code unless clarity demands it.
