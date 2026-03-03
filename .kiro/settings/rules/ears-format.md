# EARS Format Guidelines

## Overview
EARS (Easy Approach to Requirements Syntax) is the standard format for acceptance criteria in spec-driven development.

EARS patterns describe the logical structure of a requirement (condition + subject + response) and are not tied to any particular natural language.
All acceptance criteria should be written in the target language configured for the specification (for example, `spec.json.language` / `ja`).
Keep EARS trigger keywords and fixed phrases in English (`When`, `If`, `While`, `Where`, `The system shall`, `The [system] shall`) and localize only the variable parts (`[event]`, `[precondition]`, `[trigger]`, `[feature is included]`, `[response/action]`) into the target language. Do not interleave target-language text inside the trigger or fixed English phrases themselves.

## Primary EARS Patterns

### 1. Event-Driven Requirements
- **Pattern**: When [event], the [system] shall [response/action]
- **Use Case**: Responses to specific events or triggers
- **Example**: When user opens a markdown file, kusa shall render the preview within 200ms

### 2. State-Driven Requirements
- **Pattern**: While [precondition], the [system] shall [response/action]
- **Use Case**: Behavior dependent on system state or preconditions
- **Example**: While in edit mode, kusa shall display the CodeMirror editor with vim keybindings

### 3. Unwanted Behavior Requirements
- **Pattern**: If [trigger], the [system] shall [response/action]
- **Use Case**: System response to errors, failures, or undesired situations
- **Example**: If file read fails, kusa shall display an error message with the file path

### 4. Optional Feature Requirements
- **Pattern**: Where [feature is included], the [system] shall [response/action]
- **Use Case**: Requirements for optional or conditional features
- **Example**: Where split view is active, kusa shall synchronize scroll position between editor and preview

### 5. Ubiquitous Requirements
- **Pattern**: The [system] shall [response/action]
- **Use Case**: Always-active requirements and fundamental system properties
- **Example**: kusa shall use dark theme as the default color scheme

## Combined Patterns
- While [precondition], when [event], the [system] shall [response/action]
- When [event] and [additional condition], the [system] shall [response/action]

## Subject Selection Guidelines
- **Desktop Application**: Use app name (e.g., "kusa", "the editor", "the preview pane")
- **Backend (Rust)**: Use component name (e.g., "the file handler", "the CLI parser")
- **Frontend (SolidJS)**: Use component name (e.g., "the editor component", "the toolbar")

## Quality Criteria
- Requirements must be testable, verifiable, and describe a single behavior.
- Use objective language: "shall" for mandatory behavior, "should" for recommendations; avoid ambiguous terms.
- Follow EARS syntax: [condition], the [system] shall [response/action].
