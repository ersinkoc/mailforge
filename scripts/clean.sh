#!/bin/bash
# MailForge Clean Script (Shell)
# Usage: ./scripts/clean.sh

echo "Cleaning MailForge build artifacts..."

# Remove Go build artifacts
echo "Removing Go build artifacts..."
rm -f mailforge.exe mailforge

# Remove web build artifacts
echo "Removing web build artifacts..."
rm -rf web/dist
rm -rf web/node_modules/.vite

echo ""
echo "Clean complete!"
