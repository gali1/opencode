#!/usr/bin/env bash
set -euo pipefail

# Phase 4 — Controlled Git Synchronization
# Performs the actual git sync operation with safety checks

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

PROJECT_DIR="${1:-.}"
UPSTREAM_REMOTE="${2:-}"
UPSTREAM_BRANCH="${3:-}"
SYNC_METHOD="${4:-rebase}"
BACKUP_REF="${5:-}"
DRY_RUN="${6:-false}"

cd "$PROJECT_DIR"
PROJECT_DIR="$(pwd)"

require_git_repo "$PROJECT_DIR"

BACKUP_DIR=$(resolve_backup "$BACKUP_REF")

if [ -n "$BACKUP_DIR" ]; then
  echo "BACKUP_VERIFIED: $BACKUP_DIR"
else
  echo "WARNING: No backup found. Proceeding without backup verification."
  echo "This is NOT recommended for production use."
fi

# Auto-detect upstream remote
if [ -z "$UPSTREAM_REMOTE" ]; then
  UPSTREAM_REMOTE=$(detect_upstream_remote)
  if [ -z "$UPSTREAM_REMOTE" ]; then
    echo "ERROR: No upstream remote found."
    exit 1
  fi
fi

# Auto-detect upstream branch
if [ -z "$UPSTREAM_BRANCH" ]; then
  UPSTREAM_BRANCH=$(detect_upstream_branch "$UPSTREAM_REMOTE")
  if [ -z "$UPSTREAM_BRANCH" ]; then
    echo "ERROR: Could not detect upstream branch."
    exit 1
  fi
fi

UPSTREAM_REF="$UPSTREAM_REMOTE/$UPSTREAM_BRANCH"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
PRE_SYNC_HEAD=$(git rev-parse HEAD 2>/dev/null)

echo "=== CONTROLLED GIT SYNCHRONIZATION ==="
echo "PROJECT_DIR: $PROJECT_DIR"
echo "CURRENT_BRANCH: $CURRENT_BRANCH"
echo "UPSTREAM_REF: $UPSTREAM_REF"
echo "SYNC_METHOD: $SYNC_METHOD"
echo "PRE_SYNC_HEAD: $PRE_SYNC_HEAD"
echo "DRY_RUN: $DRY_RUN"
echo ""

# Handle dirty working tree — stash staged AND unstaged changes
STASH_REF=""
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "WARNING: Working tree is not clean."
  echo "UNCOMMITTED_CHANGES:"
  git status --porcelain 2>/dev/null | sed 's/^/  /'
  echo ""
  echo "Stashing uncommitted changes before sync..."
  if [ "$DRY_RUN" != "true" ]; then
    # git stash push handles both staged and unstaged; --include-untracked catches new files
    if git stash push -m "rebase-preserve-auto-stash-$(date +%s)" --include-untracked 2>/dev/null; then
      STASH_REF=$(git stash list 2>/dev/null | head -1 | cut -d: -f1)
      echo "AUTO_STASHED: $STASH_REF"
    else
      echo "WARNING: Stash failed — trying checkout to clean tree"
      git checkout -- . 2>/dev/null || true
      git clean -fd -e ".opencode" 2>/dev/null || true
    fi
  fi
  echo ""
fi

# Fetch upstream
echo "=== FETCHING UPSTREAM ==="
if ! git fetch "$UPSTREAM_REMOTE" "$UPSTREAM_BRANCH" 2>&1; then
  echo "ERROR: Failed to fetch from $UPSTREAM_REF"
  exit 1
fi
echo "FETCH_COMPLETE: true"
echo "UPSTREAM_HEAD_AFTER_FETCH: $(git rev-parse "$UPSTREAM_REF" 2>/dev/null)"
echo ""

if [ "$DRY_RUN" = "true" ]; then
  echo "DRY_RUN: Would perform $SYNC_METHOD from $UPSTREAM_REF"
  echo "DRY_RUN: Skipping actual synchronization"
  # Restore stash if we stashed
  if [ -n "$STASH_REF" ]; then
    git stash pop 2>/dev/null || true
  fi
  echo "=== DRY RUN COMPLETE ==="
  exit 0
fi

# Extract fork patches before sync (stored in backup dir for re-application later)
echo "=== EXTRACTING FORK PATCHES ==="
if [ -n "$BACKUP_DIR" ]; then
  bash "$SCRIPT_DIR/extract-patches.sh" "$PROJECT_DIR" "$BACKUP_DIR" "$UPSTREAM_REMOTE" "$UPSTREAM_BRANCH" || echo "WARNING: Patch extraction failed (non-fatal)"
else
  echo "WARNING: No backup dir — skipping patch extraction"
fi
echo ""

# Create a pre-sync tag for safety
PRE_SYNC_TAG="rebase-preserve/pre-sync-$(date +%s)"
git tag "$PRE_SYNC_TAG" HEAD 2>/dev/null || true
echo "PRE_SYNC_TAG: $PRE_SYNC_TAG"
echo ""

# Perform synchronization
echo "=== PERFORMING SYNC: $SYNC_METHOD ==="
SYNC_SUCCESS=false
SYNC_OUTPUT=""

case "$SYNC_METHOD" in
  rebase)
    SYNC_OUTPUT=$(git rebase "$UPSTREAM_REF" 2>&1) && SYNC_SUCCESS=true || true
    if [ "$SYNC_SUCCESS" != "true" ]; then
      echo "Rebase encountered conflicts. Aborting rebase..."
      git rebase --abort 2>/dev/null || true
      echo "SYNC_RESULT: CONFLICTS_DETECTED"
      echo "SYNC_OUTPUT:"
      echo "$SYNC_OUTPUT" | sed 's/^/  /'
      echo ""
      echo "Falling back to merge strategy..."
      SYNC_METHOD="merge"
      SYNC_OUTPUT=$(git merge "$UPSTREAM_REF" --no-edit 2>&1) && SYNC_SUCCESS=true || true
      if [ "$SYNC_SUCCESS" != "true" ]; then
        echo "Merge also has conflicts."
        echo "MERGE_OUTPUT:"
        echo "$SYNC_OUTPUT" | sed 's/^/  /'
        echo ""
        echo "CONFLICT_FILES:"
        git diff --name-only --diff-filter=U 2>/dev/null | sed 's/^/  /'
        echo ""
        echo "Aborting merge to preserve repository state..."
        git merge --abort 2>/dev/null || true
        echo "SYNC_RESULT: FAILED_CONFLICTS"
        echo ""
        echo "Restoring to pre-sync state..."
        git checkout "$CURRENT_BRANCH" 2>/dev/null || true
        git reset --hard "$PRE_SYNC_HEAD" 2>/dev/null || true
        echo "RESTORED_TO: $PRE_SYNC_HEAD"
      fi
    fi
    ;;
  merge)
    SYNC_OUTPUT=$(git merge "$UPSTREAM_REF" --no-edit 2>&1) && SYNC_SUCCESS=true || true
    if [ "$SYNC_SUCCESS" != "true" ]; then
      echo "MERGE_CONFLICTS:"
      git diff --name-only --diff-filter=U 2>/dev/null | sed 's/^/  /'
      git merge --abort 2>/dev/null || true
      echo "SYNC_RESULT: FAILED_CONFLICTS"
    fi
    ;;
  reset)
    git reset --hard "$UPSTREAM_REF" 2>&1 && SYNC_SUCCESS=true || true
    if [ "$SYNC_SUCCESS" != "true" ]; then
      echo "SYNC_RESULT: RESET_FAILED"
    fi
    ;;
  fetch-only)
    echo "Fetch-only mode: upstream fetched but no merge or rebase performed."
    echo "Working tree is unchanged. Review upstream changes with inspect_upstream."
    SYNC_SUCCESS=true
    ;;
  *)
    echo "ERROR: Unknown sync method: $SYNC_METHOD"
    exit 1
    ;;
esac

echo ""

if [ "$SYNC_SUCCESS" = "true" ]; then
  POST_SYNC_HEAD=$(git rev-parse HEAD 2>/dev/null)
  echo "SYNC_RESULT: SUCCESS"
  echo "SYNC_METHOD_USED: $SYNC_METHOD"
  echo "POST_SYNC_HEAD: $POST_SYNC_HEAD"
  echo ""

  # Verify repository integrity after sync
  echo "=== POST-SYNC INTEGRITY CHECK ==="
  echo "WORKTREE_VALID: $(git rev-parse --is-inside-work-tree 2>/dev/null || echo "false")"
  echo "DETACHED_HEAD: $(git symbolic-ref -q HEAD >/dev/null 2>&1 && echo "false" || echo "true")"
  echo "CURRENT_BRANCH: $(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
  echo "UNRESOLVED_CONFLICTS: $(git diff --name-only --diff-filter=U 2>/dev/null | wc -l | tr -d ' ')"

  # List files changed by sync
  echo ""
  echo "FILES_CHANGED_BY_SYNC:"
  git diff --name-only "$PRE_SYNC_HEAD..HEAD" 2>/dev/null | sed 's/^/  /' || echo "  None (or same commit)"
  echo ""
  echo "SYNC_DIFF_STAT:"
  git diff --stat "$PRE_SYNC_HEAD..HEAD" 2>/dev/null | tail -1 | sed 's/^/  /' || echo "  No changes"

  # Re-integrate fork customizations — prefer git cherry-pick, fall back to patches
  echo ""
  echo "=== RE-INTEGRATING FORK CUSTOMIZATIONS ==="
  REINTEGRATION_METHOD="none"
  REINTEGRATION_APPLIED=0
  REINTEGRATION_SKIPPED=0

  # ── Strategy 1: Cherry-pick from Git backup branch (preferred) ──────────
  GIT_BACKUP=$(resolve_git_backup "$CURRENT_BRANCH")

  if [ -n "$GIT_BACKUP" ]; then
    echo "BACKUP_SOURCE: git branch $GIT_BACKUP"
    echo "BACKUP_PRIORITY: 1 (Git backup — highest)"

    VALIDATION=$(validate_git_backup "$GIT_BACKUP")
    echo "BACKUP_VALIDATION: $VALIDATION"

    if echo "$VALIDATION" | grep -q "^VALID"; then
      BACKUP_MERGE_BASE=$(git merge-base "$GIT_BACKUP" "$UPSTREAM_REF" 2>/dev/null || echo "")

      if [ -n "$BACKUP_MERGE_BASE" ]; then
        FORK_COMMITS=$(git log --reverse --format="%H" "$BACKUP_MERGE_BASE..$GIT_BACKUP" 2>/dev/null || true)
        FORK_COUNT=$(echo "$FORK_COMMITS" | grep -c . 2>/dev/null || echo "0")

        if [ "$FORK_COUNT" -gt 0 ]; then
          echo "FORK_COMMITS_TO_REINTEGRATE: $FORK_COUNT"
          echo "MERGE_BASE: ${BACKUP_MERGE_BASE:0:9}"
          echo ""
          echo "Cherry-picking fork commits onto rebased HEAD..."

          CHERRY_PICK_FAILED_AT=""

          while IFS= read -r commit; do
            [ -z "$commit" ] && continue
            cmsg=$(git log -1 --format="%s" "$commit" 2>/dev/null | head -c 80)

            if git cherry-pick --no-edit "$commit" 2>/dev/null; then
              REINTEGRATION_APPLIED=$((REINTEGRATION_APPLIED + 1))
              echo "  APPLIED: ${commit:0:9} $cmsg"
            else
              # Check if the cherry-pick produced an empty diff (already in tree)
              unmerged=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l | tr -d ' ')
              if [ "$unmerged" -eq 0 ]; then
                git cherry-pick --skip 2>/dev/null || git reset --hard HEAD 2>/dev/null
                REINTEGRATION_SKIPPED=$((REINTEGRATION_SKIPPED + 1))
                echo "  SKIPPED (already applied): ${commit:0:9} $cmsg"
              else
                # Real conflict — abort and fall back to patches
                echo "  CONFLICT: ${commit:0:9} $cmsg"
                git diff --name-only --diff-filter=U 2>/dev/null | sed 's/^/    /'
                git cherry-pick --abort 2>/dev/null || true
                CHERRY_PICK_FAILED_AT="$commit"
                break
              fi
            fi
          done <<< "$FORK_COMMITS"

          echo ""
          echo "CHERRY_PICK_APPLIED: $REINTEGRATION_APPLIED"
          echo "CHERRY_PICK_SKIPPED: $REINTEGRATION_SKIPPED"

          if [ -z "$CHERRY_PICK_FAILED_AT" ]; then
            REINTEGRATION_METHOD="git-cherry-pick"
            echo "REINTEGRATION_RESULT: SUCCESS"
          else
            echo "CHERRY_PICK_FAILED_AT: ${CHERRY_PICK_FAILED_AT:0:9}"
            echo "Falling back to filesystem patch application..."
          fi
        else
          echo "No fork-specific commits found (fork is at merge base)"
          REINTEGRATION_METHOD="none-needed"
        fi
      else
        echo "WARNING: Could not compute merge base between $GIT_BACKUP and $UPSTREAM_REF"
      fi
    else
      echo "WARNING: Git backup branch $GIT_BACKUP failed validation — skipping"
    fi
  else
    echo "No Git backup branch found for branch $CURRENT_BRANCH"
  fi

  # ── Strategy 2: Filesystem patch application (fallback) ─────────────────
  if [ "$REINTEGRATION_METHOD" = "none" ] && [ -n "$BACKUP_DIR" ]; then
    echo ""
    echo "BACKUP_SOURCE: filesystem $BACKUP_DIR"
    echo "BACKUP_PRIORITY: 2 (Local backup — fallback)"
    if [ -z "$GIT_BACKUP" ]; then
      echo "FALLBACK_REASON: No git backup branch found"
    else
      echo "FALLBACK_REASON: Git cherry-pick encountered conflicts"
    fi
    echo ""
    bash "$SCRIPT_DIR/apply-patches.sh" "$PROJECT_DIR" "$BACKUP_DIR" || echo "WARNING: Patch re-application had issues"
    REINTEGRATION_METHOD="fs-patches"
  fi

  # ── No backup available ─────────────────────────────────────────────────
  if [ "$REINTEGRATION_METHOD" = "none" ]; then
    echo ""
    echo "ERROR: No backup source available for re-integration"
    echo "  Priority 1 — Git backup branch: $([ -z "$GIT_BACKUP" ] && echo "not found" || echo "failed validation/cherry-pick")"
    echo "  Priority 2 — Filesystem backup: $([ -z "$BACKUP_DIR" ] && echo "not found" || echo "no patches")"
  fi

  echo ""
  echo "REINTEGRATION_METHOD: $REINTEGRATION_METHOD"

  # Final verification
  echo ""
  echo "=== FINAL VERIFICATION ==="
  UNRESOLVED=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l | tr -d ' ')
  echo "UNRESOLVED_CONFLICTS: $UNRESOLVED"
  REJECT_COUNT=$(find "$PROJECT_DIR" -name '*.rej' -type f 2>/dev/null | wc -l | tr -d ' ')
  echo "REJECT_FILES: $REJECT_COUNT"
  if [ "$UNRESOLVED" -gt 0 ] || [ "$REJECT_COUNT" -gt 0 ]; then
    echo "STATUS: MANUAL_FIXUP_NEEDED"
  else
    echo "STATUS: FULLY_SYNCED"
  fi
fi

# Restore stashed changes
if [ -n "$STASH_REF" ]; then
  echo ""
  echo "=== RESTORING STASHED CHANGES ==="
  if git stash pop 2>/dev/null; then
    echo "STASH_RESTORED: true"
  else
    echo "WARNING: Could not auto-restore stash. Manual restore needed: git stash pop"
    echo "STASH_RESTORE_FAILED: true"
  fi
fi

echo ""
echo "PRE_SYNC_TAG: $PRE_SYNC_TAG (use for rollback: git reset --hard $PRE_SYNC_TAG)"
echo ""

# Persist audit log entry
_rp_log "sync_$(basename "$PROJECT_DIR")" "SYNC_METHOD: $SYNC_METHOD
UPSTREAM_REF: $UPSTREAM_REF
PRE_SYNC_HEAD: $PRE_SYNC_HEAD
POST_SYNC_HEAD: $(git rev-parse HEAD 2>/dev/null || echo UNKNOWN)
REINTEGRATION_METHOD: ${REINTEGRATION_METHOD:-N/A}
REINTEGRATION_APPLIED: ${REINTEGRATION_APPLIED:-0}
REINTEGRATION_SKIPPED: ${REINTEGRATION_SKIPPED:-0}
PRE_SYNC_TAG: $PRE_SYNC_TAG"

echo "=== SYNCHRONIZATION COMPLETE ==="
