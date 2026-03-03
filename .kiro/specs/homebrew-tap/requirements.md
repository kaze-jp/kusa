# Homebrew Tap - Requirements

## Overview

Set up Homebrew distribution pipeline so users can install kusa via `brew install gene/tap/kusa`.
This includes CI/CD for automated release builds, Homebrew formula template, and documentation.

## Requirements (EARS Format)

### REQ-1: Release Build Pipeline
**When** a git tag matching `v*` is pushed,
**the system shall** trigger a GitHub Actions workflow that builds the Tauri app for macOS (arm64 and x86_64), creates a GitHub Release, and uploads the `.dmg` artifacts.

### REQ-2: CI Workflow
**When** code is pushed or a pull request is opened,
**the system shall** run lint, type-check, and cargo check to verify the build compiles.

### REQ-3: Tauri Bundle Configuration
**The system shall** have a properly configured `tauri.conf.json` bundle section with macOS-specific settings for `.dmg` and `.app` bundle generation.

### REQ-4: Homebrew Formula
**The system shall** provide a Homebrew Cask formula template that downloads the macOS `.dmg` from GitHub Releases and links the CLI binary to PATH.

### REQ-5: Code Signing Documentation
**The system shall** document the required steps and environment variables for macOS code signing and notarization (Apple Developer account required).

### REQ-6: Installation Documentation
**The system shall** provide README documentation covering Homebrew installation, manual installation, and building from source.

### REQ-7: CLI Binary PATH Registration
**When** the user installs kusa via Homebrew,
**the system shall** ensure the `kusa` CLI binary is available in the user's PATH.

## Acceptance Criteria

- [ ] `tauri build` configuration is correct for macOS bundle generation
- [ ] GitHub Actions release workflow triggers on `v*` tags
- [ ] GitHub Actions CI workflow runs on push and PR
- [ ] Homebrew Cask formula template is valid
- [ ] Code signing/notarization steps are documented
- [ ] README has installation instructions
- [ ] Release guide documents manual setup steps
