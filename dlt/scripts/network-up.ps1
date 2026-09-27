# ---------------------------------------------------------------------------
# AquaTrust AI — Hyperledger Fabric Network Up (PowerShell)
# ---------------------------------------------------------------------------
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$NetworkDir = Join-Path $ScriptDir "..\network"
Set-Location $NetworkDir

if (-not (Test-Path "crypto-config")) {
    Write-Host "crypto-config not found. Running generate-crypto.ps1 first..." -ForegroundColor Yellow
    & "$ScriptDir\generate-crypto.ps1"
}

Write-Host "=== Starting AquaTrust Fabric Network (Orderer + 3 Peer Orgs + CouchDB) ===" -ForegroundColor Cyan
docker compose -f docker-compose-fabric.yaml up -d

Write-Host "=== Fabric Containers Running ===" -ForegroundColor Green
docker compose -f docker-compose-fabric.yaml ps
