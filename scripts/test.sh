#!/bin/bash
# MailForge Test Script (Shell)
# Usage: ./scripts/test.sh [--race] [--short]

set -e

RACE_FLAG=""
SHORT_FLAG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --race) RACE_FLAG="-race"; shift ;;
        --short) SHORT_FLAG="-short"; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

echo "Running MailForge Tests..."

# Run Go tests
echo "[Go Tests]"
go test -v -timeout 180s $RACE_FLAG $SHORT_FLAG ./...

# Run web frontend tests if available
if [ -f "web/vitest.config.ts" ]; then
    echo "[Web Frontend Tests]"
    cd web
    npm run test -- --run
    cd ..
fi

echo ""
echo "All tests passed!"
