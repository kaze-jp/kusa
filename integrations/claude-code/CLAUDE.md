# kusa Integration

`kusa` is a Markdown editor/viewer installed via Homebrew (`brew install kaze-jp/tap/kusa`).
Use it to give the user a beautiful rendered preview of markdown content.

## Auto-launch Rules

When you determine the user should visually review markdown content, automatically run `kusa <file>` via Bash to open it. This applies when:

- You generate a report, summary, or analysis and write it as a markdown file
- The user asks you to "show", "display", or "open" a markdown file
- You finish creating or significantly editing a markdown document and the user would benefit from seeing the rendered result
- You write documentation, specs, or design docs to a file

Do NOT auto-launch kusa when:
- The user is just asking about file contents (use Read instead)
- You are reading files for your own analysis
- The change is minor (typo fix, single line edit)

`kusa` returns immediately (async launch), so just run it normally via Bash.
