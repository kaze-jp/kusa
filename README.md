# kusa

A lightweight, fast Markdown editor and viewer for AI developers.

Built with [Tauri v2](https://v2.tauri.app/) (SolidJS + Rust). No Electron, no bundled Chromium.

## Install

### Homebrew (macOS)

```sh
brew install gene/tap/kusa
```

### Manual install (macOS)

1. Download the `.dmg` from the [latest release](https://github.com/kaze-jp/kusa/releases/latest)
2. Open the `.dmg` and drag `kusa.app` to `/Applications`
3. Symlink the CLI binary to your PATH:
   ```sh
   ln -sf /Applications/kusa.app/Contents/MacOS/kusa /usr/local/bin/kusa
   ```

### Build from source

Requirements: Rust, Node.js 22+, pnpm

```sh
git clone https://github.com/kaze-jp/kusa.git
cd kusa
pnpm install
pnpm tauri build
```

The built `.dmg` will be in `src-tauri/target/release/bundle/dmg/`.

## Usage

```sh
# Open a file
kusa README.md

# Open a directory (shows file list)
kusa .

# Pipe content
cat notes.md | kusa

# Read from clipboard
kusa -c

# Peek mode (small overlay window)
kusa -p notes.md

# Open from URL
kusa https://raw.githubusercontent.com/user/repo/main/README.md
```

## Features

- **Instant Open** -- CLI args, file drop, pipe, clipboard, URL
- **Vim-First Editing** -- CodeMirror 6 with vim mode
- **Beautiful Preview** -- GitHub-flavored Markdown with syntax highlighting
- **Split View** -- Editor + preview side by side
- **Peek Mode** -- Small overlay window for quick reading
- **Dark Theme** -- Default dark theme
- **AI Context Aware** -- CLAUDE.md, AGENTS.md, .cursorrules support
- **Lightweight** -- Native app, no Electron

## Development

```sh
pnpm install
pnpm tauri dev
```

## License

MIT
