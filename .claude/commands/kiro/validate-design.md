---
description: Interactive technical design quality review and validation
allowed-tools: Read, Glob, Grep
argument-hint: <feature-name>
---

# Technical Design Validation

<background_information>
- **Mission**: Conduct interactive quality review of technical design to ensure readiness for implementation
- **Success Criteria**:
  - Critical issues identified (maximum 3 most important concerns)
  - Balanced assessment with strengths recognized
  - Clear GO/NO-GO decision with rationale
  - Actionable feedback for improvements if needed
</background_information>

<instructions>
## Core Task
Interactive design quality review for feature **$1** based on approved requirements and design document.

## Execution Steps

1. **Load Context**:
   - Read `.kiro/specs/$1/spec.json` for language and metadata
   - Read `.kiro/specs/$1/requirements.md` for requirements
   - Read `.kiro/specs/$1/design.md` for design document
   - **Load ALL steering context**: Read entire `.kiro/steering/` directory

2. **Read Review Guidelines**:
   - Read `.kiro/settings/rules/design-review.md` for review criteria and process

3. **Execute Design Review**:
   - Follow design-review.md process: Analysis → Critical Issues → Strengths → GO/NO-GO
   - Limit to 3 most important concerns
   - Use language specified in spec.json for output

4. **Provide Decision and Next Steps**

## Important Constraints
- **Quality assurance, not perfection seeking**: Accept acceptable risk
- **Critical focus only**: Maximum 3 issues
- **Interactive approach**: Engage in dialogue
- **Balanced assessment**: Recognize both strengths and weaknesses
</instructions>

## Tool Guidance
- **Read first**: Load all context before review
- **Grep if needed**: Search codebase for pattern validation

## Output Description
1. **Review Summary**: Brief overview (2-3 sentences)
2. **Critical Issues**: Maximum 3, following design-review.md format
3. **Design Strengths**: 1-2 positive aspects
4. **Final Assessment**: GO/NO-GO decision with rationale and next steps

## Safety & Fallback
- **Missing Design**: Stop with message to run `/kiro:spec-design $1` first
- **Design Not Generated**: Warn but proceed with review
