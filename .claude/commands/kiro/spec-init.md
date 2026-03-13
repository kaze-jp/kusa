# Initialize Feature Spec

Initialize a new feature specification directory and generate initial requirements.

## Usage

```
/kiro:spec-init <feature-name>
```

## Instructions

1. **Read product context** from `.ao/steering/product.md` if it exists. Use this to understand the product vision, target users, and strategic goals.

2. **Create the spec directory** at `.kiro/specs/$FEATURE_NAME/`.

3. **Gather feature information** by asking the user:
   - What is the feature's purpose?
   - Who are the target users?
   - What problem does it solve?
   - Are there any known constraints?

4. **Generate `requirements-init.md`** in the spec directory with the following structure:

```markdown
# Feature: <feature-name>

## Overview
<Brief description of the feature and its purpose>

## Product Context
<Relevant context from product.md>

## Initial Requirements

### Functional Requirements
<List requirements using EARS format>

### Non-Functional Requirements
<Performance, security, accessibility requirements using EARS format>

### Constraints
<Known constraints and limitations>

### Assumptions
<Assumptions made during requirements gathering>

### Open Questions
<Questions that need answers before proceeding>
```

5. **Apply EARS format** for all requirements:
   - Ubiquitous: "The <system> shall <action>"
   - Event-driven: "When <event>, the <system> shall <action>"
   - State-driven: "While <state>, the <system> shall <action>"
   - Optional: "Where <condition>, the <system> shall <action>"
   - Unwanted: "If <unwanted>, the <system> shall <action>"

6. **Confirm with the user** that the initial requirements capture their intent before finalizing.

7. **Report** the created file path and suggest running `/kiro:spec-requirements` next to expand into full requirements.

## Output

- `.kiro/specs/<feature-name>/requirements-init.md`

## Notes

- Feature names should use kebab-case (e.g., `user-auth`, `payment-flow`).
- If `.ao/steering/product.md` does not exist, proceed without product context but note the gap.
- Each requirement should be individually numbered (e.g., FR-001, NFR-001).
