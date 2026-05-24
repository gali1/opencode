#!/usr/bin/env bash
set -euo pipefail

# Reintegration Helper — File Diff Extractor
# Provides the LLM with backup vs current content for a single file
# so the LLM can perform intelligent semantic merge

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

PROJECT_DIR="${1:-.}"
BACKUP_DIR="${2:-}"
FILE_PATH="${3:-}"
OUTPUT_MODE="${4:-both}"

if [ -z "$FILE_PATH" ]; then
  echo "ERROR: FILE_PATH required"
  echo "Usage: file-diff.sh <project_dir> <backup_dir> <file_path> [both|diff|content]"
  exit 1
fi

cd "$PROJECT_DIR"
PROJECT_DIR="$(pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"

BACKUP_DIR=$(resolve_backup "$BACKUP_DIR")

if [ -z "$BACKUP_DIR" ]; then
  echo "ERROR: No backup directory found."
  echo "Provide backup path as argument, or ensure a backup was created first."
  exit 1
fi

BACKUP_PROJECT_DIR="$BACKUP_DIR/project"
CURRENT_FILE="$PROJECT_DIR/$FILE_PATH"
BACKUP_FILE="$BACKUP_PROJECT_DIR/$FILE_PATH"

echo "=== FILE DIFF: $FILE_PATH ==="
echo "BACKUP_DIR: $BACKUP_DIR"
echo "CURRENT_EXISTS: $([ -f "$CURRENT_FILE" ] && echo "true" || echo "false")"
echo "BACKUP_EXISTS: $([ -f "$BACKUP_FILE" ] && echo "true" || echo "false")"
echo ""

case "$OUTPUT_MODE" in
  both)
    if [ -f "$BACKUP_FILE" ]; then
      echo "=== BACKUP VERSION ==="
      echo "--- BEGIN: $FILE_PATH (from backup) ---"
      cat "$BACKUP_FILE"
      echo ""
      echo "--- END: $FILE_PATH (from backup) ---"
      echo ""
    else
      echo "=== BACKUP VERSION: FILE NOT FOUND ==="
      echo ""
    fi

    if [ -f "$CURRENT_FILE" ]; then
      echo "=== CURRENT VERSION (post-rebase) ==="
      echo "--- BEGIN: $FILE_PATH (current) ---"
      cat "$CURRENT_FILE"
      echo ""
      echo "--- END: $FILE_PATH (current) ---"
      echo ""
    else
      echo "=== CURRENT VERSION: FILE NOT FOUND ==="
      echo "(File was deleted by upstream or rebase)"
      echo ""
    fi
    ;;

  diff)
    if [ -f "$BACKUP_FILE" ] && [ -f "$CURRENT_FILE" ]; then
      echo "=== UNIFIED DIFF ==="
      diff -u "$BACKUP_FILE" "$CURRENT_FILE" || true
    elif [ -f "$BACKUP_FILE" ]; then
      echo "=== FILE DELETED IN CURRENT ==="
      echo "The file exists in backup but was removed after rebase."
      echo "Full backup content:"
      cat "$BACKUP_FILE"
    elif [ -f "$CURRENT_FILE" ]; then
      echo "=== FILE NEW IN CURRENT ==="
      echo "The file does not exist in backup but exists after rebase."
      echo "Full current content:"
      cat "$CURRENT_FILE"
    else
      echo "File not found in either location."
    fi
    ;;

  content)
    if [ -f "$BACKUP_FILE" ]; then
      echo "=== BACKUP CONTENT ==="
      cat "$BACKUP_FILE"
    else
      echo "=== FILE NOT IN BACKUP ==="
    fi
    ;;

  *)
    echo "ERROR: Unknown output mode: $OUTPUT_MODE"
    echo "Supported: both, diff, content"
    exit 1
    ;;
esac

echo ""
echo "=== FILE DIFF COMPLETE ==="
