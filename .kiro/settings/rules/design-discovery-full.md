# Full Discovery Process for Technical Design

## Objective
Conduct comprehensive research and analysis to ensure the technical design is based on complete, accurate, and up-to-date information.

## Discovery Steps

### 1. Requirements Analysis
**Map Requirements to Technical Needs**
- Extract all functional requirements from EARS format
- Identify non-functional requirements (performance, security, scalability)
- Determine technical constraints and dependencies
- List core technical challenges

### 2. Existing Implementation Analysis
**Understand Current System** (if modifying/extending):
- Analyze codebase structure and architecture patterns
- Map reusable components, services, utilities
- Identify domain boundaries and data flows
- Document integration points and dependencies
- Determine approach: extend vs refactor vs wrap

### 3. Technology Research
**Investigate Best Practices and Solutions**:
- **Use WebSearch** to find:
  - Latest architectural patterns for similar problems
  - SolidJS / Tauri v2 best practices
  - CodeMirror 6 extension patterns
  - unified/remark ecosystem usage
  - Common pitfalls and solutions

- **Use WebFetch** to analyze:
  - Official documentation for frameworks/libraries
  - API references and usage examples
  - Migration guides and breaking changes
  - Performance benchmarks and comparisons

### 4. External Dependencies Investigation
**For Each External Service/Library**:
- Search for official documentation and GitHub repositories
- Verify API signatures and compatibility
- Check version compatibility with existing stack
- Investigate known issues
- Document security considerations

### 5. Architecture Pattern & Boundary Analysis
**Evaluate Architectural Options**:
- Compare relevant patterns for desktop apps (MVC, Flux, etc.)
- Assess fit with Tauri v2 + SolidJS architecture
- Identify frontend/backend boundaries
- Consider performance implications
- Document preferred pattern in `research.md`

### 6. Risk Assessment
**Identify Technical Risks**:
- Performance bottlenecks (large file handling, markdown parsing)
- Security vulnerabilities (file system access, XSS)
- Integration complexity (CodeMirror + SolidJS, Tauri IPC)
- Technical debt creation vs resolution
- Platform-specific issues (macOS, Linux, Windows)

## Output Requirements
Capture all findings in `research.md`:
- Key insights affecting architecture
- Constraints discovered during research
- Recommended approaches with rationale
- Rejected alternatives and trade-offs
- Risks and mitigation strategies
