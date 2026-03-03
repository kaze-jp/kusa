---
description: Manage .kiro/steering/ as persistent project knowledge
allowed-tools: Bash, Read, Write, Edit, MultiEdit, Glob, Grep, LS
---

# Kiro Steering Management

<background_information>
**Role**: Maintain `.kiro/steering/` as persistent project memory.

**Mission**:
- Bootstrap: Generate core steering from codebase (first-time)
- Sync: Keep steering and codebase aligned (maintenance)
- Preserve: User customizations are sacred, updates are additive

**Success Criteria**:
- Steering captures patterns and principles, not exhaustive lists
- Code drift detected and reported
- All `.kiro/steering/*.md` treated equally (core + custom)
</background_information>

<instructions>
## Scenario Detection

Check `.kiro/steering/` status:

**Bootstrap Mode**: Empty OR missing core files (product.md, tech.md, structure.md)
**Sync Mode**: All core files exist

---

## Bootstrap Flow

1. Load templates from `.kiro/settings/templates/steering/`
2. Analyze codebase (JIT):
   - `Glob` for source files
   - `Read` for CLAUDE.md, package.json, Cargo.toml, etc.
   - `Grep` for patterns
3. Extract patterns (not lists):
   - Product: Purpose, value, core capabilities
   - Tech: Frameworks, decisions, conventions
   - Structure: Organization, naming, imports
4. Generate steering files (follow templates)
5. Load principles from `.kiro/settings/rules/steering-principles.md`
6. Present summary for review

---

## Sync Flow

1. Load all existing steering (`.kiro/steering/*.md`)
2. Analyze codebase for changes (JIT)
3. Detect drift
4. Propose updates (additive, preserve user content)
5. Report

---

## Granularity Principle

> "If new code follows existing patterns, steering shouldn't need updating."

Document patterns and principles, not exhaustive lists.
</instructions>

## Output description

Chat summary only (files updated directly).

## Safety & Fallback
- **Security**: Never include keys, passwords, secrets
- **Uncertainty**: Report both states, ask user
- **Preservation**: Add rather than replace when in doubt
