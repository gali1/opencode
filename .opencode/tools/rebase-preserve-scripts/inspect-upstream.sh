#!/usr/bin/env bash
set -euo pipefail

# Phase 2 — Upstream Change Inspection
# Compares current branch against upstream, reviews commits, diffs, changes

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

PROJECT_DIR="${1:-.}"
UPSTREAM_REMOTE="${2:-}"
UPSTREAM_BRANCH="${3:-}"
FETCH_FIRST="${4:-true}"

cd "$PROJECT_DIR"
PROJECT_DIR="$(pwd)"

require_git_repo "$PROJECT_DIR"

# Auto-detect upstream remote if not provided
if [ -z "$UPSTREAM_REMOTE" ]; then
  UPSTREAM_REMOTE=$(detect_upstream_remote)
  if [ -z "$UPSTREAM_REMOTE" ]; then
    echo "ERROR: No upstream remote found. Provide remote name as argument."
    exit 1
  fi
fi

# Auto-detect upstream branch if not provided
if [ -z "$UPSTREAM_BRANCH" ]; then
  UPSTREAM_BRANCH=$(detect_upstream_branch "$UPSTREAM_REMOTE")
  if [ -z "$UPSTREAM_BRANCH" ]; then
    echo "ERROR: Could not detect upstream branch. Provide branch name as argument."
    exit 1
  fi
fi

UPSTREAM_REF="$UPSTREAM_REMOTE/$UPSTREAM_BRANCH"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD")

echo "=== UPSTREAM CHANGE INSPECTION ==="
echo "CURRENT_BRANCH: $CURRENT_BRANCH"
echo "UPSTREAM_REF: $UPSTREAM_REF"
echo ""

# Fetch latest upstream
if [ "$FETCH_FIRST" = "true" ]; then
  echo "=== FETCHING UPSTREAM ==="
  if git fetch "$UPSTREAM_REMOTE" "$UPSTREAM_BRANCH" 2>&1; then
    echo "Fetch successful"
  else
    echo "WARNING: Fetch failed. Using cached remote data."
  fi
  echo ""
fi

# Commit divergence
LOCAL_HEAD=$(git rev-parse HEAD 2>/dev/null)
UPSTREAM_HEAD=$(git rev-parse "$UPSTREAM_REF" 2>/dev/null || echo "UNKNOWN")
MERGE_BASE=$(git merge-base HEAD "$UPSTREAM_REF" 2>/dev/null || echo "UNKNOWN")

echo "=== COMMIT DIVERGENCE ==="
echo "LOCAL_HEAD: $LOCAL_HEAD"
echo "UPSTREAM_HEAD: $UPSTREAM_HEAD"
echo "MERGE_BASE: $MERGE_BASE"
echo ""

if [ "$MERGE_BASE" != "UNKNOWN" ]; then
  AHEAD=$(git rev-list --count "$UPSTREAM_REF..HEAD" 2>/dev/null || echo "0")
  BEHIND=$(git rev-list --count "HEAD..$UPSTREAM_REF" 2>/dev/null || echo "0")
  echo "LOCAL_AHEAD_BY: $AHEAD commits"
  echo "LOCAL_BEHIND_BY: $BEHIND commits"

  # Provide a quick assessment
  if [ "$AHEAD" = "0" ] && [ "$BEHIND" = "0" ]; then
    echo "ASSESSMENT: Already up to date with upstream"
  elif [ "$AHEAD" = "0" ]; then
    echo "ASSESSMENT: Fast-forward possible (no local commits ahead)"
  elif [ "$BEHIND" = "0" ]; then
    echo "ASSESSMENT: Local is ahead of upstream (nothing to sync)"
  else
    echo "ASSESSMENT: Diverged — rebase or merge required"
  fi
  echo ""
fi

# Upstream commits since merge base
echo "=== UPSTREAM COMMITS SINCE DIVERGENCE ==="
if [ "$MERGE_BASE" != "UNKNOWN" ]; then
  COMMIT_COUNT=$(git rev-list --count "$MERGE_BASE..$UPSTREAM_REF" 2>/dev/null || echo "0")
  echo "NEW_UPSTREAM_COMMITS: $COMMIT_COUNT"
  echo ""
  if [ "$COMMIT_COUNT" -gt 0 ]; then
    echo "COMMIT_LOG:"
    git log --oneline --no-merges "$MERGE_BASE..$UPSTREAM_REF" 2>/dev/null | head -100 | sed 's/^/  /'
    echo ""
    if [ "$COMMIT_COUNT" -gt 100 ]; then
      echo "  ... ($((COMMIT_COUNT - 100)) more commits truncated)"
      echo ""
    fi
  fi
fi

# Changed files in upstream
echo "=== UPSTREAM CHANGED FILES ==="
if [ "$MERGE_BASE" != "UNKNOWN" ]; then
  echo "FILE_CHANGES:"
  git diff --name-status "$MERGE_BASE..$UPSTREAM_REF" 2>/dev/null | head -100 | sed 's/^/  /'
  CHANGE_COUNT=$(git diff --name-only "$MERGE_BASE..$UPSTREAM_REF" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$CHANGE_COUNT" -gt 100 ]; then
    echo "  ... ($((CHANGE_COUNT - 100)) more files not shown)"
  fi
  echo ""

  echo "CHANGE_SUMMARY:"
  git diff --stat "$MERGE_BASE..$UPSTREAM_REF" 2>/dev/null | tail -1 | sed 's/^/  /'
  echo ""

  # Renamed/moved files
  RENAMED=$(git diff --name-status --diff-filter=R "$MERGE_BASE..$UPSTREAM_REF" 2>/dev/null || true)
  echo "RENAMED_FILES:"
  if [ -n "$RENAMED" ]; then
    echo "$RENAMED" | sed 's/^/  /'
  else
    echo "  None"
  fi
  echo ""

  # Deleted files
  DELETED=$(git diff --name-only --diff-filter=D "$MERGE_BASE..$UPSTREAM_REF" 2>/dev/null || true)
  echo "DELETED_FILES:"
  if [ -n "$DELETED" ]; then
    echo "$DELETED" | sed 's/^/  /'
  else
    echo "  None"
  fi
  echo ""

  # Added files
  ADDED=$(git diff --name-only --diff-filter=A "$MERGE_BASE..$UPSTREAM_REF" 2>/dev/null || true)
  echo "ADDED_FILES:"
  if [ -n "$ADDED" ]; then
    echo "$ADDED" | head -50 | sed 's/^/  /'
    ADDED_COUNT=$(echo "$ADDED" | wc -l | tr -d ' ')
    if [ "$ADDED_COUNT" -gt 50 ]; then
      echo "  ... ($((ADDED_COUNT - 50)) more added files not shown)"
    fi
  else
    echo "  None"
  fi
  echo ""
fi

# Files likely to conflict
echo "=== POTENTIAL CONFLICTS ==="
if [ "$MERGE_BASE" != "UNKNOWN" ]; then
  LOCAL_CHANGED=$(git diff --name-only "$MERGE_BASE..HEAD" 2>/dev/null | sort || true)
  UPSTREAM_CHANGED=$(git diff --name-only "$MERGE_BASE..$UPSTREAM_REF" 2>/dev/null | sort || true)

  if [ -n "$LOCAL_CHANGED" ] && [ -n "$UPSTREAM_CHANGED" ]; then
    CONFLICTING=$(comm -12 <(echo "$LOCAL_CHANGED") <(echo "$UPSTREAM_CHANGED") 2>/dev/null || true)
  else
    CONFLICTING=""
  fi

  if [ -n "$CONFLICTING" ]; then
    echo "FILES_MODIFIED_IN_BOTH:"
    echo "$CONFLICTING" | sed 's/^/  /'
    echo ""
    CONFLICT_COUNT=$(echo "$CONFLICTING" | wc -l | tr -d ' ')
    echo "POTENTIAL_CONFLICT_COUNT: $CONFLICT_COUNT"
  else
    echo "NO_CONFLICTING_FILES_DETECTED"
  fi
  echo ""
fi

# Dependency changes
echo "=== DEPENDENCY CHANGES ==="
if [ "$MERGE_BASE" != "UNKNOWN" ]; then
  DEP_FILES=$(git diff --name-only "$MERGE_BASE..$UPSTREAM_REF" 2>/dev/null | grep -E '(package\.json|Cargo\.toml|go\.mod|go\.sum|requirements\.txt|Pipfile|pyproject\.toml|Gemfile|pom\.xml|build\.gradle|composer\.json|mix\.exs|deps\.edn|Package\.swift|\.csproj|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|Pipfile\.lock|Gemfile\.lock|composer\.lock|mix\.lock|bun\.lockb|bun\.lock)' || true)

  if [ -n "$DEP_FILES" ]; then
    echo "CHANGED_DEPENDENCY_FILES:"
    echo "$DEP_FILES" | sed 's/^/  /'
  else
    echo "NO_DEPENDENCY_CHANGES"
  fi
fi
echo ""

# Upstream diff for conflicting files (truncated per file)
echo "=== UPSTREAM DIFFS FOR CONFLICTING FILES (TRUNCATED) ==="
if [ -n "${CONFLICTING:-}" ]; then
  echo "$CONFLICTING" | head -20 | while IFS= read -r file; do
    if [ -n "$file" ]; then
      echo "--- FILE: $file ---"
      git diff "$MERGE_BASE..$UPSTREAM_REF" -- "$file" 2>/dev/null | head -80
      echo "..."
      echo ""
    fi
  done
else
  echo "No conflicting files to show diffs for"
fi
echo ""

echo "=== UPSTREAM INSPECTION COMPLETE ==="
