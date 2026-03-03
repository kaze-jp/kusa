---
description: Generate implementation tasks for a specification
allowed-tools: Read, Write, Edit, MultiEdit, Glob, Grep
argument-hint: <feature-name> [-y] [--sequential]
---

# Implementation Tasks Generator

<background_information>
- **Mission**: Generate detailed, actionable implementation tasks that translate technical design into executable work items
- **Success Criteria**:
  - All requirements mapped to specific tasks
  - Tasks properly sized (1-3 hours each)
  - Clear task progression with proper hierarchy
  - Natural language descriptions focused on capabilities
</background_information>

<instructions>
## Core Task
Generate implementation tasks for feature **$1** based on approved requirements and design.

## Execution Steps

### Step 1: Load Context

**Read all necessary context**:
- `.kiro/specs/$1/spec.json`, `requirements.md`, `design.md`
- `.kiro/specs/$1/tasks.md` (if exists, for merge mode)
- **Entire `.kiro/steering/` directory** for complete project memory

**Validate approvals**:
- If `-y` flag provided ($2 == "-y"): Auto-approve requirements and design in spec.json
- Otherwise: Verify both approved (stop if not, see Safety & Fallback)
- Determine sequential mode based on presence of `--sequential`

### Step 2: Generate Implementation Tasks

**Load generation rules and template**:
- Read `.kiro/settings/rules/tasks-generation.md` for principles
- If `sequential` is **false**: Read `.kiro/settings/rules/tasks-parallel-analysis.md` for parallel judgement criteria
- Read `.kiro/settings/templates/specs/tasks.md` for format

**Generate task list following all rules**:
- Use language specified in spec.json
- Map all requirements to tasks
- When documenting requirement coverage, list numeric requirement IDs only (comma-separated)
- Apply `(P)` markers to tasks that satisfy parallel criteria (omit markers in sequential mode)

### Step 3: Finalize

**Write and update**:
- Create/update `.kiro/specs/$1/tasks.md`
- Update spec.json metadata

## Critical Constraints
- **Follow rules strictly**: All principles in tasks-generation.md are mandatory
- **Natural Language**: Describe what to do, not code structure details
- **Complete Coverage**: ALL requirements must map to tasks
- **Maximum 2 Levels**: Major tasks and sub-tasks only (no deeper nesting)
- **Sequential Numbering**: Major tasks increment (1, 2, 3...), never repeat
</instructions>

## Tool Guidance
- **Read first**: Load all context, rules, and templates before generation
- **Write last**: Generate tasks.md only after complete analysis and verification

## Output Description

出力は以下の統一チェックポイントフォーマットに従う（言語は spec.json 指定に従う）:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛑 CHECKPOINT: タスク生成
[A1]✅━[A2]✅━[A3]✅━[A4]━━[B1]━[B1.5]━[B2]━[B2.5]━[B3]━[B3.5]━━[C1]━[C2]━[C3]━[C4]━[C5]
                          ↑ 現在地
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 完了した作業
- X major tasks, Y sub-tasks 生成
- 全 Z 要件カバー確認済み
- (P) 並列タスク: M 件

## 確認ポイント
- タスクの粒度と優先順位は適切か
- 並列マーカーの判断は妥当か

## 成果物
📄 `.kiro/specs/<feature>/tasks.md`

## 次のアクション
→ approve: タスクを承認し「<feature>を実装して」で実装開始
→ revise: フィードバックを伝えて再生成
```

## Safety & Fallback

### Error Scenarios
- **Requirements or Design Not Approved**: Stop execution, suggest `-y` flag
- **Missing Requirements or Design**: Stop execution, suggest completing previous phases
- **Incomplete Requirements Coverage**: Warning, confirm intentional gaps
- **Template/Rules Missing**: Use inline basic structure with warning

### Next Phase: Implementation

**Before Starting Implementation**:
- Clear conversation history and free up context before running `/kiro:spec-impl`

**If Tasks Approved**:
- Execute specific task: `/kiro:spec-impl $1 1.1`
- Execute multiple tasks: `/kiro:spec-impl $1 1.1,1.2`
- Without arguments: `/kiro:spec-impl $1` (all pending tasks)

**If Modifications Needed**:
- Provide feedback and re-run `/kiro:spec-tasks $1`
