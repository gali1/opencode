#!/usr/bin/env bash
set -euo pipefail

# Phase 7 — Validation and Verification
# Validates repository integrity after reintegration

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

PROJECT_DIR="${1:-.}"
RUN_TESTS="${2:-false}"
RUN_BUILD="${3:-false}"
RUN_LINT="${4:-false}"

cd "$PROJECT_DIR"
PROJECT_DIR="$(pwd)"

require_git_repo "$PROJECT_DIR"

VALIDATION_PASSED=true

echo "=== POST-REINTEGRATION VALIDATION ==="
echo "PROJECT_DIR: $PROJECT_DIR"
echo "RUN_TESTS: $RUN_TESTS"
echo "RUN_BUILD: $RUN_BUILD"
echo "RUN_LINT: $RUN_LINT"
echo ""

# Detect package manager — prefer bun, then pnpm, then yarn, then npm
detect_pkg_manager() {
  if [ -f "bun.lock" ] || [ -f "bun.lockb" ]; then
    echo "bun"
  elif [ -f "pnpm-lock.yaml" ]; then
    echo "pnpm"
  elif [ -f "yarn.lock" ]; then
    echo "yarn"
  elif [ -f "package-lock.json" ]; then
    echo "npm"
  elif command -v bun >/dev/null 2>&1; then
    echo "bun"
  elif command -v npm >/dev/null 2>&1; then
    echo "npm"
  else
    echo "none"
  fi
}

PKG_MANAGER=$(detect_pkg_manager)

# 1. Git State Validation
echo "=== GIT STATE VALIDATION ==="
GIT_STATE="CLEAN"
if [ -d ".git/rebase-merge" ] || [ -d ".git/rebase-apply" ]; then
  GIT_STATE="REBASE_IN_PROGRESS"
  VALIDATION_PASSED=false
elif [ -f ".git/MERGE_HEAD" ]; then
  GIT_STATE="MERGE_IN_PROGRESS"
  VALIDATION_PASSED=false
elif [ -f ".git/CHERRY_PICK_HEAD" ]; then
  GIT_STATE="CHERRY_PICK_IN_PROGRESS"
  VALIDATION_PASSED=false
fi
echo "GIT_STATE: $GIT_STATE"

UNRESOLVED=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l | tr -d ' ')
echo "UNRESOLVED_CONFLICTS: $UNRESOLVED"
if [ "$UNRESOLVED" -gt 0 ]; then
  echo "CONFLICT_FILES:"
  git diff --name-only --diff-filter=U 2>/dev/null | sed 's/^/  /'
  VALIDATION_PASSED=false
fi

WORKTREE_VALID=$(git rev-parse --is-inside-work-tree 2>/dev/null || echo "false")
echo "WORKTREE_VALID: $WORKTREE_VALID"
echo "CURRENT_BRANCH: $(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
echo "HEAD_COMMIT: $(git rev-parse HEAD 2>/dev/null)"
echo ""

# 2. Syntax Validation (language-specific)
echo "=== SYNTAX VALIDATION ==="

# JavaScript/TypeScript — try bun first, then node
if ls ./*.js ./*.ts ./*.jsx ./*.tsx 2>/dev/null | head -1 >/dev/null 2>&1 || [ -f "package.json" ]; then
  echo "DETECTED: JavaScript/TypeScript project (pkg_manager=$PKG_MANAGER)"

  # For TypeScript projects, prefer typecheck over raw syntax check
  if [ -f "tsconfig.json" ] || ls tsconfig.*.json 2>/dev/null | head -1 >/dev/null 2>&1; then
    # Check if the project has a typecheck script
    if [ -f "package.json" ] && grep -q '"typecheck"' package.json 2>/dev/null; then
      echo "  TypeScript project with typecheck script — use RUN_BUILD=true or run '$PKG_MANAGER run typecheck' separately"
    else
      echo "  TypeScript project detected — type checking deferred to build step"
    fi
  elif command -v bun >/dev/null 2>&1; then
    SYNTAX_ERRORS=0
    while IFS= read -r jsfile; do
      if ! bun build --no-bundle "$jsfile" --outdir /dev/null 2>/dev/null; then
        echo "  SYNTAX_ERROR: $jsfile"
        SYNTAX_ERRORS=$((SYNTAX_ERRORS + 1))
      fi
    done < <(find . -name '*.js' -not -path './node_modules/*' -not -path './.git/*' -not -path './.next/*' -not -path './dist/*' -type f 2>/dev/null | head -50)
    echo "  JS_SYNTAX_ERRORS: $SYNTAX_ERRORS"
    if [ "$SYNTAX_ERRORS" -gt 0 ]; then
      VALIDATION_PASSED=false
    fi
  elif command -v node >/dev/null 2>&1; then
    SYNTAX_ERRORS=0
    while IFS= read -r jsfile; do
      if ! node --check "$jsfile" 2>/dev/null; then
        echo "  SYNTAX_ERROR: $jsfile"
        SYNTAX_ERRORS=$((SYNTAX_ERRORS + 1))
      fi
    done < <(find . -name '*.js' -not -path './node_modules/*' -not -path './.git/*' -not -path './.next/*' -not -path './dist/*' -type f 2>/dev/null | head -50)
    echo "  JS_SYNTAX_ERRORS: $SYNTAX_ERRORS"
    if [ "$SYNTAX_ERRORS" -gt 0 ]; then
      VALIDATION_PASSED=false
    fi
  else
    echo "  Neither bun nor node available for syntax checking — skipping"
  fi
fi

# Python
if ls ./*.py 2>/dev/null | head -1 >/dev/null 2>&1 || [ -f "setup.py" ] || [ -f "pyproject.toml" ]; then
  echo "DETECTED: Python project"
  if command -v python3 >/dev/null 2>&1; then
    SYNTAX_ERRORS=0
    while IFS= read -r pyfile; do
      if ! python3 -m py_compile "$pyfile" 2>/dev/null; then
        echo "  SYNTAX_ERROR: $pyfile"
        SYNTAX_ERRORS=$((SYNTAX_ERRORS + 1))
      fi
    done < <(find . -name '*.py' -not -path './.git/*' -not -path './venv/*' -not -path './.venv/*' -type f 2>/dev/null | head -50)
    echo "  PY_SYNTAX_ERRORS: $SYNTAX_ERRORS"
    if [ "$SYNTAX_ERRORS" -gt 0 ]; then
      VALIDATION_PASSED=false
    fi
  else
    echo "  python3 not available for syntax checking"
  fi
fi

# Go
if [ -f "go.mod" ]; then
  echo "DETECTED: Go project"
  if command -v go >/dev/null 2>&1; then
    if go vet ./... 2>/dev/null; then
      echo "  GO_VET: PASSED"
    else
      echo "  GO_VET: FAILED"
      VALIDATION_PASSED=false
    fi
  else
    echo "  go not available for validation"
  fi
fi

# Rust
if [ -f "Cargo.toml" ]; then
  echo "DETECTED: Rust project"
  if command -v cargo >/dev/null 2>&1; then
    if cargo check 2>/dev/null; then
      echo "  CARGO_CHECK: PASSED"
    else
      echo "  CARGO_CHECK: FAILED"
      VALIDATION_PASSED=false
    fi
  else
    echo "  cargo not available for validation"
  fi
fi
echo ""

# 3. Dependency Validation
echo "=== DEPENDENCY VALIDATION ==="
if [ -f "package.json" ]; then
  echo "PKG_MANAGER: $PKG_MANAGER"
  if [ -f "node_modules/.package-lock.json" ] || [ -d "node_modules" ]; then
    echo "NODE_MODULES: present"
  else
    echo "NODE_MODULES: missing (run '$PKG_MANAGER install')"
  fi
  if [ -f "package-lock.json" ] || [ -f "yarn.lock" ] || [ -f "pnpm-lock.yaml" ] || [ -f "bun.lockb" ] || [ -f "bun.lock" ]; then
    echo "LOCKFILE: present"
  else
    echo "LOCKFILE: missing"
  fi
fi
if [ -f "requirements.txt" ] || [ -f "Pipfile" ] || [ -f "pyproject.toml" ]; then
  echo "PYTHON_DEPS_MANIFEST: present"
fi
if [ -f "go.mod" ]; then
  echo "GO_MOD: present"
  if [ -f "go.sum" ]; then
    echo "GO_SUM: present"
  else
    echo "GO_SUM: missing"
  fi
fi
if [ -f "Cargo.toml" ]; then
  echo "CARGO_TOML: present"
  if [ -f "Cargo.lock" ]; then
    echo "CARGO_LOCK: present"
  else
    echo "CARGO_LOCK: missing"
  fi
fi
echo ""

# 4. Build Verification (optional)
if [ "$RUN_BUILD" = "true" ]; then
  echo "=== BUILD VERIFICATION ==="
  BUILD_PASSED=false

  if [ -f "package.json" ] && grep -q '"build"' package.json 2>/dev/null; then
    echo "Running: $PKG_MANAGER run build"
    if $PKG_MANAGER run build 2>&1 | tail -10; then
      BUILD_PASSED=true
    fi
  elif [ -f "Makefile" ]; then
    echo "Running: make"
    if make 2>&1 | tail -10; then
      BUILD_PASSED=true
    fi
  elif [ -f "Cargo.toml" ]; then
    echo "Running: cargo build"
    if cargo build 2>&1 | tail -10; then
      BUILD_PASSED=true
    fi
  elif [ -f "go.mod" ]; then
    echo "Running: go build ./..."
    if go build ./... 2>&1 | tail -10; then
      BUILD_PASSED=true
    fi
  else
    echo "No recognized build system found"
    BUILD_PASSED=true
  fi
  echo "BUILD_RESULT: $([ "$BUILD_PASSED" = "true" ] && echo "PASSED" || echo "FAILED")"
  if [ "$BUILD_PASSED" != "true" ]; then
    VALIDATION_PASSED=false
  fi
  echo ""
fi

# 5. Test Execution (optional)
if [ "$RUN_TESTS" = "true" ]; then
  echo "=== TEST EXECUTION ==="
  TESTS_PASSED=false

  if [ -f "package.json" ] && grep -q '"test"' package.json 2>/dev/null; then
    echo "Running: $PKG_MANAGER test"
    if $PKG_MANAGER test 2>&1 | tail -20; then
      TESTS_PASSED=true
    fi
  elif [ -f "Cargo.toml" ]; then
    echo "Running: cargo test"
    if cargo test 2>&1 | tail -20; then
      TESTS_PASSED=true
    fi
  elif [ -f "go.mod" ]; then
    echo "Running: go test ./..."
    if go test ./... 2>&1 | tail -20; then
      TESTS_PASSED=true
    fi
  elif [ -f "pytest.ini" ] || [ -f "setup.cfg" ] || [ -f "pyproject.toml" ]; then
    echo "Running: pytest"
    if pytest 2>&1 | tail -20; then
      TESTS_PASSED=true
    fi
  else
    echo "No recognized test runner found"
    TESTS_PASSED=true
  fi
  echo "TEST_RESULT: $([ "$TESTS_PASSED" = "true" ] && echo "PASSED" || echo "FAILED")"
  if [ "$TESTS_PASSED" != "true" ]; then
    VALIDATION_PASSED=false
  fi
  echo ""
fi

# 6. Lint (optional)
if [ "$RUN_LINT" = "true" ]; then
  echo "=== LINT ==="
  LINT_PASSED=false

  if [ -f "package.json" ] && grep -q '"lint"' package.json 2>/dev/null; then
    echo "Running: $PKG_MANAGER run lint"
    if $PKG_MANAGER run lint 2>&1 | tail -20; then
      LINT_PASSED=true
    fi
  elif [ -f ".eslintrc" ] || [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ]; then
    echo "Running: npx eslint ."
    if npx eslint . 2>&1 | tail -20; then
      LINT_PASSED=true
    fi
  else
    echo "No recognized linter configuration found"
    LINT_PASSED=true
  fi
  echo "LINT_RESULT: $([ "$LINT_PASSED" = "true" ] && echo "PASSED" || echo "FAILED")"
  if [ "$LINT_PASSED" != "true" ]; then
    VALIDATION_PASSED=false
  fi
  echo ""
fi

# 7. Critical file existence check
echo "=== CRITICAL FILE CHECK ==="
CRITICAL_MISSING=0
for f in $(git ls-files 2>/dev/null | grep -E '(package\.json|Cargo\.toml|go\.mod|setup\.py|pyproject\.toml|Makefile|Dockerfile|README)' | head -20); do
  if [ ! -f "$f" ]; then
    echo "  MISSING: $f"
    CRITICAL_MISSING=$((CRITICAL_MISSING + 1))
  fi
done
echo "CRITICAL_MISSING_FILES: $CRITICAL_MISSING"
if [ "$CRITICAL_MISSING" -gt 0 ]; then
  VALIDATION_PASSED=false
fi
echo ""

# 8. Check for conflict markers left in files
echo "=== CONFLICT MARKER CHECK ==="
MARKER_COUNT=0
while IFS= read -r srcfile; do
  if [ -n "$srcfile" ] && grep -lE '^(<{7}|={7}|>{7})' "$srcfile" 2>/dev/null >/dev/null; then
    echo "  CONFLICT_MARKERS_FOUND: $srcfile"
    MARKER_COUNT=$((MARKER_COUNT + 1))
  fi
done < <(git ls-files 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h|hpp|cs|rb|php|json|yaml|yml|toml|xml|html|css|scss|md)$' | head -500)
echo "FILES_WITH_CONFLICT_MARKERS: $MARKER_COUNT"
if [ "$MARKER_COUNT" -gt 0 ]; then
  VALIDATION_PASSED=false
fi
echo ""

# 9. Check for .rej files left from patch application
echo "=== REJECT FILE CHECK ==="
REJ_COUNT=$(find "$PROJECT_DIR" -name '*.rej' -type f -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | wc -l | tr -d ' ')
if [ "$REJ_COUNT" -gt 0 ]; then
  echo "REJECT_FILES_FOUND: $REJ_COUNT"
  find "$PROJECT_DIR" -name '*.rej' -type f -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | head -20 | sed 's/^/  /'
  VALIDATION_PASSED=false
else
  echo "REJECT_FILES: 0"
fi
echo ""

# Summary
echo "=== VALIDATION SUMMARY ==="
echo "OVERALL_RESULT: $([ "$VALIDATION_PASSED" = "true" ] && echo "PASSED" || echo "FAILED")"
echo ""
echo "=== VALIDATION COMPLETE ==="
