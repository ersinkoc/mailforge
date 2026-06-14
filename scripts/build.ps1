# MailForge Build Script (PowerShell)
# Usage: .\scripts\build.ps1

$ErrorActionPreference = "Stop"

Write-Host "Building MailForge..." -ForegroundColor Cyan

# Build web frontend
Write-Host "`n[1/2] Building web frontend..." -ForegroundColor Yellow
Push-Location web
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm build failed" }
}
finally {
    Pop-Location
}

# Build Go backend
Write-Host "`n[2/2] Building Go backend..." -ForegroundColor Yellow
go build -o mailforge.exe .
if ($LASTEXITCODE -ne 0) { throw "go build failed" }

Write-Host "`nBuild successful!" -ForegroundColor Green
Write-Host "Binary: mailforge.exe"
