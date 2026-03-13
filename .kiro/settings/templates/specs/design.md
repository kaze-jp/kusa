# {{FEATURE_NAME}} — Technical Design

> Generated from approved requirements

## Architecture Overview

{{High-level architecture description}}

## Component Design

### Component 1: {{name}}

- **Responsibility:** {{description}}
- **Interface:**
  ```typescript
  // API contract
  ```
- **Dependencies:** {{list}}

## Data Models

### Model: {{name}}

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| {{field}} | {{type}} | {{constraints}} | {{description}} |

## API Contracts

### Endpoint: {{method}} {{path}}

- **Request:** {{schema}}
- **Response:** {{schema}}
- **Error Cases:**
  - {{status}}: {{description}}

## Error Handling Strategy

- {{strategy}}

## Security Considerations

- {{consideration}}

## Performance Considerations

- {{consideration}}

## Testing Strategy

- Unit tests: {{approach}}
- Integration tests: {{approach}}

---

**Status:** ⏳ Awaiting R2 approval
**Next:** After approval, run `/kiro:spec-tasks` to generate implementation tasks.
