# MailForge Clean Script (PowerShell)
# Usage: .\scripts\clean.ps1

$ErrorActionPreference = "Stop"

Write-Host "Cleaning MailForge build artifacts..." -ForegroundColor Cyan

# Remove Go build artifacts
Write-Host "Removing Go build artifacts..." -ForegroundColor Yellow
Remove-Item -Force -ErrorAction SilentlyContinue "mailforge.exe"
Remove-Item -Force -ErrorAction SilentlyContinue "mailforge"

# Remove web build artifacts
Write-Host "Removing web build artifacts..." -ForegroundColor Yellow
Push-Location web
Remove-Item -Force -Recurse -ErrorAction SilentlyContinue "dist"
Remove-Item -Force -Recurse -ErrorAction SilentlyContinue "node_modules\.vite"
Pop-Location

Write-Host "`nClean complete!" -ForegroundColor Green
