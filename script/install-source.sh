#!/usr/bin/env bash
#
# install-source.sh — build and install OpenCode from this source tree.
#
# Produces a ready-to-use installation with no manual follow-up steps:
#   * installs dependencies and builds the single-file binary
#   * installs the binary and its companion MemPalace Python modules together
#   * offers the two optional memory features (MemPalace, memory enhancement)
#   * initialises and verifies whichever optional features were selected
#   * verifies that provider credentials found in the environment are picked up
#
# Both optional prompts default to "no": pressing Enter keeps OpenCode fully
# usable without either feature.
#
# Usage:
#   ./script/install-source.sh [options]
#
# Options:
#   -y, --yes                 Accept both optional memory features
#   -n, --no                  Decline both optional memory features
#       --mempalace=yes|no    Choose the MemPalace feature explicitly
#       --memory=yes|no       Choose the memory enhancement explicitly
#       --non-interactive     Never prompt; unset choices are declined
#       --install-dir <dir>   Where to install the binary
#                             (default: /usr/local/bin when writable, else
#                             $HOME/.opencode/bin)
#       --no-modify-path      Do not add the install dir to shell config
#       --skip-build          Reuse an existing dist/ build
#       --skip-global-tools   Do not link project tools into the global config
#   -h, --help                Show this help

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

MUTED='\033[0;2m'
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

say() { printf '%b\n' "$*"; }
say_err() { printf '%b\n' "$*" >&2; }
info() { say "${CYAN}$*${NC}"; }
ok() { say "${GREEN}$*${NC}"; }
warn() { say "${YELLOW}warning: $*${NC}"; }
die() {
  say "${RED}error: $*${NC}" >&2
  exit 1
}

# ── Argument parsing ─────────────────────────────────────────────────────

ASSUME_YES=0
ASSUME_NO=0
CHOICE_MEMPALACE=""
CHOICE_MEMORY=""
NON_INTERACTIVE=0
INSTALL_DIR=""
MODIFY_PATH=1
SKIP_BUILD=0
SKIP_GLOBAL_TOOLS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -y|--yes) ASSUME_YES=1 ;;
    -n|--no) ASSUME_NO=1 ;;
    --mempalace=*) CHOICE_MEMPALACE="${1#*=}" ;;
    --memory=*) CHOICE_MEMORY="${1#*=}" ;;
    --non-interactive) NON_INTERACTIVE=1 ;;
    --install-dir)
      [[ -n "${2:-}" ]] || die "--install-dir requires a path"
      INSTALL_DIR="$2"
      shift
      ;;
    --no-modify-path) MODIFY_PATH=0 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --skip-global-tools) SKIP_GLOBAL_TOOLS=1 ;;
    -h|--help)
      sed -n '2,32p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) die "unknown option: $1 (see --help)" ;;
  esac
  shift
done

if [[ "$ASSUME_YES" == "1" && "$ASSUME_NO" == "1" ]]; then
  die "--yes and --no are mutually exclusive"
fi

lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }

normalize_choice() {
  case "$(lower "$1")" in
    y|yes) echo "yes" ;;
    n|no|"") echo "no" ;;
    *) echo "" ;;
  esac
}

# ── Prerequisite checks ──────────────────────────────────────────────────

need() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required but was not found on PATH"
}

info "Checking prerequisites"
need bun
need python3
bun_version="$(bun --version 2>/dev/null || echo unknown)"
python_version="$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:3])))' 2>/dev/null || echo unknown)"
ok "  bun ${bun_version}"
ok "  python3 ${python_version}"

python_ok() {
  python3 - "$1" "$2" <<'PY'
import sys
parts = sys.argv[1].split(".")
try:
    major, minor = int(parts[0]), int(parts[1])
except Exception:
    sys.exit(1)
sys.exit(0 if (major, minor) >= tuple(int(x) for x in sys.argv[2].split(".")) else 1)
PY
}

# The bundled enhancement needs a modern Python for dataclasses/typing features.
python_ok "$python_version" "3.9" || die "python3 >= 3.9 is required (found ${python_version})"

# ── Optional feature prompts ─────────────────────────────────────────────

can_prompt() {
  [[ "$NON_INTERACTIVE" == "0" && -t 0 ]]
}

# ask_feature <name> <details-function>; echoes yes|no
ask_feature() {
  local title="$1"
  local body="$2"

  if [[ "$ASSUME_YES" == "1" ]]; then
    echo "yes"
    return
  fi
  if [[ "$ASSUME_NO" == "1" ]]; then
    echo "no"
    return
  fi
  if ! can_prompt; then
    echo "no"
    return
  fi

  # UI goes to stderr because stdout is captured by the caller to obtain the
  # answer; mixing them would put the prompt text into the variable.
  say_err ""
  say_err "${BOLD}${title}${NC}"
  say_err "${body}"
  say_err ""
  local answer
  read -r -p "$(printf '%b' "${BOLD}Install? [y/N] ${NC}")" answer || answer=""
  normalize_choice "$answer"
}

MEMPALACE_BODY=$(cat <<'EOF'
  Adds the external MemPalace package (pip install mempalace) and enables:
    - semantic search over past context (ChromaDB embeddings)
    - a knowledge graph of entities and relationships
    - a session diary for cross-session continuity
    - project-scoped drawers stored under ~/.local/share/opencode/

  Without it, OpenCode still works and the bundled memory enhancement (if
  selected) falls back to keyword-only recall. No vector search, no knowledge
  graph, and no diary.
EOF
)

MEMORY_BODY=$(cat <<'EOF'
  Enables the memory enhancement bundled in this repository (no extra package
  required): a structured memory store with typed entries and lifecycle
  (update, supersede, delete), plus:
    - rank-fusion retrieval across keyword, vector, graph and time signals
    - associative recall by traversing links between memories
    - natural-language time windows ("last week", "in March 2026")
    - automatic contradiction detection and evidence accumulation

  It works on its own with SQLite keyword search. Select MemPalace above too
  for semantic/vector recall, which makes this noticeably stronger.
EOF
)

if [[ -n "$CHOICE_MEMPALACE" ]]; then
  CHOICE_MEMPALACE="$(normalize_choice "$CHOICE_MEMPALACE")"
  [[ -n "$CHOICE_MEMPALACE" ]] || die "--mempalace expects yes or no"
else
  CHOICE_MEMPALACE="$(ask_feature "Optional: MemPalace (semantic memory)" "$MEMPALACE_BODY")"
fi

if [[ -n "$CHOICE_MEMORY" ]]; then
  CHOICE_MEMORY="$(normalize_choice "$CHOICE_MEMORY")"
  [[ -n "$CHOICE_MEMORY" ]] || die "--memory expects yes or no"
else
  CHOICE_MEMORY="$(ask_feature "Optional: Memory enhancement (structured memory)" "$MEMORY_BODY")"
fi

say ""
say "  MemPalace:          ${CHOICE_MEMPALACE}"
say "  Memory enhancement: ${CHOICE_MEMORY}"
say ""

# MemPalace requires Python 3.12+.
if [[ "$CHOICE_MEMPALACE" == "yes" ]] && ! python_ok "$python_version" "3.12"; then
  warn "MemPalace requires Python 3.12+ but ${python_version} was found; skipping MemPalace."
  CHOICE_MEMPALACE="no"
fi

# ── Install MemPalace (optional) ─────────────────────────────────────────

install_mempalace() {
  if python3 -c 'import mempalace' >/dev/null 2>&1; then
    ok "MemPalace is already installed"
    return 0
  fi

  info "Installing MemPalace"
  local log
  log="$(mktemp)"

  # 1. Normal user install.
  if python3 -m pip install --user --upgrade mempalace >"$log" 2>&1; then
    ok "MemPalace installed"
    return 0
  fi

  # 2. PEP 668 "externally managed" environments.
  if grep -qiE "externally[- ]managed|break-system-packages" "$log"; then
    warn "Python is externally managed; retrying with --break-system-packages"
    if python3 -m pip install --user --upgrade --break-system-packages mempalace >"$log" 2>&1; then
      ok "MemPalace installed"
      return 0
    fi
  fi

  # 3. Missing pip.
  if grep -qiE "no module named pip" "$log"; then
    warn "pip is unavailable; attempting ensurepip"
    if python3 -m ensurepip --user >"$log" 2>&1 &&
      python3 -m pip install --user --upgrade mempalace >>"$log" 2>&1; then
      ok "MemPalace installed"
      return 0
    fi
  fi

  warn "MemPalace installation failed. OpenCode will still install and work without it."
  warn "Details: $(tail -n 3 "$log" | tr '\n' ' ')"
  warn "Install it later with: python3 -m pip install --user mempalace"
  rm -f "$log"
  return 1
}

if [[ "$CHOICE_MEMPALACE" == "yes" ]]; then
  install_mempalace || CHOICE_MEMPALACE="no"
fi

# ── Build ────────────────────────────────────────────────────────────────

platform_dir() {
  local os arch
  case "$(uname -s)" in
    Darwin*) os="darwin" ;;
    Linux*) os="linux" ;;
    MINGW*|MSYS*|CYGWIN*) os="windows" ;;
    *) os="unknown" ;;
  esac
  case "$(uname -m)" in
    aarch64|arm64) arch="arm64" ;;
    x86_64|amd64) arch="x64" ;;
    *) arch="unknown" ;;
  esac
  echo "${os}-${arch}"
}

if [[ "$SKIP_BUILD" == "0" ]]; then
  info "Installing dependencies"
  (cd "$REPO_ROOT" && bun install)

  info "Building the single-file binary (this can take a few minutes)"
  (cd "$REPO_ROOT/packages/opencode" && bun run build -- --single)
fi

PLATFORM="$(platform_dir)"
DIST_BIN="$REPO_ROOT/packages/opencode/dist/opencode-${PLATFORM}/bin"
[[ -x "$DIST_BIN/opencode" ]] || die "build output not found at $DIST_BIN/opencode"
for companion in mempalace_bridge.py mempalace_rekal_engine.py mempalace_hindsight.py; do
  [[ -f "$DIST_BIN/$companion" ]] || die "missing companion file: $DIST_BIN/$companion"
done

# ── Install binary + companions ──────────────────────────────────────────

if [[ -z "$INSTALL_DIR" ]]; then
  if [[ -w /usr/local/bin ]]; then
    INSTALL_DIR="/usr/local/bin"
  else
    INSTALL_DIR="$HOME/.opencode/bin"
  fi
fi
mkdir -p "$INSTALL_DIR" 2>/dev/null || die "cannot create $INSTALL_DIR"

if [[ ! -w "$INSTALL_DIR" ]]; then
  die "$INSTALL_DIR is not writable; re-run with --install-dir \"\$HOME/.opencode/bin\" or adjust permissions"
fi

info "Installing to $INSTALL_DIR"
if [[ -f "$INSTALL_DIR/opencode" ]]; then
  backup="$INSTALL_DIR/opencode.backup.$(date +%Y%m%d-%H%M%S)"
  cp "$INSTALL_DIR/opencode" "$backup" 2>/dev/null && ok "Backed up previous binary to $backup" || true
fi

install -m 0755 "$DIST_BIN/opencode" "$INSTALL_DIR/opencode"
for companion in mempalace_bridge.py mempalace_rekal_engine.py mempalace_hindsight.py; do
  install -m 0644 "$DIST_BIN/$companion" "$INSTALL_DIR/$companion"
done
ok "Binary and companion modules installed"

# ── Persist optional-feature choices ─────────────────────────────────────

DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
MEMORY_CONFIG_DIR="$DATA_HOME/opencode"
MEMORY_CONFIG="$MEMORY_CONFIG_DIR/memory-config.json"
mkdir -p "$MEMORY_CONFIG_DIR"

python3 - "$MEMORY_CONFIG" "$CHOICE_MEMPALACE" "$CHOICE_MEMORY" <<'PY'
import json, os, sys
path, mempalace, memory = sys.argv[1], sys.argv[2] == "yes", sys.argv[3] == "yes"
existing = {}
if os.path.exists(path):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        if isinstance(data, dict):
            existing = data
    except Exception:
        existing = {}
existing["mempalace"] = mempalace
existing["enhancement"] = memory
tmp = path + ".tmp"
with open(tmp, "w", encoding="utf-8") as handle:
    json.dump(existing, handle, indent=2)
    handle.write("\n")
os.replace(tmp, path)
print(path)
PY
ok "Saved memory preferences to $MEMORY_CONFIG"

# ── Verify and initialise the bundled enhancement ────────────────────────

verify_enhancement() {
  # -B: do not write __pycache__ into the install directory.
  python3 -B - "$INSTALL_DIR" <<'PY'
import importlib.util, os, sys, tempfile
install_dir = sys.argv[1]
# The engine imports `mempalace_hindsight` as a sibling module, exactly as it
# does when the bridge runs, so the install directory must be importable.
sys.path.insert(0, install_dir)
engine_path = os.path.join(install_dir, "mempalace_rekal_engine.py")
if not os.path.exists(engine_path):
    sys.exit("memory enhancement module missing from install dir")
spec = importlib.util.spec_from_file_location("mempalace_rekal_engine", engine_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
if not getattr(module, "HINDSIGHT_AVAILABLE", False):
    sys.exit("hindsight retrieval module failed to load")
with tempfile.TemporaryDirectory() as tmp:
    engine = module.RekalEngine(tmp)
    stored = engine.store("installer self-test memory", project="__installer__")
    found = engine.search("installer self-test", limit=3, project="__installer__",
                          fusion="rrf", graph_expand=True, temporal=True)
    if not stored.get("memory_id") or not found.get("results"):
        sys.exit("memory self-test failed")
PY
}

if [[ "$CHOICE_MEMORY" == "yes" ]]; then
  info "Initialising and verifying the memory enhancement"
  if verify_enhancement; then
    ok "Memory enhancement verified"
  else
    warn "Memory enhancement self-test failed; OpenCode will still work without it."
    CHOICE_MEMORY="no"
  fi
fi

# ── Expose project plugin tools globally ─────────────────────────────────

if [[ "$SKIP_GLOBAL_TOOLS" == "0" && -x "$REPO_ROOT/.opencode/install-global-tools.sh" ]]; then
  if bash "$REPO_ROOT/.opencode/install-global-tools.sh" >/dev/null 2>&1; then
    ok "Project plugin tools linked into the global config"
  else
    warn "Could not link project plugin tools; core tools are unaffected."
  fi
fi

# ── PATH handling ────────────────────────────────────────────────────────

installed_opencode="$INSTALL_DIR/opencode"
on_path=0
if command -v opencode >/dev/null 2>&1; then
  resolved="$(command -v opencode)"
  if [[ "$resolved" == "$installed_opencode" ]]; then
    on_path=1
  else
    warn "Another opencode is earlier on PATH: $resolved"
    warn "The newly installed binary is $installed_opencode"
  fi
fi

if [[ "$on_path" == "0" && ":${PATH}:" != *":${INSTALL_DIR}:"* ]]; then
  if [[ "$MODIFY_PATH" == "1" ]]; then
    shell_rc=""
    case "$(basename "${SHELL:-bash}")" in
      zsh) shell_rc="$HOME/.zshrc" ;;
      bash) shell_rc="$HOME/.bashrc" ;;
      *) shell_rc="$HOME/.profile" ;;
    esac
    if [[ -n "$shell_rc" ]] && ! grep -qs "$INSTALL_DIR" "$shell_rc"; then
      printf '\n# Added by the OpenCode source installer\nexport PATH="%s:$PATH"\n' "$INSTALL_DIR" >>"$shell_rc"
      ok "Added $INSTALL_DIR to $shell_rc (restart your shell or source it)"
    fi
  else
    warn "Add $INSTALL_DIR to your PATH to run 'opencode' directly."
  fi
fi

# ── Verification ─────────────────────────────────────────────────────────

info "Verifying installation"
version="$("$installed_opencode" --version 2>/dev/null | tail -n 1)"
[[ -n "$version" ]] || die "installed binary failed to run"
ok "  opencode ${version}"

info "Detecting providers from the environment"
providers="$("$installed_opencode" models 2>/dev/null | awk -F/ '{print $1}' | sort -u | tr '\n' ' ')"
if [[ -n "$providers" ]]; then
  ok "  providers: ${providers}"
else
  warn "  no providers detected; authenticate with 'opencode auth login' or set a provider API key"
fi

say ""
say "${BOLD}Installation complete${NC}"
say "  Binary:            $installed_opencode"
say "  MemPalace:         ${CHOICE_MEMPALACE}"
say "  Memory enhancement:${CHOICE_MEMORY}"
if [[ "$CHOICE_MEMPALACE" == "no" ]]; then
  say "  ${MUTED}Without MemPalace there is no semantic/vector recall or knowledge graph.${NC}"
fi
if [[ "$CHOICE_MEMORY" == "no" ]]; then
  say "  ${MUTED}Without the enhancement, structured memory and advanced recall are unavailable.${NC}"
fi
say ""
say "${MUTED}Provider credentials are read from the environment at runtime; they are never written to disk by this installer.${NC}"
say ""
