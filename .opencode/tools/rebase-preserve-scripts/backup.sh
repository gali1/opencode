#!/usr/bin/env bash
set -euo pipefail

# Phase 3 — Immutable Backup Creation
# Creates a complete external backup before any destructive Git operations

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

PROJECT_DIR="${1:-.}"
BACKUP_BASE_DIR="${2:-}"
INCLUDE_GIT_DIR="${3:-true}"
DRY_RUN="${4:-false}"

cd "$PROJECT_DIR"
PROJECT_DIR="$(pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"

require_git_repo "$PROJECT_DIR"

# Determine backup location — prefer env override, then temp dir, then sibling dir
if [ -z "$BACKUP_BASE_DIR" ]; then
  if [ -n "${REBASE_PRESERVE_BACKUP_DIR:-}" ]; then
    BACKUP_BASE_DIR="$REBASE_PRESERVE_BACKUP_DIR"
  else
    _tmp="$(_rp_tmpdir)"
    if [ -d "$_tmp" ]; then
      BACKUP_BASE_DIR="$_tmp/rebase-preserve-backups/${PROJECT_NAME}"
    else
      BACKUP_BASE_DIR="$(dirname "$PROJECT_DIR")/.rebase-preserve-backups"
    fi
  fi
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_ID="${PROJECT_NAME}_${TIMESTAMP}"
BACKUP_DIR="${BACKUP_BASE_DIR}/${BACKUP_ID}"

echo "=== IMMUTABLE BACKUP CREATION ==="
echo "PROJECT_DIR: $PROJECT_DIR"
echo "BACKUP_DIR: $BACKUP_DIR"
echo "BACKUP_ID: $BACKUP_ID"
echo "INCLUDE_GIT_DIR: $INCLUDE_GIT_DIR"
echo "DRY_RUN: $DRY_RUN"
echo ""

# Build rsync exclude list — always exclude heavy regenerable directories
RSYNC_EXCLUDES=()
if [ "$INCLUDE_GIT_DIR" != "true" ]; then
  RSYNC_EXCLUDES+=(--exclude='.git/')
fi
# Always exclude node_modules — they can be reinstalled with `bun install`/`npm install`
RSYNC_EXCLUDES+=(--exclude='node_modules/')
# Exclude other regenerable heavy dirs
RSYNC_EXCLUDES+=(--exclude='.next/')
RSYNC_EXCLUDES+=(--exclude='dist/')
RSYNC_EXCLUDES+=(--exclude='build/')
RSYNC_EXCLUDES+=(--exclude='target/')
RSYNC_EXCLUDES+=(--exclude='.turbo/')
RSYNC_EXCLUDES+=(--exclude='__pycache__/')
RSYNC_EXCLUDES+=(--exclude='.venv/')

# Estimate actual backup size (respecting excludes) rather than raw project size
# Use du with exclude patterns for a realistic estimate
EXCLUDE_DU_ARGS=""
for excl in "${RSYNC_EXCLUDES[@]}"; do
  dir_name="${excl#--exclude=}"
  dir_name="${dir_name%/}"
  dir_name="${dir_name#\'}"
  dir_name="${dir_name%\'}"
  EXCLUDE_DU_ARGS="$EXCLUDE_DU_ARGS --exclude=$dir_name"
done
ESTIMATED_SIZE=$(du -sk $EXCLUDE_DU_ARGS "$PROJECT_DIR" 2>/dev/null | awk '{print $1}' || echo "0")

# Check storage availability with 1.2x safety margin (not 2x — the backup is a copy, not a diff)
AVAILABLE_SPACE=$(df -k "$(dirname "$BACKUP_BASE_DIR")" 2>/dev/null | tail -1 | awk '{print $4}' || echo "0")
echo "ESTIMATED_BACKUP_SIZE_KB: $ESTIMATED_SIZE"
echo "AVAILABLE_SPACE_KB: $AVAILABLE_SPACE"

if [ -n "$AVAILABLE_SPACE" ] && [ "$AVAILABLE_SPACE" != "0" ] && [ -n "$ESTIMATED_SIZE" ] && [ "$ESTIMATED_SIZE" != "0" ]; then
  REQUIRED=$((ESTIMATED_SIZE + ESTIMATED_SIZE / 5))  # 1.2x safety margin
  if [ "$AVAILABLE_SPACE" -lt "$REQUIRED" ]; then
    echo "WARNING: Low storage. Need ~${REQUIRED}KB (1.2x), have ${AVAILABLE_SPACE}KB"
    echo "Proceeding anyway — backup may partially fail if disk fills up."
  fi
fi
echo ""

# Prevent overwriting existing backups
if [ -d "$BACKUP_DIR" ]; then
  echo "ERROR: Backup directory already exists: $BACKUP_DIR"
  echo "This should not happen with timestamped directories."
  exit 1
fi

if [ "$DRY_RUN" = "true" ]; then
  echo "DRY_RUN: Would create backup at $BACKUP_DIR"
  echo "DRY_RUN: Estimated size ~${ESTIMATED_SIZE}KB"
  echo "DRY_RUN: Skipping actual backup creation"
  echo ""
  echo "BACKUP_ID: $BACKUP_ID"
  echo "BACKUP_DIR: $BACKUP_DIR"
  echo "=== DRY RUN COMPLETE ==="
  exit 0
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Store metadata
cat > "$BACKUP_DIR/.backup-metadata.json" << METADATA_EOF
{
  "backup_id": "$BACKUP_ID",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "source_dir": "$PROJECT_DIR",
  "backup_dir": "$BACKUP_DIR",
  "branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "DETACHED")",
  "head_commit": "$(git rev-parse HEAD 2>/dev/null || echo "UNKNOWN")",
  "head_message": "$(git log -1 --pretty=format:'%s' 2>/dev/null | sed 's/"/\\"/g')",
  "include_git_dir": $INCLUDE_GIT_DIR,
  "git_status_clean": $(git status --porcelain 2>/dev/null | wc -l | tr -d ' ' | awk '{print ($1 == 0) ? "true" : "false"}'),
  "tracked_file_count": $(git ls-files 2>/dev/null | wc -l | tr -d ' '),
  "untracked_file_count": $(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
}
METADATA_EOF

echo "=== STARTING BACKUP ==="

# Perform backup using rsync with preservation flags
if command -v rsync >/dev/null 2>&1; then
  echo "BACKUP_METHOD: rsync"
  if ! rsync -aHP \
    --partial \
    "${RSYNC_EXCLUDES[@]}" \
    "$PROJECT_DIR/" \
    "$BACKUP_DIR/project/" \
    2>&1 | tail -5; then
    echo "WARNING: rsync completed with warnings (may be non-critical)"
  fi
else
  echo "BACKUP_METHOD: cp (rsync not available)"
  mkdir -p "$BACKUP_DIR/project"
  # Build tar excludes to match rsync settings
  TAR_EXCLUDES=()
  if [ "$INCLUDE_GIT_DIR" != "true" ]; then
    TAR_EXCLUDES+=(--exclude='.git')
  fi
  for dir in "${REGEN_EXCLUDES[@]}"; do
    TAR_EXCLUDES+=(--exclude="$dir")
  done
  tar -cf - "${TAR_EXCLUDES[@]}" -C "$PROJECT_DIR" . | tar -xf - -C "$BACKUP_DIR/project/"
fi

echo ""

# Validate backup integrity
echo "=== BACKUP VALIDATION ==="
SOURCE_COUNT=$(find "$PROJECT_DIR" -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' -not -path '*/dist/*' -not -path '*/build/*' -not -path '*/target/*' -not -path '*/.turbo/*' -not -path '*/__pycache__/*' -not -path '*/.venv/*' 2>/dev/null | wc -l | tr -d ' ')
BACKUP_COUNT=$(find "$BACKUP_DIR/project" -type f 2>/dev/null | wc -l | tr -d ' ')

echo "SOURCE_FILE_COUNT: $SOURCE_COUNT"
echo "BACKUP_FILE_COUNT: $BACKUP_COUNT"

DIFF=$((SOURCE_COUNT - BACKUP_COUNT))
if [ "$DIFF" -lt 0 ]; then DIFF=$((-DIFF)); fi
# Allow small variance (race conditions, temp files)
if [ "$DIFF" -gt 10 ]; then
  echo "WARNING: File count mismatch (delta=$DIFF). Source=$SOURCE_COUNT Backup=$BACKUP_COUNT"
  echo "This may be due to race conditions, permission issues, or .git exclusion."
else
  echo "FILE_COUNT_MATCH: true (delta=$DIFF)"
fi

# Backup size
BACKUP_SIZE=$(du -sk "$BACKUP_DIR/project" 2>/dev/null | awk '{print $1}' || echo "0")
echo "BACKUP_SIZE_KB: $BACKUP_SIZE"

# Store git state separately for fast rollback reference
echo ""
echo "=== STORING GIT STATE ==="
git log --oneline -20 > "$BACKUP_DIR/.git-log-snapshot.txt" 2>/dev/null || true
git status --porcelain > "$BACKUP_DIR/.git-status-snapshot.txt" 2>/dev/null || true
git stash list > "$BACKUP_DIR/.git-stash-snapshot.txt" 2>/dev/null || true
git branch -a > "$BACKUP_DIR/.git-branches-snapshot.txt" 2>/dev/null || true
git diff > "$BACKUP_DIR/.git-unstaged-diff.patch" 2>/dev/null || true
git diff --cached > "$BACKUP_DIR/.git-staged-diff.patch" 2>/dev/null || true

echo "Git state snapshots saved"
echo ""

# Write a breadcrumb file in the project so other scripts can find this backup
mkdir -p "$PROJECT_DIR/.opencode"
cat > "$PROJECT_DIR/.opencode/.last-backup-location" << BREADCRUMB_EOF
$BACKUP_DIR
BREADCRUMB_EOF
echo "BREADCRUMB_WRITTEN: $PROJECT_DIR/.opencode/.last-backup-location"

echo ""
echo "BACKUP_COMPLETE: true"
echo "BACKUP_ID: $BACKUP_ID"
echo "BACKUP_DIR: $BACKUP_DIR"
echo ""
echo "=== BACKUP CREATION COMPLETE ==="
