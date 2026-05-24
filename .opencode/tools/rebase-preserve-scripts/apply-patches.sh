#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

PROJECT_DIR="${1:-.}"
BACKUP_DIR="${2:-}"

cd "$PROJECT_DIR"
PROJECT_DIR="$(pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"

require_git_repo "$PROJECT_DIR"

# --- Resolve backup directory ---
if [ -z "$BACKUP_DIR" ] || [ ! -d "$BACKUP_DIR" ]; then
  BACKUP_DIR=$(resolve_backup "")
fi

if [ -z "$BACKUP_DIR" ] || [ ! -d "$BACKUP_DIR" ]; then
  echo "ERROR: Valid BACKUP_DIR required. Provide as argument or create a backup first."
  exit 1
fi

FORK_PATCH_DIR="$BACKUP_DIR/patches/fork"

if [ ! -d "$FORK_PATCH_DIR" ]; then
  echo "No fork patches found at $FORK_PATCH_DIR"
  echo "TOTAL_APPLIED: 0"
  echo "TOTAL_FAILED: 0"
  exit 0
fi

# Check if there are any patches to apply
PATCH_FILES=$(find "$FORK_PATCH_DIR" -maxdepth 1 -name '*.patch' ! -name 'combined.patch' ! -name '0*.patch' -type f 2>/dev/null || true)
if [ -z "$PATCH_FILES" ]; then
  echo "No per-file patches found in $FORK_PATCH_DIR"
  echo "TOTAL_APPLIED: 0"
  echo "TOTAL_FAILED: 0"
  exit 0
fi

echo "=== INTELLIGENT PATCH RE-APPLICATION ==="
echo "PATCH_DIR: $FORK_PATCH_DIR"
echo ""

count_applied=0
count_failed=0
failed_names=""

for patch in "$FORK_PATCH_DIR"/*.patch; do
  [ -f "$patch" ] || continue
  base=$(basename "$patch")
  # Skip combined and commit-level patches in first pass
  [[ "$base" == "combined.patch" ]] && continue
  [[ "$base" == 0*.patch ]] && continue
  # Skip empty patches
  [ -s "$patch" ] || continue

  if git apply --reject "$patch" 2>/dev/null; then
    count_applied=$((count_applied + 1))
    echo "APPLIED: $base"
  else
    count_failed=$((count_failed + 1))
    failed_names="$failed_names $base"
    echo "FAILED: $base"
  fi
done

echo ""
echo "PER_FILE_PATCHES:"
echo "  APPLIED: $count_applied"
echo "  FAILED: $count_failed"
echo ""

# If some patches failed and combined patch exists, try it as fallback
if [ "$count_failed" -gt 0 ] && [ -f "$FORK_PATCH_DIR/combined.patch" ] && [ -s "$FORK_PATCH_DIR/combined.patch" ]; then
  echo "=== Trying combined patch for remaining changes ==="
  combined_result=""
  if git apply --reject "$FORK_PATCH_DIR/combined.patch" 2>/dev/null; then
    count_applied=$((count_applied + count_failed))
    count_failed=0
    failed_names=""
    combined_result="APPLIED"
  else
    combined_result="PARTIAL"
  fi
  echo "COMBINED_PATCH: $combined_result"
  echo ""
fi

# Report any .rej files left behind
REJECT_FILES=$(find "$PROJECT_DIR" -name '*.rej' -type f -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | head -20 || true)
if [ -n "$REJECT_FILES" ]; then
  echo "=== REJECT FILES LEFT FOR MANUAL RESOLUTION ==="
  echo "$REJECT_FILES" | sed 's/^/  /'
  echo ""
fi

if [ "$count_failed" -gt 0 ]; then
  echo "FAILED_PATCHES:$failed_names"
fi

echo "TOTAL_APPLIED: $count_applied"
echo "TOTAL_FAILED: $count_failed"
echo ""
echo "=== PATCH RE-APPLICATION COMPLETE ==="
