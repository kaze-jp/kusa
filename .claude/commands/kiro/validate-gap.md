---
description: Analyze implementation gap between requirements and existing codebase
allowed-tools: Bash, Glob, Grep, Read, Write, Edit, MultiEdit, WebSearch, WebFetch
argument-hint: <feature-name>
---

# Implementation Gap Validation

<background_information>
- **Mission**: Analyze the gap between requirements and existing codebase to inform implementation strategy
- **Success Criteria**:
  - Comprehensive understanding of existing codebase patterns
  - Clear identification of missing capabilities
  - Multiple viable implementation approaches evaluated
</background_information>

<instructions>
## Core Task
Analyze implementation gap for feature **$1** based on approved requirements and existing codebase.

## Execution Steps

1. **Load Context**:
   - Read `.kiro/specs/$1/spec.json` and `requirements.md`
   - **Load ALL steering context**

2. **Read Analysis Guidelines**:
   - Read `.kiro/settings/rules/gap-analysis.md`

3. **Execute Gap Analysis**:
   - Follow gap-analysis.md framework
   - Analyze existing codebase
   - Evaluate implementation approaches

4. **Generate Analysis Document**

## Important Constraints
- **Information over Decisions**: Provide analysis and options, not final choices
- **Multiple Options**: Present viable alternatives
- **Thorough Investigation**: Use tools to deeply understand existing codebase
</instructions>

## Tool Guidance
- **Read first**: Load all context before analysis
- **Grep extensively**: Search codebase for patterns
- **WebSearch/WebFetch**: Research external dependencies when needed

## Output Description
1. **Analysis Summary**: 3-5 bullets
2. **Next Steps**: Guide to design phase

## Safety & Fallback
- **Missing Requirements**: Stop, suggest running spec-requirements first
- **Complex Integration Unclear**: Flag for research in design phase
