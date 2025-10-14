#!/bin/bash

echo "🔧 Adding dynamic export to API routes to fix build warnings..."

# List of API routes that need dynamic export based on the build output
api_routes=(
  "src/app/api/analytics/team/route.ts"
  "src/app/api/analytics/trends/route.ts"
  "src/app/api/analytics/dashboard/route.ts"
  "src/app/api/analytics/projects/route.ts"
  "src/app/api/activities/route.ts"
  "src/app/api/auth/session/route.ts"
  "src/app/api/organization/members/route.ts"
  "src/app/api/settings/organization/route.ts"
  "src/app/api/settings/profile/route.ts"
  "src/app/api/settings/notifications/route.ts"
  "src/app/api/reports/export/route.ts"
  "src/app/api/user/audit-log/route.ts"
)

for route_file in "${api_routes[@]}"; do
  if [ -f "$route_file" ]; then
    # Check if the file already has the dynamic export
    if ! grep -q "export const dynamic" "$route_file"; then
      echo "✅ Adding dynamic export to $route_file"
      # Add the export at the beginning of the file after imports
      # Find the first line that doesn't start with 'import' and add after it
      awk '/^import/ {print; next} !done && !/^import/ {print "export const dynamic = '\''force-dynamic'\''"; print ""; done=1; print; next} {print}' "$route_file" > "$route_file.tmp" && mv "$route_file.tmp" "$route_file"
    else
      echo "⏭️  Skipping $route_file (already has dynamic export)"
    fi
  else
    echo "⚠️  File not found: $route_file"
  fi
done

echo "✨ Done! API routes have been updated."