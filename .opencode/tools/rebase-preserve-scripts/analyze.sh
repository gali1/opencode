#!/usr/bin/env bash
set -euo pipefail

# Phase 1 — Repository Analysis
# Inspects current repository state, detects modifications, classifies changes

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

PROJECT_DIR="${1:-.}"
cd "$PROJECT_DIR"
PROJECT_DIR="$(pwd)"

require_git_repo "$PROJECT_DIR"

echo "=== REPOSITORY ANALYSIS ==="
echo ""

# Current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "DETACHED")
echo "CURRENT_BRANCH: $CURRENT_BRANCH"
echo "HEAD_COMMIT: $(git rev-parse HEAD 2>/dev/null)"
echo "HEAD_MESSAGE: $(git log -1 --pretty=format:'%s' 2>/dev/null)"
echo ""

# Upstream remotes
echo "=== REMOTES ==="
git remote -v 2>/dev/null || echo "No remotes configured"
echo ""

# Detect upstream remote
UPSTREAM_REMOTE=""
if git remote | grep -q "^upstream$"; then
  UPSTREAM_REMOTE="upstream"
elif git remote | grep -q "^origin$"; then
  UPSTREAM_REMOTE="origin"
fi
echo "DETECTED_UPSTREAM_REMOTE: ${UPSTREAM_REMOTE:-NONE}"
echo ""

# Tracking branch info
if [ -n "$UPSTREAM_REMOTE" ]; then
  TRACKING_BRANCH=$(git rev-parse --abbrev-ref "@{upstream}" 2>/dev/null || echo "NONE")
  echo "TRACKING_BRANCH: $TRACKING_BRANCH"

  if [ "$TRACKING_BRANCH" != "NONE" ]; then
    AHEAD=$(git rev-list --count "$TRACKING_BRANCH..HEAD" 2>/dev/null || echo "0")
    BEHIND=$(git rev-list --count "HEAD..$TRACKING_BRANCH" 2>/dev/null || echo "0")
    echo "COMMITS_AHEAD: $AHEAD"
    echo "COMMITS_BEHIND: $BEHIND"
  fi
fi
echo ""

# Working tree status
echo "=== WORKING TREE STATUS ==="
echo "MODIFIED_TRACKED_FILES:"
git diff --name-only 2>/dev/null | sed 's/^/  /'
echo ""
echo "STAGED_FILES:"
git diff --cached --name-only 2>/dev/null | sed 's/^/  /'
echo ""
echo "UNTRACKED_FILES:"
git ls-files --others --exclude-standard 2>/dev/null | sed 's/^/  /'
echo ""

# Stash status
STASH_COUNT=$(git stash list 2>/dev/null | wc -l | tr -d ' ')
echo "STASH_ENTRIES: $STASH_COUNT"
echo ""

# Divergence from upstream (if available)
if [ -n "$UPSTREAM_REMOTE" ]; then
  echo "=== DIVERGED FILES FROM UPSTREAM ==="
  UPSTREAM_DEFAULT=""
  # Auto-detect upstream default branch
  DETECTED_BRANCH=$(detect_upstream_branch "$UPSTREAM_REMOTE")
  if [ -n "$DETECTED_BRANCH" ]; then
    UPSTREAM_DEFAULT="$UPSTREAM_REMOTE/$DETECTED_BRANCH"
  fi

  if [ -n "$UPSTREAM_DEFAULT" ]; then
    echo "UPSTREAM_REF: $UPSTREAM_DEFAULT"
    echo ""
    echo "FILES_DIFFERING_FROM_UPSTREAM:"
    git diff --name-status "$UPSTREAM_DEFAULT"...HEAD 2>/dev/null | head -100 | sed 's/^/  /' || echo "  Unable to compute diff"
    DIFF_COUNT=$(git diff --name-only "$UPSTREAM_DEFAULT"...HEAD 2>/dev/null | wc -l | tr -d ' ')
    if [ "$DIFF_COUNT" -gt 100 ]; then
      echo "  ... ($((DIFF_COUNT - 100)) more files not shown)"
    fi
    echo ""
    echo "DIFF_STAT:"
    git diff --stat "$UPSTREAM_DEFAULT"...HEAD 2>/dev/null | tail -1 || echo "  Unable to compute stat"
  else
    echo "No upstream default branch detected (tried main, master, dev, develop)"
  fi
fi
echo ""

# File type classification
echo "=== FILE CLASSIFICATION ==="
echo "SOURCE_FILES:"
git ls-files 2>/dev/null | grep -cE '\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h|hpp|cs|rb|php|swift|kt|scala|ex|exs|clj|zig|nim|lua|sh|bash|zsh|fish|pl|pm|r|R|sql|graphql|gql|proto|thrift|avsc|wasm|wat)$' || echo "0"
echo "CONFIG_FILES:"
git ls-files 2>/dev/null | grep -cE '\.(json|yaml|yml|toml|ini|cfg|conf|env|properties|xml|plist)$' || echo "0"
echo "DEPENDENCY_MANIFESTS:"
git ls-files 2>/dev/null | grep -cE '(package\.json|Cargo\.toml|go\.mod|requirements\.txt|Pipfile|pyproject\.toml|Gemfile|pom\.xml|build\.gradle|composer\.json|mix\.exs|deps\.edn|Package\.swift|\.csproj)$' || echo "0"
echo "LOCK_FILES:"
git ls-files 2>/dev/null | grep -cE '(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|go\.sum|Pipfile\.lock|Gemfile\.lock|composer\.lock|mix\.lock|bun\.lockb|bun\.lock)$' || echo "0"
echo "BUILD_SCRIPTS:"
git ls-files 2>/dev/null | grep -cE '(Makefile|Dockerfile|docker-compose|Jenkinsfile|\.github/|\.gitlab-ci|\.circleci|Taskfile|justfile|Rakefile|Gruntfile|gulpfile|webpack|vite\.config|rollup\.config|esbuild|tsconfig|babel\.config|jest\.config|vitest\.config|CMakeLists)' || echo "0"
echo "DOCUMENTATION:"
git ls-files 2>/dev/null | grep -cE '\.(md|mdx|rst|txt|adoc|org|wiki|tex|doc|docx|pdf)$' || echo "0"
echo "TOTAL_TRACKED_FILES:"
git ls-files 2>/dev/null | wc -l | tr -d ' '
echo ""

# Submodules
echo "=== SUBMODULES ==="
if [ -f ".gitmodules" ]; then
  git submodule status 2>/dev/null || echo "No submodules initialized"
else
  echo "No submodules"
fi
echo ""

# Repository health
echo "=== REPOSITORY HEALTH ==="
echo "GIT_STATE: $(
  if [ -d ".git/rebase-merge" ] || [ -d ".git/rebase-apply" ]; then
    echo "REBASE_IN_PROGRESS"
  elif [ -f ".git/MERGE_HEAD" ]; then
    echo "MERGE_IN_PROGRESS"
  elif [ -f ".git/CHERRY_PICK_HEAD" ]; then
    echo "CHERRY_PICK_IN_PROGRESS"
  elif [ -f ".git/BISECT_LOG" ]; then
    echo "BISECT_IN_PROGRESS"
  else
    echo "CLEAN"
  fi
)"
echo "WORKTREE_VALID: $(git rev-parse --is-inside-work-tree 2>/dev/null || echo "false")"

# Show last backup location if breadcrumb exists
if [ -f "$PROJECT_DIR/.opencode/.last-backup-location" ]; then
  LAST_BACKUP=$(cat "$PROJECT_DIR/.opencode/.last-backup-location" 2>/dev/null | tr -d '[:space:]')
  if [ -d "$LAST_BACKUP" ]; then
    echo "LAST_BACKUP_DIR: $LAST_BACKUP"
  fi
fi
echo ""

echo "=== ANALYSIS COMPLETE ==="
