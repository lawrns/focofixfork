#!/bin/bash
# Ralph wrapper - delegates to central installation
RALPH_DIR="$HOME/.ralph"
"$RALPH_DIR/ralph.sh" --tool claude "$@"
