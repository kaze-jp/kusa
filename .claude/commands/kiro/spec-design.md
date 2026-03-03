---
description: Create comprehensive technical design for a specification
allowed-tools: Bash, Glob, Grep, LS, Read, Write, Edit, MultiEdit, Update, WebSearch, WebFetch
argument-hint: <feature-name> [-y]
---

# Technical Design Generator

<background_information>
- **Mission**: Generate comprehensive technical design document that translates requirements (WHAT) into architectural design (HOW)
- **Success Criteria**:
  - All requirements mapped to technical components with clear interfaces
  - Appropriate architecture discovery and research completed
  - Design aligns with steering context and existing patterns
  - Visual diagrams included for complex architectures
</background_information>

<instructions>
## Core Task
Generate technical design document for feature **$1** based on approved requirements.

## Execution Steps

### Step 1: Load Context

**Read all necessary context**:
- `.kiro/specs/$1/spec.json`, `requirements.md`, `design.md` (if exists)
- **Entire `.kiro/steering/` directory** for complete project memory
- `.kiro/settings/templates/specs/design.md` for document structure
- `.kiro/settings/rules/design-principles.md` for design principles
- `.kiro/settings/templates/specs/research.md` for discovery log structure

**Validate requirements approval**:
- If `-y` flag provided ($2 == "-y"): Auto-approve requirements in spec.json
- Otherwise: Verify approval status (stop if unapproved, see Safety & Fallback)

### Step 2: Discovery & Analysis

**Critical: This phase ensures design is based on complete, accurate information.**

1. **Classify Feature Type**:
   - **New Feature** (greenfield) → Full discovery required
   - **Extension** (existing system) → Integration-focused discovery
   - **Simple Addition** (CRUD/UI) → Minimal or no discovery
   - **Complex Integration** → Comprehensive analysis required

2. **Execute Appropriate Discovery Process**:

   **For Complex/New Features**:
   - Read and execute `.kiro/settings/rules/design-discovery-full.md`
   - Conduct thorough research using WebSearch/WebFetch

   **For Extensions**:
   - Read and execute `.kiro/settings/rules/design-discovery-light.md`
   - Focus on integration points, existing patterns, compatibility

   **For Simple Additions**:
   - Skip formal discovery, quick pattern check only

3. **Persist Findings to Research Log**:
- Create or update `.kiro/specs/$1/research.md` using the shared template

### Step 3: Generate Design Document

1. **Load Design Template and Rules**
2. **Generate Design Document** following template structure
3. **Update Metadata** in spec.json

### Step 4: Design Self-Review (AO)

`.claude/agents/reviewer.md` の **Design Review モード（7観点）** に従い、
生成した design.md をメタレビュー。

**判定**:
- PASS → Step 5（Output）へ
- FAIL → design.md を修正 → 再レビュー（最大2回）
- ESCALATE → ユーザーに問題を報告

## Critical Constraints
- **Type Safety**: TypeScript で `any` 禁止。Rust で型安全を保つ
- **Latest Information**: Use WebSearch/WebFetch for external dependencies and best practices
- **Steering Alignment**: Respect existing architecture patterns from steering context
- **Template Adherence**: Follow specs/design.md template structure strictly
- **Design Focus**: Architecture and interfaces ONLY, no implementation code
- **Requirements Traceability IDs**: Use numeric requirement IDs only
</instructions>

## Tool Guidance
- **Read first**: Load all context before taking action
- **Research when uncertain**: Use WebSearch/WebFetch for external dependencies
- **Analyze existing code**: Use Grep to find patterns and integration points
- **Write last**: Generate design.md only after all research and analysis complete

## Output Description

出力は以下の統一チェックポイントフォーマットに従う（言語は spec.json 指定に従う）:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛑 CHECKPOINT: 技術設計
[A1]✅━[A2]✅━[A3]━[A4]━━[B1]━[B1.5]━[B2]━[B2.5]━[B3]━[B3.5]━━[C1]━[C2]━[C3]━[C4]━[C5]
                    ↑ 現在地
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 完了した作業
- Discovery: <full/light/minimal> — <key findings 2-3 bullets>
- Design Self-Review: <各観点 ✅/⚠️/❌ サマリー>

## 確認ポイント
- <この設計固有の判断ポイント>

## 成果物
📄 `.kiro/specs/<feature>/design.md`
📄 `.kiro/specs/<feature>/research.md`

## 次のアクション
→ approve: 設計を承認し `/kiro:spec-tasks <feature> -y` でタスク生成へ
→ revise: フィードバックを伝えて再生成
→ show-detail: セルフレビュー詳細を表示
```

## Safety & Fallback

### Error Scenarios

**Requirements Not Approved**:
- **Stop Execution**: Cannot proceed without approved requirements
- **Suggested Action**: "Run `/kiro:spec-design $1 -y` to auto-approve requirements and proceed"

**Missing Requirements**:
- **Stop Execution**: Requirements document must exist
- **Suggested Action**: "Run `/kiro:spec-requirements $1` to generate requirements first"

**Template Missing**:
- **Fallback**: Use inline basic structure with warning

### Next Phase: Task Generation

**If Design Approved**:
- Run `/kiro:spec-tasks $1 -y` to generate implementation tasks

**If Modifications Needed**:
- Provide feedback and re-run `/kiro:spec-design $1`
