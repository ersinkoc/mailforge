# MailForge Run Script (PowerShell)
# Usage: .\scripts\run.ps1 [-port <port>]

param(
    [string]$Port = "8181"
)

$ErrorActionPreference = "Stop"

# Build first if needed
if (-not (Test-Path "mailforge.exe")) {
    Write-Host "Binary not found, building..." -ForegroundColor Yellow
    & "$PSScriptRoot\build.ps1"
}

$env:PORT = $Port
$env:GIN_MODE = "release"

Write-Host "Starting MailForge on port $Port..." -ForegroundColor Cyan
.\mailforge.exe
