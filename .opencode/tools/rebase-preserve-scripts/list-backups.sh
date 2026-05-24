#!/usr/bin/env bash
set -euo pipefail

# List available backups for a project — searches all known backup locations

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

PROJECT_DIR="${1:-.}"
cd "$PROJECT_DIR"
PROJECT_DIR="$(pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"

echo "=== AVAILABLE BACKUPS ==="
echo ""

# Collect all known backup locations via shared helper
SEARCH_DIRS=()
while IFS= read -r dir; do
  SEARCH_DIRS+=("$dir")
done < <(_rp_backup_search_dirs "$PROJECT_DIR")

# Also check breadcrumb for a location we might have missed
if [ -f "$PROJECT_DIR/.opencode/.last-backup-location" ]; then
  BREADCRUMB=$(tr -d '[:space:]' < "$PROJECT_DIR/.opencode/.last-backup-location" 2>/dev/null)
  if [ -n "$BREADCRUMB" ] && [ -d "$BREADCRUMB" ]; then
    BREADCRUMB_BASE=$(dirname "$BREADCRUMB")
    # Add parent dir if not already in list
    ALREADY_LISTED=false
    for d in "${SEARCH_DIRS[@]}"; do
      if [ "$d" = "$BREADCRUMB_BASE" ]; then
        ALREADY_LISTED=true
        break
      fi
    done
    if [ "$ALREADY_LISTED" = "false" ]; then
      SEARCH_DIRS+=("$BREADCRUMB_BASE")
    fi
  fi
fi

COUNT=0
for BASE_DIR in "${SEARCH_DIRS[@]}"; do
  if [ ! -d "$BASE_DIR" ]; then
    continue
  fi

  BACKUP_DIRS=$(ls -1d "$BASE_DIR"/*/ 2>/dev/null | sort -r || true)
  if [ -z "$BACKUP_DIRS" ]; then
    continue
  fi

  while IFS= read -r bdir; do
    bdir="${bdir%/}"
    bid=$(basename "$bdir")
    COUNT=$((COUNT + 1))

    echo "--- BACKUP $COUNT ---"
    echo "BACKUP_ID: $bid"
    echo "PATH: $bdir"

    if [ -f "$bdir/.backup-metadata.json" ]; then
      cat "$bdir/.backup-metadata.json" | sed 's/^/  /'
    else
      echo "  (no metadata)"
    fi

    if [ -d "$bdir/project" ]; then
      FILE_COUNT=$(find "$bdir/project" -type f -not -path '*/.git/*' 2>/dev/null | wc -l | tr -d ' ')
      DIR_SIZE=$(du -sh "$bdir/project" 2>/dev/null | awk '{print $1}')
      echo "  file_count: $FILE_COUNT"
      echo "  size: $DIR_SIZE"
    fi

    # Check if patches exist
    if [ -d "$bdir/patches/fork" ]; then
      PATCH_COUNT=$(find "$bdir/patches/fork" -name '*.patch' 2>/dev/null | wc -l | tr -d ' ')
      echo "  patches: $PATCH_COUNT"
    fi
    echo ""
  done <<< "$BACKUP_DIRS"
done

if [ "$COUNT" -eq 0 ]; then
  echo "No backups found in any of these locations:"
  for d in "${SEARCH_DIRS[@]}"; do
    echo "  $d"
  done
  echo ""
  echo "Run the backup tool first to create one."
fi

echo "TOTAL_BACKUPS: $COUNT"
echo ""
echo "=== LIST COMPLETE ==="
