#!/bin/sh
# ai-issue-loop statusline segment — shipped by @rtorcato/repo-ai.
# Installed to ~/.claude/ai-loop-statusline.sh by `repo-ai fix statusline`;
# edits there are overwritten on the next run of that fixer.
#
# Prints "🤖 <summary>" — line 1 of <repo>/.claude/ai-loop-status, written by
# the ai-issue-loop skill's Pass 5 at the end of every tick — or nothing when
# there is no status or it is stale.
#
#   ai-loop-statusline.sh [dir]
#
# With no argument it reads Claude Code's statusline JSON on stdin for the
# directory, falling back to $PWD. Call it from an existing statusline script
# with that script's cwd: "$HOME/.claude/ai-loop-statusline.sh" "$cwd"

# The self-paced loop ticks at most 30 minutes apart, so older than this means
# the loop has stopped — and a dead loop must not keep claiming work in flight.
STALE_AFTER=2100

dir=$1
if [ -z "$dir" ] && [ ! -t 0 ] && command -v jq >/dev/null 2>&1; then
	dir=$(jq -r '.workspace.current_dir // .cwd // empty' 2>/dev/null)
fi
dir=${dir:-$PWD}

# The loop writes to the main checkout; from inside an ai-* worktree, find it
# through the shared git dir.
common=$(git -C "$dir" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
[ -n "$common" ] && dir=$(dirname "$common")

file="$dir/.claude/ai-loop-status"
[ -s "$file" ] || exit 0

# GNU `stat -c` first: on Linux `stat -f` means filesystem status and "succeeds"
# with the wrong number, which once made every status look decades old.
mtime=$(stat -c %Y "$file" 2>/dev/null || stat -f %m "$file" 2>/dev/null) || exit 0
[ $(($(date +%s) - mtime)) -lt "$STALE_AFTER" ] || exit 0

printf '🤖 %s' "$(head -1 "$file")"
