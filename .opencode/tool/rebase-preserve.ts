/// <reference path="../env.d.ts" />
import { tool } from "@opencode-ai/plugin"

// Helper: run a script and capture both stdout and stderr, returning a
// useful error message instead of silently failing with exit code 1.
async function runScript(
  script: string,
  args: string[],
): Promise<string> {
  const proc = Bun.spawn(["bash", script, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    const output = stdout.trim()
    const errors = stderr.trim()
    // Return whatever output we got (error messages are in stdout for these scripts)
    // plus stderr if the script printed nothing useful to stdout
    if (output) return output + (errors ? `\n\nSTDERR:\n${errors}` : "")
    if (errors) return `ERROR (exit ${exitCode}):\n${errors}`
    return `ERROR: Script exited with code ${exitCode} (no output)`
  }
  return stdout.trim()
}

function scriptPath(context: { worktree?: string; directory: string }, name: string) {
  const base = (context.worktree || context.directory).replace(/\/+$/, "")
  return `${base}/.opencode/tools/rebase-preserve-scripts/${name}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — Repository Analysis
// ─────────────────────────────────────────────────────────────────────────────
export const analyze = tool({
  description: `Analyze the current Git repository for rebase preservation. Inspects branch state, upstream remotes, divergence, modified/untracked/staged files, file type classification, submodules, and repository health. Run this FIRST before any sync or rebase operation to understand the current state. Returns structured output covering: current branch, remotes, tracking info, working tree status, file classification counts, submodule status, and git state (clean, rebase-in-progress, merge-in-progress, etc).`,
  args: {
    project_dir: tool.schema
      .string()
      .describe(
        "Absolute path to the project directory. Defaults to current working directory if omitted.",
      )
      .optional(),
  },
  async execute(args, context) {
    const projectDir = args.project_dir || context.worktree || context.directory
    return runScript(scriptPath(context, "analyze.sh"), [projectDir])
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — Upstream Change Inspection
// ─────────────────────────────────────────────────────────────────────────────
export const inspect_upstream = tool({
  description: `Inspect upstream changes before rebasing or syncing. Fetches and compares the current branch against the upstream remote to identify: new upstream commits, changed/added/deleted/renamed files, dependency changes, and files likely to conflict with local modifications. Use after 'analyze' and before 'backup' to understand what upstream changes will be integrated. Supports auto-detection of upstream remote and branch.`,
  args: {
    project_dir: tool.schema
      .string()
      .describe("Absolute path to the project directory.")
      .optional(),
    upstream_remote: tool.schema
      .string()
      .describe(
        "Name of the upstream remote (e.g., 'upstream' or 'origin'). Auto-detected if omitted.",
      )
      .optional(),
    upstream_branch: tool.schema
      .string()
      .describe(
        "Name of the upstream branch (e.g., 'main' or 'master'). Auto-detected if omitted.",
      )
      .optional(),
    fetch: tool.schema
      .boolean()
      .describe("Whether to fetch upstream before inspecting. Defaults to true.")
      .optional(),
  },
  async execute(args, context) {
    const projectDir = args.project_dir || context.worktree || context.directory
    return runScript(scriptPath(context, "inspect-upstream.sh"), [
      projectDir,
      args.upstream_remote || "",
      args.upstream_branch || "",
      args.fetch !== false ? "true" : "false",
    ])
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — Immutable Backup Creation
// ─────────────────────────────────────────────────────────────────────────────
export const backup = tool({
  description: `Create an immutable backup of the entire repository before any destructive Git operation (rebase, merge, reset, sync). The backup is stored OUTSIDE the project directory to ensure it survives any repository corruption. Preserves: all files, permissions, symlinks, timestamps, hidden files, git metadata, staged/unstaged diffs. Validates backup integrity after creation. Returns a BACKUP_ID needed for rollback. ALWAYS run this before 'sync'. Supports dry-run mode. Node_modules and other regenerable dirs are excluded by default to save space.`,
  args: {
    project_dir: tool.schema
      .string()
      .describe("Absolute path to the project directory.")
      .optional(),
    backup_dir: tool.schema
      .string()
      .describe(
        "Custom backup destination directory. Defaults to /tmp/rebase-preserve-backups/<project>.",
      )
      .optional(),
    include_git: tool.schema
      .boolean()
      .describe("Whether to include the .git directory in the backup. Defaults to true.")
      .optional(),
    dry_run: tool.schema
      .boolean()
      .describe(
        "If true, only reports what would happen without creating a backup.",
      )
      .optional(),
  },
  async execute(args, context) {
    const projectDir = args.project_dir || context.worktree || context.directory
    return runScript(scriptPath(context, "backup.sh"), [
      projectDir,
      args.backup_dir || "",
      args.include_git !== false ? "true" : "false",
      args.dry_run === true ? "true" : "false",
    ])
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 — Controlled Git Synchronization
// ─────────────────────────────────────────────────────────────────────────────
export const sync = tool({
  description: `Perform controlled Git synchronization with upstream. Supports rebase, merge, or hard reset strategies. Creates a pre-sync tag for safety, auto-stashes uncommitted changes (including staged files), fetches upstream, performs the sync operation, and verifies repository integrity afterward. If rebase fails due to conflicts, automatically falls back to merge. If both fail, restores to pre-sync state. Accepts backup_id (just the ID or full path) — auto-detects from breadcrumb file if omitted. Returns: sync result (SUCCESS/FAILED_CONFLICTS), files changed, pre-sync tag for manual rollback.`,
  args: {
    project_dir: tool.schema
      .string()
      .describe("Absolute path to the project directory.")
      .optional(),
    upstream_remote: tool.schema
      .string()
      .describe("Name of the upstream remote. Auto-detected if omitted.")
      .optional(),
    upstream_branch: tool.schema
      .string()
      .describe("Name of the upstream branch. Auto-detected if omitted.")
      .optional(),
    method: tool.schema
      .enum(["rebase", "merge", "reset"])
      .describe(
        "Sync strategy: 'rebase' (default, falls back to merge on conflict), 'merge', or 'reset' (hard reset to upstream, destroys local commits).",
      )
      .optional(),
    backup_id: tool.schema
      .string()
      .describe(
        "BACKUP_ID or full path to backup directory. Auto-detected from breadcrumb file if omitted.",
      )
      .optional(),
    dry_run: tool.schema
      .boolean()
      .describe("If true, only fetches and reports what would happen.")
      .optional(),
  },
  async execute(args, context) {
    const projectDir = args.project_dir || context.worktree || context.directory
    return runScript(scriptPath(context, "sync.sh"), [
      projectDir,
      args.upstream_remote || "",
      args.upstream_branch || "",
      args.method || "rebase",
      args.backup_id || "",
      args.dry_run === true ? "true" : "false",
    ])
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 — Post-Rebase Change Mapping
// ─────────────────────────────────────────────────────────────────────────────
export const diff_map = tool({
  description: `Map changes between the backed-up repository state and the current post-rebase state. Identifies: files lost from backup (user files deleted by upstream), files new from upstream, files whose content differs between backup and current, and categorizes affected files by type (source, config, build, docs, lock). This is the critical analysis step before reintegration — it tells you exactly which files need user customizations restored. Run after 'sync' completes successfully. Excludes node_modules and other regenerable dirs from comparison.`,
  args: {
    project_dir: tool.schema
      .string()
      .describe("Absolute path to the project directory.")
      .optional(),
    backup_dir: tool.schema
      .string()
      .describe(
        "Absolute path to the specific backup directory (the full path including backup ID). Auto-detects from breadcrumb file or most recent backup if omitted.",
      )
      .optional(),
  },
  async execute(args, context) {
    const projectDir = args.project_dir || context.worktree || context.directory
    return runScript(scriptPath(context, "diff-map.sh"), [
      projectDir,
      args.backup_dir || "",
    ])
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5b — File Diff Extractor (Reintegration Helper)
// ─────────────────────────────────────────────────────────────────────────────
export const file_diff = tool({
  description: `Retrieve the backup and/or current version of a specific file for reintegration review. Use this during Phase 6 (reintegration) to examine a file's backup content (with user customizations) alongside the current post-rebase content (with upstream changes). The LLM should use the output to determine how to intelligently merge user modifications back into the updated file. Supports three output modes: 'both' (shows both versions), 'diff' (shows unified diff), 'content' (shows only backup version).`,
  args: {
    project_dir: tool.schema
      .string()
      .describe("Absolute path to the project directory.")
      .optional(),
    backup_dir: tool.schema
      .string()
      .describe(
        "Absolute path to the backup directory. Auto-detects from breadcrumb file or most recent backup if omitted.",
      )
      .optional(),
    file_path: tool.schema
      .string()
      .describe(
        "Relative path to the file within the project (e.g., 'src/config.ts' or 'package.json').",
      ),
    mode: tool.schema
      .enum(["both", "diff", "content"])
      .describe(
        "Output mode: 'both' shows backup and current versions, 'diff' shows unified diff, 'content' shows only the backup version. Defaults to 'both'.",
      )
      .optional(),
  },
  async execute(args, context) {
    const projectDir = args.project_dir || context.worktree || context.directory
    return runScript(scriptPath(context, "file-diff.sh"), [
      projectDir,
      args.backup_dir || "",
      args.file_path,
      args.mode || "both",
    ])
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Phase 7 — Validation and Verification
// ─────────────────────────────────────────────────────────────────────────────
export const validate = tool({
  description: `Validate repository integrity after reintegration. Checks: git state (no in-progress rebase/merge), unresolved conflicts, worktree validity, syntax errors (JS/TS/Python/Go/Rust), dependency manifests and lockfiles, conflict markers left in source files, .rej files from patch application, and critical file existence. Optionally runs build, tests, and linting using the detected package manager (bun/pnpm/yarn/npm). Run this after reintegration is complete to verify everything is working.`,
  args: {
    project_dir: tool.schema
      .string()
      .describe("Absolute path to the project directory.")
      .optional(),
    run_tests: tool.schema
      .boolean()
      .describe("Whether to run the project's test suite. Defaults to false.")
      .optional(),
    run_build: tool.schema
      .boolean()
      .describe("Whether to run the project's build command. Defaults to false.")
      .optional(),
    run_lint: tool.schema
      .boolean()
      .describe("Whether to run the project's linter. Defaults to false.")
      .optional(),
  },
  async execute(args, context) {
    const projectDir = args.project_dir || context.worktree || context.directory
    return runScript(scriptPath(context, "validate.sh"), [
      projectDir,
      args.run_tests === true ? "true" : "false",
      args.run_build === true ? "true" : "false",
      args.run_lint === true ? "true" : "false",
    ])
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Phase 8 — Recovery and Rollback
// ─────────────────────────────────────────────────────────────────────────────
export const rollback = tool({
  description: `Restore the repository from a backup to its pre-operation state. Three modes: 'full' (restore everything including .git), 'files-only' (restore all files but keep current git state), 'git-only' (reset git to backup commit and restore staged/unstaged diffs). If no backup_id is provided, lists all available backups with metadata. Accepts backup_id as just the ID or full path. Supports dry-run mode. Use this if sync or reintegration fails and you need to start over.`,
  args: {
    project_dir: tool.schema
      .string()
      .describe("Absolute path to the project directory.")
      .optional(),
    backup_id: tool.schema
      .string()
      .describe(
        "The BACKUP_ID or full path to restore from. If omitted, lists available backups.",
      )
      .optional(),
    mode: tool.schema
      .enum(["full", "files-only", "git-only"])
      .describe(
        "Restore mode: 'full' (everything), 'files-only' (non-git files), 'git-only' (git state reset). Defaults to 'full'.",
      )
      .optional(),
    dry_run: tool.schema
      .boolean()
      .describe("If true, only reports what would happen without restoring.")
      .optional(),
  },
  async execute(args, context) {
    const projectDir = args.project_dir || context.worktree || context.directory
    return runScript(scriptPath(context, "rollback.sh"), [
      projectDir,
      args.backup_id || "",
      args.mode || "full",
      args.dry_run === true ? "true" : "false",
    ])
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Utility — List Backups
// ─────────────────────────────────────────────────────────────────────────────
export const list_backups = tool({
  description: `List all available rebase-preserve backups for the project. Searches all known backup locations (sibling dir, /tmp, breadcrumb file). Shows backup IDs, timestamps, branches, commits, file counts, and sizes. Use this to find a specific backup_id for rollback or to review backup history.`,
  args: {
    project_dir: tool.schema
      .string()
      .describe("Absolute path to the project directory.")
      .optional(),
  },
  async execute(args, context) {
    const projectDir = args.project_dir || context.worktree || context.directory
    return runScript(scriptPath(context, "list-backups.sh"), [projectDir])
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Patch Extraction — Phase 3b
// ─────────────────────────────────────────────────────────────────────────────
export const extract_patches = tool({
  description: `Extract fork-specific changes as re-appliable patches. Finds the merge base with upstream, creates per-file patches and a combined patch, and stores them in the backup directory's patches/fork/ folder. Each patch can be independently re-applied after sync, so one file failing doesn't block others. Also creates commit-history patches via format-patch for full provenance. Run this before any sync to ensure user customizations can be restored.`,
  args: {
    project_dir: tool.schema
      .string()
      .describe("Absolute path to the project directory.")
      .optional(),
    backup_dir: tool.schema
      .string()
      .describe(
        "Absolute path to the backup directory (the full path including backup ID). Auto-detects from breadcrumb if omitted.",
      )
      .optional(),
    upstream_remote: tool.schema
      .string()
      .describe("Upstream remote name. Auto-detected if omitted.")
      .optional(),
    upstream_branch: tool.schema
      .string()
      .describe("Upstream branch name. Auto-detected if omitted.")
      .optional(),
  },
  async execute(args, context) {
    const projectDir = args.project_dir || context.worktree || context.directory
    return runScript(scriptPath(context, "extract-patches.sh"), [
      projectDir,
      args.backup_dir || "",
      args.upstream_remote || "",
      args.upstream_branch || "",
    ])
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Patch Re-application — Phase 6
// ─────────────────────────────────────────────────────────────────────────────
export const apply_patches = tool({
  description: `Re-apply stored fork patches after a sync operation. Loads patches from the backup's patches/fork/ directory, applies each per-file patch independently, and falls back to the combined patch for any failures. Uses git apply --reject so partial matches leave .rej files for manual resolution. Reports the exact count of applied vs failed patches. Run this after a successful sync to restore user customizations on top of the updated upstream codebase.`,
  args: {
    project_dir: tool.schema
      .string()
      .describe("Absolute path to the project directory.")
      .optional(),
    backup_dir: tool.schema
      .string()
      .describe(
        "Absolute path to the backup directory containing the patches/fork/ folder. Auto-detects from breadcrumb if omitted.",
      )
      .optional(),
  },
  async execute(args, context) {
    const projectDir = args.project_dir || context.worktree || context.directory
    return runScript(scriptPath(context, "apply-patches.sh"), [
      projectDir,
      args.backup_dir || "",
    ])
  },
})
