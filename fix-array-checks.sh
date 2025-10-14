#!/bin/bash

echo "🔧 Adding Array.isArray() checks to all .map() calls"
echo "===================================================="

# Files that need fixing
files=(
  "src/app/dashboard/analytics/page.tsx"
  "src/app/dashboard/goals/page.tsx"
  "src/app/dashboard/page.tsx"
  "src/app/dashboard/settings/page.tsx"
  "src/app/favorites/page.tsx"
  "src/app/inbox/page.tsx"
  "src/app/milestones/[id]/page.tsx"
  "src/app/milestones/page.tsx"
  "src/app/organizations/[id]/page.tsx"
  "src/app/organizations/page.tsx"
)

for file in "${files[@]}"; do
  echo "Processing: $file"

  # Find lines with .map( that don't have Array.isArray or ?
  grep -n "\.map(" "$file" | grep -v "Array.isArray" | grep -v "\?" | while IFS=: read -r line_num line_content; do
    echo "  Line $line_num needs array check"

    # Extract the variable being mapped
    var=$(echo "$line_content" | sed -E 's/.*\{([a-zA-Z]+)\.map\(.*/\1/')

    if [ ! -z "$var" ]; then
      echo "    Variable to check: $var"
      echo "    Add: {Array.isArray($var) && $var.map(...)"
    fi
  done
  echo ""
done

echo "===================================================="
echo "Manual fixes needed for the files above"
echo "Replace patterns like:"
echo "  {data.map(...)}  ->  {Array.isArray(data) && data.map(...)}"
echo "  {items.map(...)} ->  {Array.isArray(items) && items.map(...)}"