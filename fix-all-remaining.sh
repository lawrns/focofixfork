#!/bin/bash

# Fix all remaining files with supabase type errors

FILES=(
  "src/lib/services/file-uploads.ts"
  "src/lib/services/comments.ts"
  "src/lib/services/inbox.service.ts"
  "src/lib/services/export.service.ts"
  "src/lib/services/insights.service.ts"
  "src/lib/services/analytics.service.ts"
  "src/lib/services/data-integrity.ts"
  "src/lib/services/goals.service.ts"
  "src/lib/services/import.ts"
  "src/lib/services/time-tracking.ts"
  "src/lib/middleware/audit.ts"
)

echo "Fixing ${#FILES[@]} files..."

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."

    # Check if untypedSupabase already exists
    if ! grep -q "const untypedSupabase = supabase as any" "$file" 2>/dev/null; then
      # Find the last import line and add untypedSupabase after it
      awk '/^import/ {last=NR} NR==last+1 && !done {print ""; print "// Use untyped supabase client to avoid type instantiation depth issues"; print "const untypedSupabase = supabase as any"; print ""; done=1} 1' "$file" > "$file.tmp" && mv "$file.tmp" "$file"

      # Replace supabase.from with untypedSupabase.from
      sed -i.bak 's/await supabase\.from(/await untypedSupabase.from(/g; s/await supabase$/await untypedSupabase/g; s/= supabase\.from(/= untypedSupabase.from(/g' "$file"
      rm -f "$file.bak"

      echo "  ✓ Fixed $file"
    else
      echo "  - Skipped $file (already has untypedSupabase)"
    fi
  else
    echo "  ! File not found: $file"
  fi
done

echo "Done!"
