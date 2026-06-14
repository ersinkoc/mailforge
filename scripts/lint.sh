#!/bin/bash
# MailForge Lint Script (Shell)
# Usage: ./scripts/lint.sh [--fix]

set -e

FIX_FLAG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --fix) FIX_FLAG="true"; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

echo "Running MailForge Lint..."

# Run Go vet
echo "[Go Vet]"
go vet ./...

# Run Go fmt check
echo "[Go Fmt Check]"
UNFORMATTED=$(go fmt ./...)
if [ -n "$UNFORMATTED" ]; then
    echo "Unformatted files:"
    echo "$UNFORMATTED"
    exit 1
fi

# Run web frontend lint
echo "[Web Frontend Lint]"
cd web
if [ -n "$FIX_FLAG" ]; then
    npm run lint:fix
else
    npm run lint
fi
cd ..

echo ""
echo "All lint checks passed!"
