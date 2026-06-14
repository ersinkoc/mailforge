#!/bin/bash
# MailForge Run Script (Shell)
# Usage: ./scripts/run.sh [port]

PORT=${1:-8181}

# Build first if needed
if [ ! -f "./mailforge" ]; then
    echo "Binary not found, building..."
    ./scripts/build.sh
fi

PORT=$PORT GIN_MODE=release ./mailforge
