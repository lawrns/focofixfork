#!/bin/bash

echo "🔍 Finding and fixing .map() calls without Array.isArray() checks..."

# Find all TypeScript/JavaScript files with .map() calls
echo "Finding all .map() usage..."
files_with_map=$(grep -r "\.map(" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ 2>/dev/null | cut -d: -f1 | sort -u)

echo "Found $(echo "$files_with_map" | wc -l) files with .map() calls"

# Check each file for unsafe .map() usage
for file in $files_with_map; do
  echo "Checking: $file"

  # Look for patterns where .map is called without Array.isArray check
  # Common patterns to fix:
  # 1. data.map( without checking if data is array
  # 2. response.data.map( without checking
  # 3. items?.map( that should be (Array.isArray(items) ? items : []).map

  grep -n "\.map(" "$file" | while IFS=: read -r line_num line_content; do
    # Check if the line has Array.isArray nearby (within 3 lines before)
    context=$(sed -n "$((line_num-3)),$((line_num))p" "$file" 2>/dev/null)

    if ! echo "$context" | grep -q "Array\.isArray"; then
      # Check if it's already using optional chaining with fallback
      if ! echo "$line_content" | grep -q "\[\]\.map\||| \[\])\.map"; then
        echo "  ⚠️  Line $line_num: Potentially unsafe .map() call"
        echo "    $line_content" | sed 's/^[[:space:]]*/    /'
      fi
    fi
  done
done

echo ""
echo "📝 Summary of files that need Array.isArray() checks:"
echo "These files have .map() calls that might fail if the data is not an array:"

# List files with the most unsafe .map() calls
for file in $files_with_map; do
  unsafe_count=$(grep -n "\.map(" "$file" | while IFS=: read -r line_num line_content; do
    context=$(sed -n "$((line_num-3)),$((line_num))p" "$file" 2>/dev/null)
    if ! echo "$context" | grep -q "Array\.isArray" && ! echo "$line_content" | grep -q "\[\]\.map\||| \[\])\.map"; then
      echo "1"
    fi
  done | wc -l)

  if [ "$unsafe_count" -gt 0 ]; then
    echo "  $file: $unsafe_count potentially unsafe .map() calls"
  fi
done

echo ""
echo "✅ Next steps:"
echo "1. Review each file listed above"
echo "2. Add Array.isArray() checks or use default empty arrays"
echo "3. Pattern to use: (Array.isArray(data) ? data : []).map(...)"
echo "4. Or use: (data || []).map(...) if data is guaranteed to be array or undefined"