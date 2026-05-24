#!/usr/bin/env bash
set -euo pipefail

# Phase 8 — Recovery and Rollback
# Restores repository from backup to pre-operation state

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

PROJECT_DIR="${1:-.}"
BACKUP_REF="${2:-}"
RESTORE_MODE="${3:-full}"
DRY_RUN="${4:-false}"

cd "$PROJECT_DIR"
PROJECT_DIR="$(pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"

echo "=== ROLLBACK AND RECOVERY ==="
echo "PROJECT_DIR: $PROJECT_DIR"
echo "RESTORE_MODE: $RESTORE_MODE"
echo "DRY_RUN: $DRY_RUN"
echo ""

# List available backups if no backup_ref provided
if [ -z "$BACKUP_REF" ]; then
  echo "=== AVAILABLE BACKUPS ==="
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  bash "$SCRIPT_DIR/list-backups.sh" "$PROJECT_DIR"
  echo ""
  echo "Provide a BACKUP_ID or full path to perform rollback."
  echo "Usage: rollback <project_dir> <backup_id_or_path> [full|files-only|git-only]"
  exit 0
fi

# Resolve the backup
BACKUP_DIR=$(resolve_backup "$BACKUP_REF")

if [ -z "$BACKUP_DIR" ]; then
  echo "ERROR: Backup not found: $BACKUP_REF"
  echo ""
  echo "Searched in:"
  echo "  $(dirname "$PROJECT_DIR")/.rebase-preserve-backups/$BACKUP_REF"
  echo "  /tmp/rebase-preserve-backups/${PROJECT_NAME}/$BACKUP_REF"
  echo "  /tmp/opencode/backup/$BACKUP_REF"
  echo ""
  echo "Provide the full absolute path if the backup is in a custom location."
  exit 1
fi

BACKUP_PROJECT_DIR="$BACKUP_DIR/project"

if [ ! -d "$BACKUP_PROJECT_DIR" ]; then
  echo "ERROR: Backup project directory not found: $BACKUP_PROJECT_DIR"
  exit 1
fi

echo "BACKUP_DIR: $BACKUP_DIR"
if [ -f "$BACKUP_DIR/.backup-metadata.json" ]; then
  echo "BACKUP_METADATA:"
  cat "$BACKUP_DIR/.backup-metadata.json" | sed 's/^/  /'
  echo ""
fi

if [ "$DRY_RUN" = "true" ]; then
  echo "DRY_RUN: Would restore from $BACKUP_DIR using mode=$RESTORE_MODE"
  echo "=== DRY RUN COMPLETE ==="
  exit 0
fi

case "$RESTORE_MODE" in
  full)
    echo "=== FULL RESTORATION ==="
    echo "Restoring all files from backup..."

    if command -v rsync >/dev/null 2>&1; then
      rsync -aHP \
        --delete \
        --partial \
        "$BACKUP_PROJECT_DIR/" \
        "$PROJECT_DIR/" \
        2>&1 | tail -10
    else
      if [ -d "$BACKUP_PROJECT_DIR/.git" ]; then
        find "$PROJECT_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} \; 2>/dev/null || true
      else
        find "$PROJECT_DIR" -mindepth 1 -maxdepth 1 -not -name '.git' -exec rm -rf {} \; 2>/dev/null || true
      fi
      cp -a "$BACKUP_PROJECT_DIR/." "$PROJECT_DIR/"
    fi
    echo ""
    echo "FULL_RESTORE_COMPLETE: true"
    ;;

  files-only)
    echo "=== FILES-ONLY RESTORATION ==="
    echo "Restoring non-git files from backup..."

    if command -v rsync >/dev/null 2>&1; then
      rsync -aHP \
        --delete \
        --partial \
        --exclude='.git/' \
        "$BACKUP_PROJECT_DIR/" \
        "$PROJECT_DIR/" \
        2>&1 | tail -10
    else
      find "$PROJECT_DIR" -mindepth 1 -maxdepth 1 -not -name '.git' -exec rm -rf {} \; 2>/dev/null || true
      find "$BACKUP_PROJECT_DIR" -mindepth 1 -maxdepth 1 -not -name '.git' -exec cp -a {} "$PROJECT_DIR/" \; 2>/dev/null || true
    fi
    echo ""
    echo "FILES_RESTORE_COMPLETE: true"
    ;;

  git-only)
    echo "=== GIT STATE RESTORATION ==="
    if [ -f "$BACKUP_DIR/.backup-metadata.json" ]; then
      BACKUP_COMMIT=$(grep '"head_commit"' "$BACKUP_DIR/.backup-metadata.json" | head -1 | sed 's/.*"head_commit"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
      BACKUP_BRANCH=$(grep '"branch"' "$BACKUP_DIR/.backup-metadata.json" | head -1 | sed 's/.*"branch"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

      if [ -n "$BACKUP_COMMIT" ] && [ "$BACKUP_COMMIT" != "UNKNOWN" ]; then
        echo "Restoring to commit: $BACKUP_COMMIT on branch: $BACKUP_BRANCH"

        # Abort any in-progress operations
        git rebase --abort 2>/dev/null || true
        git merge --abort 2>/dev/null || true
        git cherry-pick --abort 2>/dev/null || true

        if git rev-parse --verify "$BACKUP_COMMIT" >/dev/null 2>&1; then
          git checkout "$BACKUP_BRANCH" 2>/dev/null || true
          git reset --hard "$BACKUP_COMMIT" 2>/dev/null
          echo "GIT_RESET_TO: $BACKUP_COMMIT"
        else
          echo "WARNING: Backup commit $BACKUP_COMMIT not found in history."
          echo "The commit may have been garbage collected after rebase."
          echo "Use 'full' or 'files-only' restore mode instead."
        fi

        # Restore stashed changes
        if [ -f "$BACKUP_DIR/.git-unstaged-diff.patch" ] && [ -s "$BACKUP_DIR/.git-unstaged-diff.patch" ]; then
          echo "Restoring unstaged changes from backup..."
          git apply "$BACKUP_DIR/.git-unstaged-diff.patch" 2>/dev/null || echo "WARNING: Could not apply unstaged diff patch"
        fi
        if [ -f "$BACKUP_DIR/.git-staged-diff.patch" ] && [ -s "$BACKUP_DIR/.git-staged-diff.patch" ]; then
          echo "Restoring staged changes from backup..."
          git apply --cached "$BACKUP_DIR/.git-staged-diff.patch" 2>/dev/null || echo "WARNING: Could not apply staged diff patch"
        fi
      else
        echo "ERROR: No valid commit found in backup metadata"
        exit 1
      fi
    else
      echo "ERROR: No backup metadata found. Use 'full' restore mode."
      exit 1
    fi
    echo ""
    echo "GIT_RESTORE_COMPLETE: true"
    ;;

  *)
    echo "ERROR: Unknown restore mode: $RESTORE_MODE"
    echo "Supported modes: full, files-only, git-only"
    exit 1
    ;;
esac

# Post-restore verification
echo ""
echo "=== POST-RESTORE VERIFICATION ==="
echo "CURRENT_BRANCH: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "UNKNOWN")"
echo "HEAD_COMMIT: $(git rev-parse HEAD 2>/dev/null || echo "UNKNOWN")"
echo "WORKTREE_VALID: $(git rev-parse --is-inside-work-tree 2>/dev/null || echo "false")"
echo "WORKING_TREE_STATUS:"
git status --porcelain 2>/dev/null | head -20 | sed 's/^/  /' || echo "  Unable to determine"
echo ""

echo "=== ROLLBACK COMPLETE ==="
