# Homebrew Tap - Implementation Tasks

## Task 1: Update Tauri Bundle Configuration
- [x] Review existing `tauri.conf.json` bundle section
- [x] Add macOS-specific bundle settings (category, DMG config)
- [x] Verify file associations are configured

## Task 2: Create CI Workflow
- [x] Create `.github/workflows/ci.yml`
- [x] Configure triggers (push, PR)
- [x] Add lint, type-check, cargo check steps
- [x] Setup Rust, Node.js, bun

## Task 3: Create Release Workflow
- [x] Create `.github/workflows/release.yml`
- [x] Configure trigger (push tag `v*`)
- [x] Use `tauri-apps/tauri-action` for build
- [x] Build for macOS arm64 and x86_64
- [x] Upload artifacts to GitHub Release
- [x] Include code signing env vars (optional)

## Task 4: Create Homebrew Cask Formula Template
- [x] Create `homebrew/kusa.rb` cask formula
- [x] Configure download from GitHub Releases
- [x] Add CLI binary symlink
- [x] Document separate homebrew-tap repo requirement

## Task 5: Create Release Guide
- [x] Create `.github/RELEASE_GUIDE.md`
- [x] Document code signing setup
- [x] Document notarization steps
- [x] List required environment variables/secrets
- [x] Document release process

## Task 6: Create README
- [x] Add installation via Homebrew section
- [x] Add manual installation instructions
- [x] Add build from source instructions
- [x] Add project description and usage
