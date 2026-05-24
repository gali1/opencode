#!/usr/bin/env bash
set -euo pipefail

# Phase 5 — Post-Rebase Change Mapping
# Compares backup state vs rebased state to identify what user logic was lost

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

PROJECT_DIR="${1:-.}"
BACKUP_DIR="${2:-}"

cd "$PROJECT_DIR"
PROJECT_DIR="$(pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"

require_git_repo "$PROJECT_DIR"

BACKUP_DIR=$(resolve_backup "$BACKUP_DIR")

if [ -z "$BACKUP_DIR" ]; then
  echo "ERROR: No backup directory found."
  echo "Provide backup path as argument, or ensure a backup was created first."
  exit 1
fi

BACKUP_PROJECT_DIR="$BACKUP_DIR/project"

if [ ! -d "$BACKUP_PROJECT_DIR" ]; then
  echo "ERROR: Backup project directory not found: $BACKUP_PROJECT_DIR"
  exit 1
fi

echo "=== POST-REBASE CHANGE MAPPING ==="
echo "PROJECT_DIR: $PROJECT_DIR"
echo "BACKUP_DIR: $BACKUP_DIR"
echo ""

# Load backup metadata
if [ -f "$BACKUP_DIR/.backup-metadata.json" ]; then
  echo "=== BACKUP METADATA ==="
  cat "$BACKUP_DIR/.backup-metadata.json"
  echo ""
fi

# Generate file lists — exclude .git AND node_modules (regenerable, not worth diffing)
echo "=== GENERATING FILE INVENTORIES ==="
CURRENT_FILES=$(mktemp)
BACKUP_FILES=$(mktemp)

# Exclude heavy regenerable directories from both sides to keep output manageable
FIND_EXCLUDES=(
  -not -path '*/.git/*' -not -path '*/.git'
  -not -path '*/node_modules/*'
  -not -path '*/.next/*'
  -not -path '*/dist/*'
  -not -path '*/build/*'
  -not -path '*/target/*'
  -not -path '*/.turbo/*'
  -not -path '*/__pycache__/*'
  -not -path '*/.venv/*'
)

find "$PROJECT_DIR" -type f "${FIND_EXCLUDES[@]}" | sed "s|^$PROJECT_DIR/||" | sort > "$CURRENT_FILES"
find "$BACKUP_PROJECT_DIR" -type f "${FIND_EXCLUDES[@]}" -not -name '.backup-metadata.json' -not -name '.git-*-snapshot*' -not -name '.git-*-diff*' | sed "s|^$BACKUP_PROJECT_DIR/||" | sort > "$BACKUP_FILES"

CURRENT_COUNT=$(wc -l < "$CURRENT_FILES" | tr -d ' ')
BACKUP_COUNT=$(wc -l < "$BACKUP_FILES" | tr -d ' ')
echo "CURRENT_FILE_COUNT: $CURRENT_COUNT"
echo "BACKUP_FILE_COUNT: $BACKUP_COUNT"
echo ""

# Files only in backup (potentially lost user files)
echo "=== FILES ONLY IN BACKUP (POTENTIALLY LOST) ==="
LOST_FILES=$(comm -23 "$BACKUP_FILES" "$CURRENT_FILES" || true)
if [ -n "$LOST_FILES" ]; then
  echo "$LOST_FILES" | head -100 | sed 's/^/  /'
  LOST_COUNT=$(echo "$LOST_FILES" | wc -l | tr -d ' ')
  if [ "$LOST_COUNT" -gt 100 ]; then
    echo "  ... ($((LOST_COUNT - 100)) more files not shown)"
  fi
  echo ""
  echo "LOST_FILE_COUNT: $LOST_COUNT"
else
  echo "  None"
  LOST_FILES=""
fi
echo ""

# Files only in current (new from upstream)
echo "=== FILES ONLY IN CURRENT (NEW FROM UPSTREAM) ==="
NEW_FILES=$(comm -13 "$BACKUP_FILES" "$CURRENT_FILES" || true)
if [ -n "$NEW_FILES" ]; then
  NEW_COUNT=$(echo "$NEW_FILES" | wc -l | tr -d ' ')
  # Show up to 50 new files, summarize rest
  echo "$NEW_FILES" | head -50 | sed 's/^/  /'
  if [ "$NEW_COUNT" -gt 50 ]; then
    echo "  ... ($((NEW_COUNT - 50)) more new files not shown)"
  fi
  echo ""
  echo "NEW_FILE_COUNT: $NEW_COUNT"
else
  echo "  None"
  NEW_FILES=""
fi
echo ""

# Files in both that differ (content changes)
echo "=== MODIFIED FILES (CONTENT DIFFERS) ==="
COMMON_FILES=$(comm -12 "$BACKUP_FILES" "$CURRENT_FILES" || true)
MODIFIED_LIST_FILE=$(mktemp)
UNCHANGED_COUNT=0
MODIFIED_COUNT=0

while IFS= read -r file; do
  if [ -n "$file" ]; then
    # Use cmp for binary-safe fast comparison
    if ! cmp -s "$PROJECT_DIR/$file" "$BACKUP_PROJECT_DIR/$file" 2>/dev/null; then
      echo "$file" >> "$MODIFIED_LIST_FILE"
      MODIFIED_COUNT=$((MODIFIED_COUNT + 1))
    else
      UNCHANGED_COUNT=$((UNCHANGED_COUNT + 1))
    fi
  fi
done <<< "$COMMON_FILES"

if [ "$MODIFIED_COUNT" -gt 0 ]; then
  head -100 "$MODIFIED_LIST_FILE" | sed 's/^/  /'
  if [ "$MODIFIED_COUNT" -gt 100 ]; then
    echo "  ... ($((MODIFIED_COUNT - 100)) more modified files not shown)"
  fi
else
  echo "  None"
fi
echo ""
echo "MODIFIED_FILE_COUNT: $MODIFIED_COUNT"
echo "UNCHANGED_FILE_COUNT: $UNCHANGED_COUNT"
echo ""

# Detailed diffs for modified source files only (skip lock files, etc.)
echo "=== FILE DIFFS (BACKUP vs CURRENT — SOURCE FILES ONLY) ==="
if [ "$MODIFIED_COUNT" -gt 0 ]; then
  SHOWN=0
  grep -E '\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h|hpp|cs|rb|php|json|yaml|yml|toml|md)$' "$MODIFIED_LIST_FILE" | head -20 | while IFS= read -r file; do
    if [ -n "$file" ]; then
      # Skip lock files — they're regenerable
      case "$file" in
        *lock*|*Lock*|*.lockb) continue ;;
      esac
      echo "--- DIFF: $file ---"
      diff -u "$BACKUP_PROJECT_DIR/$file" "$PROJECT_DIR/$file" 2>/dev/null | head -60 || true
      echo "..."
      echo ""
      SHOWN=$((SHOWN + 1))
    fi
  done
  if [ "$MODIFIED_COUNT" -gt 20 ]; then
    echo "... (more modified files not shown — use file_diff tool for individual review)"
  fi
else
  echo "No modified files to diff"
fi
echo ""

# Classification summary
echo "=== CHANGE CLASSIFICATION SUMMARY ==="
echo "FILES_LOST_FROM_BACKUP: $([ -n "$LOST_FILES" ] && echo "$LOST_FILES" | wc -l | tr -d ' ' || echo "0")"
echo "FILES_NEW_FROM_UPSTREAM: $([ -n "$NEW_FILES" ] && echo "$NEW_FILES" | wc -l | tr -d ' ' || echo "0")"
echo "FILES_MODIFIED: $MODIFIED_COUNT"
echo "FILES_UNCHANGED: $UNCHANGED_COUNT"
echo ""

# Categorize lost/modified files by type
echo "=== LOST/MODIFIED FILE CATEGORIES ==="
ALL_AFFECTED=$(printf "%s\n%s" "${LOST_FILES:-}" "$(cat "$MODIFIED_LIST_FILE" 2>/dev/null)" | grep -v '^$' | sort -u || true)
if [ -n "$ALL_AFFECTED" ]; then
  echo "SOURCE_FILES: $(echo "$ALL_AFFECTED" | grep -cE '\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h|hpp|cs|rb|php|swift|kt|sh|bash|lua)$' || echo "0")"
  echo "CONFIG_FILES: $(echo "$ALL_AFFECTED" | grep -cE '\.(json|yaml|yml|toml|ini|cfg|conf|env|properties|xml)$' || echo "0")"
  echo "BUILD_FILES: $(echo "$ALL_AFFECTED" | grep -cE '(Makefile|Dockerfile|docker-compose|\.github/|\.gitlab-ci|Taskfile|CMakeLists)' || echo "0")"
  echo "DOCUMENTATION: $(echo "$ALL_AFFECTED" | grep -cE '\.(md|mdx|rst|txt|adoc)$' || echo "0")"
  echo "LOCK_FILES: $(echo "$ALL_AFFECTED" | grep -cE '(\.lock|lock\.json|lock\.yaml|\.lockb)$' || echo "0")"
fi
echo ""

# Cleanup
rm -f "$CURRENT_FILES" "$BACKUP_FILES" "$MODIFIED_LIST_FILE"

echo "=== CHANGE MAPPING COMPLETE ==="
echo ""
echo "REINTEGRATION_CANDIDATES: Files listed under MODIFIED and LOST sections"
echo "Use the file_diff tool to review individual files for reintegration."
