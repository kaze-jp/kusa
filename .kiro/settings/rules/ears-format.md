# EARS Format Rules

All requirements must follow the EARS (Easy Approach to Requirements Syntax) format. This ensures requirements are unambiguous, testable, and consistently structured.

## Patterns

### Ubiquitous (always active)
**Template**: "The <system> shall <action>."

Use when the requirement applies at all times without any trigger or condition.

**Example**: "The system shall encrypt all data at rest using AES-256."

### Event-Driven (triggered by an event)
**Template**: "When <event>, the <system> shall <action>."

Use when the requirement is triggered by a specific, detectable event.

**Example**: "When a user submits the login form, the system shall validate the credentials within 2 seconds."

### State-Driven (active during a state)
**Template**: "While <state>, the <system> shall <action>."

Use when the requirement applies only while the system is in a specific state.

**Example**: "While the system is in maintenance mode, the system shall display a maintenance page to all users."

### Optional (conditional on a feature or configuration)
**Template**: "Where <condition>, the <system> shall <action>."

Use when the requirement applies only under a specific condition or configuration.

**Example**: "Where the user has enabled two-factor authentication, the system shall require a verification code after password entry."

### Unwanted (handling negative scenarios)
**Template**: "If <unwanted situation>, the <system> shall <action>."

Use when specifying how the system handles error states, failures, or unwanted conditions.

**Example**: "If the database connection is lost, the system shall retry the connection three times with exponential backoff."

## Rules

- Every requirement MUST use exactly one of the five EARS patterns.
- Do NOT use ambiguous words: "should", "may", "might", "could", "would".
- Do NOT combine multiple behaviors in a single requirement; split them.
- Each requirement MUST be independently testable.
- Requirements MUST NOT describe implementation details (no "use React", "call the API").
- Requirements MUST specify measurable criteria where applicable (timeouts, limits, thresholds).
- Number all requirements with a prefix and sequential ID (e.g., FR-001, NFR-001).
