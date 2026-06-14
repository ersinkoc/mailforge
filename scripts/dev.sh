#!/bin/bash
# MailForge Dev Script (Shell)
# Usage: ./scripts/dev.sh [port]

PORT=${1:-8181}

echo "Starting MailForge in development mode..."
echo "Web UI: http://localhost:$PORT"
echo "Press Ctrl+C to stop"
echo ""

export PORT=$PORT
export GIN_MODE=debug

# Start web frontend dev server in background
echo "[1/2] Starting web frontend (hot reload)..."
cd web
npm run dev &
WEB_PID=$!
cd ..

# Start Go backend
echo "[2/2] Starting Go backend..."
go run . --port $PORT

# Cleanup on exit
kill $WEB_PID 2>/dev/null || true
