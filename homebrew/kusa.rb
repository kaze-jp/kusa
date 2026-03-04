# Homebrew Cask formula for kusa
# This file is a template. To use it:
#   1. Create a separate repo: github.com/gene/homebrew-tap
#   2. Place this file at Casks/kusa.rb in that repo
#   3. Update the version, sha256, and URL after each release
#
# Users can then install with:
#   brew tap gene/tap
#   brew install gene/tap/kusa
# Or in one command:
#   brew install gene/tap/kusa

cask "kusa" do
  arch arm: "aarch64", intel: "x64"

  version "0.1.0"

  sha256 arm:   "REPLACE_WITH_ARM64_SHA256",
         intel: "REPLACE_WITH_X86_64_SHA256"

  url "https://github.com/kaze-jp/kusa/releases/download/v#{version}/kusa_#{version}_#{arch}.dmg",
      verified: "github.com/kaze-jp/kusa/"

  name "kusa"
  desc "Markdown editor for AI developers"
  homepage "https://github.com/kaze-jp/kusa"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on macos: ">= :catalina"

  app "kusa.app"

  # Symlink the CLI binary so `kusa` is available in PATH
  binary "#{appdir}/kusa.app/Contents/MacOS/kusa"

  zap trash: [
    "~/Library/Application Support/jp.kaze.kusa",
    "~/Library/Caches/jp.kaze.kusa",
    "~/Library/Preferences/jp.kaze.kusa.plist",
    "~/Library/Saved Application State/jp.kaze.kusa.savedState",
  ]
end
