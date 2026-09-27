# ---------------------------------------------------------------------------
# AquaTrust AI — Hyperledger Fabric Chaincode Package & Lifecycle (PowerShell)
# ---------------------------------------------------------------------------
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CcSrcPath = Join-Path $ScriptDir "..\chaincode\aquatrust-records"
$CcName = "aquatrust-records"
$CcVersion = "1.0.0"

Write-Host "=== 1. Building Chaincode TypeScript ===" -ForegroundColor Cyan
Set-Location $CcSrcPath
npm install --silent
npm run build
Set-Location $ScriptDir

Write-Host "=== 2. Packaging Chaincode ===" -ForegroundColor Cyan
peer lifecycle chaincode package "$CcName.tar.gz" `
  --path "$CcSrcPath" `
  --lang node `
  --label "${CcName}_${CcVersion}"

Write-Host "=== 3. Chaincode Package Created: $CcName.tar.gz ===" -ForegroundColor Green
