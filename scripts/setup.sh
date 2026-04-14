#!/usr/bin/env bash
set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}▶${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $1"; }
error()   { echo -e "${RED}✗${NC} $1"; exit 1; }

echo ""
echo "  Status Monitor — setup"
echo "  ─────────────────────────────────────────"
echo ""

# ── Prerequisites ─────────────────────────────────────────────────
info "Checking prerequisites..."

command -v brew >/dev/null 2>&1 \
  || error "Homebrew not found. Install it first: https://brew.sh"

command -v node >/dev/null 2>&1 \
  || error "Node.js not found. Run: brew install node"

command -v pnpm >/dev/null 2>&1 \
  || error "pnpm not found. Run: brew install pnpm"

NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
[ "$NODE_MAJOR" -ge 18 ] \
  || error "Node.js 18+ required (current: $(node --version)). Run: brew upgrade node"

success "Prerequisites OK"

# ── SwiftBar ──────────────────────────────────────────────────────
if brew list --cask swiftbar >/dev/null 2>&1 || [ -d "/Applications/SwiftBar.app" ]; then
  success "SwiftBar already installed"
else
  info "Installing SwiftBar..."
  brew install --cask swiftbar
  success "SwiftBar installed"
fi

# ── Plugins folder ────────────────────────────────────────────────
PLUGINS_DIR="$HOME/Library/Application Support/SwiftBar/Plugins"
mkdir -p "$PLUGINS_DIR"
success "Plugins folder ready"

# ── Configure SwiftBar ────────────────────────────────────────────
defaults write com.ameba.SwiftBar PluginDirectory "$PLUGINS_DIR"
success "SwiftBar configured"

# ── Build + install plugin ────────────────────────────────────────
info "Installing dependencies..."
pnpm install --frozen-lockfile

info "Building and installing plugin..."
pnpm install-plugin
success "Plugin installed"

# ── Launch SwiftBar ───────────────────────────────────────────────
info "Launching SwiftBar..."
# Restart if already running so it picks up the new plugin folder config
pkill -x SwiftBar 2>/dev/null || true
sleep 1
open -a SwiftBar

echo ""
echo "  ✅ All done!"
echo ""
echo "  Look for the blue checkmark icon in your macOS menu bar."
echo "  Click it to see the live status of GitHub and Claude."
echo ""
