# MailForge Test Script (PowerShell)
# Usage: .\scripts\test.ps1 [-race] [-short]

param(
    [switch]$Race,
    [switch]$Short
)

$ErrorActionPreference = "Stop"

Write-Host "Running MailForge Tests..." -ForegroundColor Cyan

$goArgs = @("test", "-v")
if ($Short) { $goArgs += "-short" }
if ($Race) { $goArgs += "-race" }
$goArgs += "-timeout"
$goArgs += "180s"
$goArgs += "./..."

# Run Go tests
Write-Host "`n[Go Tests]" -ForegroundColor Yellow
& go @goArgs
if ($LASTEXITCODE -ne 0) { throw "Go tests failed" }

# Run web frontend tests if available
if (Test-Path "web\vitest.config.ts") {
    Write-Host "`n[Web Frontend Tests]" -ForegroundColor Yellow
    Push-Location web
    try {
        npm run test -- --run
        if ($LASTEXITCODE -ne 0) { throw "Web tests failed" }
    }
    finally {
        Pop-Location
    }
}

Write-Host "`nAll tests passed!" -ForegroundColor Green
