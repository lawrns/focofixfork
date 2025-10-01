#!/bin/bash
# Script to remove demo user fallbacks from API routes

files=(
  "src/app/api/goals/[id]/milestones/route.ts"
  "src/app/api/projects/bulk/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    # Use perl for more reliable multi-line replacement
    perl -i -pe '
      s/let (userId|currentUserId) = /const $1 = /g;
      if (/\/\/ For demo purposes/) {
        $_ = "";
        for (1..3) { <> }
      }
    ' "$file"
    echo "✓ Completed: $file"
  else
    echo "✗ Not found: $file"
  fi
done

echo "Demo user fallback removal complete!"
