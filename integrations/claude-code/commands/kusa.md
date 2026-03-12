---
name: kusa
description: "Open markdown files in kusa for beautiful rendered preview and review"
---

# /kusa - Markdown Viewer

Open the specified file or directory in kusa (Markdown editor/viewer).

## Usage
```
/kusa $ARGUMENTS
```

## Behavior

1. If `$ARGUMENTS` is a specific file path, open it directly with `kusa <file>`
2. If `$ARGUMENTS` is a directory (or `.`), open it with `kusa <dir>`
3. If `$ARGUMENTS` is empty or vague, identify the most relevant markdown file(s) in the current context and suggest which to open
4. If `$ARGUMENTS` describes content (e.g., "the README", "design doc"), find the matching file and open it

## Execution

Run via Bash:
```bash
kusa <resolved_path>
```

kusa launches asynchronously (returns immediately), so no need to run in background.

## Examples
```
/kusa README.md          # Open specific file
/kusa .                  # Open current directory
/kusa                    # Suggest relevant markdown files
/kusa design doc         # Find and open the design document
```
