# MailForge Lint Script (PowerShell)
# Usage: .\scripts\lint.ps1 [-fix]

param(
    [switch]$Fix
)

$ErrorActionPreference = "Stop"

Write-Host "Running MailForge Lint..." -ForegroundColor Cyan

$hasErrors = $false

# Run Go vet
Write-Host "`n[Go Vet]" -ForegroundColor Yellow
go vet ./...
if ($LASTEXITCODE -ne 0) { 
    Write-Host "Go vet found issues!" -ForegroundColor Red
    $hasErrors = $true 
}

# Run Go fmt check
Write-Host "`n[Go Fmt Check]" -ForegroundColor Yellow
$fmtOutput = go fmt ./...
if ($fmtOutput) {
    Write-Host "Unformatted files:" -ForegroundColor Red
    Write-Host $fmtOutput
    $hasErrors = $true
}

# Run web frontend lint
Write-Host "`n[Web Frontend Lint]" -ForegroundColor Yellow
Push-Location web
try {
    if ($Fix) {
        npm run lint:fix
    } else {
        npm run lint
    }
    if ($LASTEXITCODE -ne 0) { 
        Write-Host "Web lint found issues!" -ForegroundColor Red
        $hasErrors = $true 
    }
}
finally {
    Pop-Location
}

if ($hasErrors) {
    Write-Host "`nLint found issues!" -ForegroundColor Red
    exit 1
}

Write-Host "`nAll lint checks passed!" -ForegroundColor Green
