#!/usr/bin/env bash
set -euo pipefail

# Phase 8 — Finalize
# Completes the rebase-preserve workflow: optionally commits reintegrated
# changes, produces an audit report, and cleans up session artifacts.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

PROJECT_DIR="${1:-.}"
AUTO_COMMIT="${2:-false}"
COMMIT_MESSAGE="${3:-}"
CLEAN_ARTIFACTS="${4:-true}"

cd "$PROJECT_DIR"
PROJECT_DIR="$(pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"

require_git_repo "$PROJECT_DIR"

echo "=== REBASE-PRESERVE FINALIZE ==="
echo "PROJECT_DIR: $PROJECT_DIR"
echo "AUTO_COMMIT: $AUTO_COMMIT"
echo "CLEAN_ARTIFACTS: $CLEAN_ARTIFACTS"
echo ""

# Current state
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "UNKNOWN")
HEAD_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "UNKNOWN")

echo "=== WORKING TREE STATUS ==="
STATUS_OUTPUT=$(git status --short 2>/dev/null || true)
if [ -n "$STATUS_OUTPUT" ]; then
  echo "$STATUS_OUTPUT" | head -50 | sed 's/^/  /'
  STATUS_COUNT=$(echo "$STATUS_OUTPUT" | wc -l | tr -d ' ')
  if [ "$STATUS_COUNT" -gt 50 ]; then
    echo "  ... ($((STATUS_COUNT - 50)) more files)"
  fi
else
  echo "  (clean working tree)"
fi
echo ""

# Auto-commit if requested
COMMIT_CREATED="false"
if [ "$AUTO_COMMIT" = "true" ]; then
  echo "=== AUTO-COMMIT ==="
  if [ -z "$STATUS_OUTPUT" ]; then
    echo "Nothing to commit — working tree is clean."
  else
    git add -A 2>/dev/null
    echo "Staged all changes."

    # Build commit message
    if [ -z "$COMMIT_MESSAGE" ]; then
      # Auto-generate message with backup context
      GIT_BACKUP=$(resolve_git_backup "$CURRENT_BRANCH" 2>/dev/null || true)
      BACKUP_DIR=$(resolve_backup "" 2>/dev/null || true)
      BACKUP_REF=""
      if [ -n "$GIT_BACKUP" ]; then
        BACKUP_REF="git:$GIT_BACKUP"
      elif [ -n "$BACKUP_DIR" ]; then
        BACKUP_REF="fs:$(basename "$BACKUP_DIR")"
      fi
      COMMIT_MESSAGE="chore: reintegrate customizations after upstream sync [rebase-preserve${BACKUP_REF:+ $BACKUP_REF}]"
    fi

    if git commit -m "$COMMIT_MESSAGE" 2>/dev/null; then
      COMMIT_CREATED="true"
      echo "COMMIT_MESSAGE: $COMMIT_MESSAGE"
      echo "COMMIT_HASH: $(git rev-parse HEAD 2>/dev/null)"
    else
      echo "WARNING: Commit failed — may need manual resolution"
    fi
  fi
  echo ""
fi

if [ "$COMMIT_CREATED" != "true" ] && [ "$AUTO_COMMIT" != "true" ] && [ -n "$STATUS_OUTPUT" ]; then
  echo "=== MANUAL COMMIT NEEDED ==="
  echo "Uncommitted changes detected. To finalize:"
  echo "  git add -A"
  echo "  git commit -m 'chore: reintegrate customizations after upstream sync'"
  echo ""
fi

# Recent history
echo "=== RECENT COMMITS ==="
git log --oneline -10 2>/dev/null | sed 's/^/  /' || echo "  (none)"
echo ""

# Clean up artifacts
if [ "$CLEAN_ARTIFACTS" = "true" ]; then
  echo "=== CLEANUP ==="
  CLEANED=0

  # Remove .rej files from failed patch applications
  while IFS= read -r rejfile; do
    [ -z "$rejfile" ] && continue
    rm -f "$rejfile" 2>/dev/null && CLEANED=$((CLEANED + 1))
  done < <(find "$PROJECT_DIR" -name '*.rej' -type f -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null)
  if [ "$CLEANED" -gt 0 ]; then
    echo "Removed $CLEANED .rej file(s)"
  fi

  # Remove breadcrumb (it points to a temp backup)
  if [ -f "$PROJECT_DIR/.opencode/.last-backup-location" ]; then
    rm -f "$PROJECT_DIR/.opencode/.last-backup-location" 2>/dev/null
    echo "Removed backup breadcrumb file"
  fi

  # Remove pre-sync tags older than current session
  PRUNED_TAGS=0
  while IFS= read -r tag; do
    [ -z "$tag" ] && continue
    git tag -d "$tag" >/dev/null 2>&1 && PRUNED_TAGS=$((PRUNED_TAGS + 1))
  done < <(git tag -l 'rebase-preserve/pre-sync-*' 2>/dev/null)
  if [ "$PRUNED_TAGS" -gt 0 ]; then
    echo "Pruned $PRUNED_TAGS pre-sync safety tag(s)"
  fi

  if [ "$CLEANED" -eq 0 ] && [ "$PRUNED_TAGS" -eq 0 ]; then
    echo "No artifacts to clean up"
  fi
  echo ""
fi

# Audit report
WORKFLOW_END=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_BACKUP=$(resolve_git_backup "$CURRENT_BRANCH" 2>/dev/null || true)
FS_BACKUP=$(resolve_backup "" 2>/dev/null || true)
LOG_DIR=$(_rp_log_dir)

AUDIT_REPORT="=== FINAL AUDIT REPORT ===
PROJECT: $PROJECT_NAME
BRANCH: $CURRENT_BRANCH
HEAD: $(git rev-parse HEAD 2>/dev/null)
WORKFLOW_COMPLETED: $WORKFLOW_END
GIT_BACKUP_BRANCH: ${GIT_BACKUP:-none}
FS_BACKUP: ${FS_BACKUP:-none}
AUTO_COMMITTED: $COMMIT_CREATED
ARTIFACTS_CLEANED: $CLEAN_ARTIFACTS
LOG_DIR: $LOG_DIR

The backup is RETAINED for safety. Remove when no longer needed:
$([ -n "$GIT_BACKUP" ] && echo "  git branch -D $GIT_BACKUP" || true)
$([ -n "$FS_BACKUP" ] && echo "  rm -rf $FS_BACKUP" || true)"

echo "$AUDIT_REPORT"

# Write to persistent audit log
_rp_log "finalize_${PROJECT_NAME}" "$AUDIT_REPORT"

echo ""
echo "=== FINALIZE COMPLETE ==="
