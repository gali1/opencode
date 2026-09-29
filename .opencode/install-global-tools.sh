#!/usr/bin/env bash
#
# install-global-tools.sh — make this fork's custom plugin tools available to
# the LLM from ANY working directory, not only when opencode runs inside this
# repository.
#
# Why this is needed
# ------------------
# opencode discovers custom tools by globbing `{tool,tools}/*.{js,ts}` across
# its config directories (see ConfigPaths.directories): the GLOBAL config dir
# (~/.config/opencode), the project `.opencode` walking up from the cwd, and
# ~/.opencode. The `mempalace` and `anchored_edit` tools are compiled into the
# binary, so they are available everywhere. The `github-*` and `rebase-preserve`
# tools live only in THIS repo's `.opencode/tool/`, so they are discovered only
# when opencode runs with its cwd inside this repo. Running the binary from
# anywhere else silently omits them.
#
# This script symlinks the repo's plugin tools (and the rebase-preserve scripts)
# into the global config dir, which is always scanned, so the tools are known to
# the LLM regardless of cwd. Symlinks (not copies) keep the repo as the single
# source of truth — edits to the repo files take effect immediately with no
# drift. `bun`/`node` resolve the tools' `@opencode-ai/plugin` import via the
# global config's own node_modules, so the symlinked modules load cleanly.
#
# Idempotent: safe to re-run. Re-run after moving/renaming the repo.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_dir="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"

src_tool_dir="$repo_root/.opencode/tool"
src_scripts_dir="$repo_root/.opencode/tools/rebase-preserve-scripts"

mkdir -p "$config_dir/tool" "$config_dir/tools"

linked=0
for tool in "$src_tool_dir"/*.ts; do
  [ -e "$tool" ] || continue
  ln -sfn "$tool" "$config_dir/tool/$(basename "$tool")"
  linked=$((linked + 1))
done

# rebase-preserve resolves its shell scripts relative to the INVOKED project's
# worktree at execute time, so this link only provides a sensible default; the
# tool itself is discoverable regardless.
if [ -d "$src_scripts_dir" ]; then
  ln -sfn "$src_scripts_dir" "$config_dir/tools/rebase-preserve-scripts"
fi

echo "Linked $linked plugin tool file(s) into $config_dir/tool"
echo "Custom tools are now available to opencode from any working directory."
echo
echo "Restart opencode for the change to take effect (config is loaded at startup)."
