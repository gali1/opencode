#!/usr/bin/env bash
# Shared helper functions for the rebase-preserve toolset.
# Sourced by individual scripts — never executed directly.
# shellcheck disable=SC2034

# ─────────────────────────────────────────────────────────────────────────────
# Configuration via environment variables
# ─────────────────────────────────────────────────────────────────────────────
# REBASE_PRESERVE_BACKUP_DIR — override the default backup base directory
# REBASE_PRESERVE_TMPDIR     — override the temp directory (falls back to
#                               TMPDIR, then /tmp)

# Directories excluded from backup/diff operations (regenerable build artifacts).
REGEN_EXCLUDES=(
  node_modules
  .next
  dist
  build
  target
  .turbo
  __pycache__
  .venv
)

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

# Returns the temp directory to use for backups.
_rp_tmpdir() {
  if [ -n "${REBASE_PRESERVE_TMPDIR:-}" ]; then
    echo "${REBASE_PRESERVE_TMPDIR%/}"
  elif [ -n "${TMPDIR:-}" ]; then
    echo "${TMPDIR%/}"
  else
    echo "/tmp"
  fi
}

# Prints the list of directories where backups may be stored (one per line).
_rp_backup_search_dirs() {
  local project_dir="$1"
  local project_name
  project_name="$(basename "$project_dir")"
  local tmp
  tmp="$(_rp_tmpdir)"

  # Custom override first
  if [ -n "${REBASE_PRESERVE_BACKUP_DIR:-}" ]; then
    echo "${REBASE_PRESERVE_BACKUP_DIR%/}"
  fi

  echo "$(dirname "$project_dir")/.rebase-preserve-backups"
  echo "$tmp/rebase-preserve-backups/$project_name"
  echo "$tmp/opencode/backup"
}

# Resolve a backup reference to an absolute directory path.
#
# Accepts:
#   $1 — reference: absolute path, backup ID, or empty string
#   $2 — project directory (optional; defaults to $PROJECT_DIR)
#
# Prints the resolved path to stdout, or an empty string on failure.
resolve_backup() {
  local ref="${1:-}"
  local project_dir="${2:-$PROJECT_DIR}"

  # Case 1: Full absolute path
  if [[ "$ref" == /* ]] && [ -d "$ref" ]; then
    echo "$ref"
    return
  fi

  # Case 2: Backup ID — search known locations
  if [ -n "$ref" ]; then
    while IFS= read -r base; do
      [ -d "$base/$ref" ] && { echo "$base/$ref"; return; }
    done < <(_rp_backup_search_dirs "$project_dir")
  fi

  # Case 3: Breadcrumb file from last backup
  local breadcrumb_file="$project_dir/.opencode/.last-backup-location"
  if [ -f "$breadcrumb_file" ]; then
    local breadcrumb
    breadcrumb=$(tr -d '[:space:]' < "$breadcrumb_file" 2>/dev/null)
    if [ -n "$breadcrumb" ] && [ -d "$breadcrumb" ]; then
      echo "$breadcrumb"
      return
    fi
  fi

  # Case 4: Most recent backup in known locations
  while IFS= read -r base; do
    if [ -d "$base" ]; then
      local latest
      latest=$(ls -1d "$base"/*/ 2>/dev/null | sort | tail -1 || true)
      if [ -n "$latest" ]; then
        echo "${latest%/}"
        return
      fi
    fi
  done < <(_rp_backup_search_dirs "$project_dir")

  echo ""
}

# Auto-detect the upstream remote (prefers "upstream", then "origin").
detect_upstream_remote() {
  if git remote | grep -q "^upstream$"; then
    echo "upstream"
  elif git remote | grep -q "^origin$"; then
    echo "origin"
  else
    git remote 2>/dev/null | head -1 || echo ""
  fi
}

# Auto-detect the upstream default branch for a given remote.
# Tries the remote HEAD symref first, then probes common branch names.
detect_upstream_branch() {
  local remote="${1:-origin}"

  # Prefer the remote's HEAD symbolic ref (set by git clone / fetch)
  local head_ref
  head_ref=$(git symbolic-ref "refs/remotes/$remote/HEAD" 2>/dev/null || true)
  if [ -n "$head_ref" ]; then
    echo "${head_ref##*/}"
    return
  fi

  # Probe common default branch names
  for candidate in main master dev develop; do
    if git rev-parse --verify "$remote/$candidate" >/dev/null 2>&1; then
      echo "$candidate"
      return
    fi
  done

  echo ""
}

# Ensure we're inside a git repository; exit with an error if not.
# Handles both standard repos and git worktrees (where .git may be a file).
require_git_repo() {
  local dir="${1:-$PROJECT_DIR}"
  if [ ! -d "$dir/.git" ] && ! git -C "$dir" rev-parse --git-dir >/dev/null 2>&1; then
    echo "ERROR: Not a git repository: $dir"
    exit 1
  fi
}
