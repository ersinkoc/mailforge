#!/bin/bash
# MailForge Build Script (Shell)
# Usage: ./scripts/build.sh

set -e

echo "Building MailForge..."

# Build web frontend
echo "[1/2] Building web frontend..."
cd web
npm install
npm run build
cd ..

# Build Go backend
echo "[2/2] Building Go backend..."
go build -o mailforge .

echo ""
echo "Build successful!"
echo "Binary: ./mailforge"
