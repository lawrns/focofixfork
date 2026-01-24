#!/bin/bash

# Ralph Wiggins - Autonomous PRD Execution
# Usage: ./ralph.sh [status|continue|reset]

RALPH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_JSON="$RALPH_DIR/ralph.json"
PROJECT_ROOT="$(dirname "$RALPH_DIR")"

cd "$PROJECT_ROOT" || exit 1

case "${1:-continue}" in
  status)
    echo "📊 Ralph Wiggins Status"
    echo "======================="
    echo ""
    total=$(jq '.userStories | length' "$PRD_JSON")
    completed=$(jq '[.userStories[] | select(.passes == true)] | length' "$PRD_JSON")
    pending=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_JSON")

    echo "Total Stories: $total"
    echo "Completed: $completed"
    echo "Pending: $pending"
    echo ""
    echo "📋 Pending Stories:"
    jq -r '.userStories[] | select(.passes == false) | "\(.priority). [US-\(.id)] \(.title)"' "$PRD_JSON" | sort -n
    ;;

  reset)
    read -p "⚠️  Reset all progress? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      jq '.userStories[].passes = false | .userStories[].notes = ""' "$PRD_JSON" > "$PRD_JSON.tmp"
      mv "$PRD_JSON.tmp" "$PRD_JSON"
      echo "✅ Progress reset. Starting fresh."
    else
      echo "❌ Cancelled."
    fi
    ;;

  continue)
    echo "🤖 Ralph Wiggins - Autonomous PRD Execution"
    echo "============================================"
    echo ""
    echo "Reading current state..."
    echo ""
    echo "Next story to execute:"
    jq -r '.userStories[] | select(.passes == false) | sort_by(.priority) | .[0] | "US-\(.id): \(.title)\nPriority: \(.priority)\n\(.description)"' "$PRD_JSON"
    echo ""
    echo "📋 Open this project in Claude Code and continue execution."
    echo "The prompt.md contains your full instructions."
    ;;

  *)
    echo "Usage: $0 [status|continue|reset]"
    exit 1
    ;;
esac
