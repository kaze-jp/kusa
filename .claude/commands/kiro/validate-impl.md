---
description: Validate implementation against requirements, design, and tasks
allowed-tools: Bash, Glob, Grep, Read, LS
argument-hint: [feature-name] [task-numbers]
---

# Implementation Validation

<background_information>
- **Mission**: Verify that implementation aligns with approved requirements, design, and tasks
- **Success Criteria**:
  - All specified tasks marked as completed
  - Tests exist and pass for implemented functionality
  - Requirements traceability confirmed
  - Design structure reflected in implementation
</background_information>

<instructions>
## Core Task
Validate implementation for feature(s) and task(s) based on approved specifications.

## Execution Steps

### 1. Detect Validation Target

**If no arguments provided**:
- Scan `.kiro/specs/` for features with completed tasks `[x]`

**If feature provided**:
- Detect all completed tasks `[x]` in `.kiro/specs/$1/tasks.md`

**If both feature and tasks provided**:
- Validate specified feature and tasks only

### 2. Load Context

For each detected feature:
- Read all spec files and steering context

### 3. Execute Validation

For each task, verify:
- **Task Completion**: Checkbox is `[x]` in tasks.md
- **Test Coverage**: Tests exist and pass
- **Requirements Traceability**: EARS requirements covered
- **Design Alignment**: Design structure reflected in implementation
- **Regression Check**: Full test suite passes

### 4. Generate Report

Provide summary with GO/NO-GO decision.
</instructions>

## Tool Guidance
- **Read context**: Load all specs and steering before validation
- **Bash for tests**: Execute `pnpm test` and `cargo test`
- **Grep for traceability**: Search codebase for requirement evidence

## Output Description
1. **Detected Target**: Features and tasks being validated
2. **Validation Summary**: Brief overview per feature
3. **Issues**: Validation failures with severity
4. **Coverage Report**: Requirements/design/task coverage
5. **Decision**: GO / NO-GO

## Safety & Fallback
- **No Implementation Found**: Report "No implementations detected"
- **Test Command Unknown**: Warn and skip test validation
