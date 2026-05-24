#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

PROJECT_DIR="${1:-.}"
BACKUP_DIR="${2:-}"
UPSTREAM_REMOTE="${3:-}"
UPSTREAM_BRANCH="${4:-}"

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

# Auto-detect upstream remote
if [ -z "$UPSTREAM_REMOTE" ]; then
  UPSTREAM_REMOTE=$(detect_upstream_remote)
  if [ -z "$UPSTREAM_REMOTE" ]; then
    echo "WARNING: No upstream remote found — skipping patch extraction"
    echo "FILE_PATCHES_EXTRACTED: 0"
    echo "COMMIT_PATCHES_EXTRACTED: 0"
    exit 0
  fi
fi

# Auto-detect upstream branch
if [ -z "$UPSTREAM_BRANCH" ]; then
  UPSTREAM_BRANCH=$(detect_upstream_branch "$UPSTREAM_REMOTE")
  if [ -z "$UPSTREAM_BRANCH" ]; then
    echo "WARNING: Could not detect upstream branch — skipping patch extraction"
    echo "FILE_PATCHES_EXTRACTED: 0"
    echo "COMMIT_PATCHES_EXTRACTED: 0"
    exit 0
  fi
fi

UPSTREAM_REF="$UPSTREAM_REMOTE/$UPSTREAM_BRANCH"
MERGE_BASE=$(git merge-base HEAD "$UPSTREAM_REF" 2>/dev/null || echo "")

if [ -z "$MERGE_BASE" ]; then
  echo "WARNING: Cannot find merge base with $UPSTREAM_REF — no fork patches to extract"
  echo "FILE_PATCHES_EXTRACTED: 0"
  echo "COMMIT_PATCHES_EXTRACTED: 0"
  exit 0
fi

# Check if HEAD is at the merge base (no fork divergence)
FORK_HEAD=$(git rev-parse HEAD 2>/dev/null)
if [ "$MERGE_BASE" = "$FORK_HEAD" ]; then
  echo "=== FORK PATCH EXTRACTION ==="
  echo "MERGE_BASE: $MERGE_BASE"
  echo "UPSTREAM_REF: $UPSTREAM_REF"
  echo "FORK_HEAD: $FORK_HEAD"
  echo "NOTE: Fork HEAD equals merge base — no fork-specific changes to extract"
  echo ""
  echo "FILE_PATCHES_EXTRACTED: 0"
  echo "COMMIT_PATCHES_EXTRACTED: 0"
  echo ""
  echo "=== PATCH EXTRACTION COMPLETE ==="
  exit 0
fi

FORK_PATCH_DIR="$BACKUP_DIR/patches/fork"
mkdir -p "$FORK_PATCH_DIR"

echo "=== FORK PATCH EXTRACTION ==="
echo "MERGE_BASE: $MERGE_BASE"
echo "UPSTREAM_REF: $UPSTREAM_REF"
echo "FORK_HEAD: $FORK_HEAD"
echo "PATCH_DIR: $FORK_PATCH_DIR"
echo ""

# Extract per-file patches
git diff "$MERGE_BASE..HEAD" --name-only 2>/dev/null | while IFS= read -r file; do
  if [ -n "$file" ]; then
    safe_name=$(echo "$file" | sed 's/[^a-zA-Z0-9._-]/_/g')
    git diff "$MERGE_BASE..HEAD" -- "$file" > "$FORK_PATCH_DIR/${safe_name}.patch" 2>/dev/null
    if [ ! -s "$FORK_PATCH_DIR/${safe_name}.patch" ]; then
      rm -f "$FORK_PATCH_DIR/${safe_name}.patch"
    fi
  fi
done

# Combined patch
git diff "$MERGE_BASE..HEAD" > "$FORK_PATCH_DIR/combined.patch" 2>/dev/null

# Commit-level patches
while IFS= read -r commit; do
  if [ -n "$commit" ]; then
    git format-patch -1 "$commit" --output-directory "$FORK_PATCH_DIR" 2>/dev/null || true
  fi
done < <(git log "$MERGE_BASE..HEAD" --reverse --format="%H" 2>/dev/null)

FILE_PATCH_COUNT=$(find "$FORK_PATCH_DIR" -maxdepth 1 -name '*.patch' ! -name 'combined.patch' ! -name '0*.patch' 2>/dev/null | wc -l | tr -d ' ')
COMMIT_PATCH_COUNT=$(find "$FORK_PATCH_DIR" -maxdepth 1 -name '0*.patch' 2>/dev/null | wc -l | tr -d ' ')

# Preserve previous sync history
PREV_SYNCS="[]"
if [ -f "$FORK_PATCH_DIR/manifest.json" ]; then
  PREV_SYNCS=$(grep '"previous_syncs"' "$FORK_PATCH_DIR/manifest.json" 2>/dev/null | sed 's/.*"previous_syncs"[[:space:]]*:[[:space:]]*//' | sed 's/,[[:space:]]*$//' 2>/dev/null || echo "[]")
fi

cat > "$FORK_PATCH_DIR/manifest.json" << PATCH_EOF
{
  "extracted_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "fork_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")",
  "fork_commit": "$FORK_HEAD",
  "merge_base": "$MERGE_BASE",
  "upstream_ref": "$UPSTREAM_REF",
  "file_patch_count": $FILE_PATCH_COUNT,
  "commit_patch_count": $COMMIT_PATCH_COUNT,
  "previous_syncs": $PREV_SYNCS
}
PATCH_EOF

echo "FILE_PATCHES_EXTRACTED: $FILE_PATCH_COUNT"
echo "COMMIT_PATCHES_EXTRACTED: $COMMIT_PATCH_COUNT"
echo ""
echo "=== PATCH EXTRACTION COMPLETE ==="
