#!/usr/bin/env bash
# Copies env files from the OBRA_APP root to the current directory (typically a Claude worktree).

OBRA_ROOT="/Users/ellord/code/OBRA_APP"
TARGET="${1:-$PWD}"

files=(
  "obra/.env.local"
  "supabase/functions/.env"
)

echo "Syncing env files from $OBRA_ROOT → $TARGET"

for file in "${files[@]}"; do
  src="$OBRA_ROOT/$file"
  dest_dir="$TARGET/$(dirname "$file")"
  dest="$TARGET/$file"

  if [[ ! -f "$src" ]]; then
    echo "  SKIP  $file (not found in source)"
    continue
  fi

  mkdir -p "$dest_dir"
  cp "$src" "$dest"
  echo "  OK    $file"
done

echo "Done."
