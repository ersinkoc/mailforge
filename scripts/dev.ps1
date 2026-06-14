# MailForge Dev Script (PowerShell)
# Usage: .\scripts\dev.ps1 [-port <port>]

param(
    [string]$Port = "8181"
)

$ErrorActionPreference = "Stop"

Write-Host "Starting MailForge in development mode..." -ForegroundColor Cyan
Write-Host "Web UI: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Gray

$env:PORT = $Port
$env:GIN_MODE = "debug"

# Start web frontend dev server in background
Write-Host "[1/2] Starting web frontend (hot reload)..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "web" -NoNewWindow -RedirectStandardOutput "web-dev.log"

# Start Go backend
Write-Host "[2/2] Starting Go backend..." -ForegroundColor Yellow
go run . --port $Port

# Cleanup on exit
Stop-Process -Name "node" -ErrorAction SilentlyContinue
Remove-Item "web-dev.log" -ErrorAction SilentlyContinue
