# ---------------------------------------------------------------------------
# AquaTrust AI — Hyperledger Fabric MSP & Artifacts Generator (PowerShell)
# ---------------------------------------------------------------------------
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$NetworkDir = Join-Path $ScriptDir "..\network"
Set-Location $NetworkDir

Write-Host "=== 1. Generating Crypto Material for 3 Orgs + Orderer ===" -ForegroundColor Cyan
if (Test-Path "crypto-config") {
    Remove-Item -Recurse -Force "crypto-config"
}
cryptogen generate --config=./crypto-config.yaml --output="crypto-config"

Write-Host "=== 2. Creating Channel Artifacts Directory ===" -ForegroundColor Cyan
if (-not (Test-Path "channel-artifacts")) {
    New-Item -ItemType Directory -Path "channel-artifacts" | Out-Null
}

Write-Host "=== 3. Generating Orderer Genesis Block ===" -ForegroundColor Cyan
configtxgen -profile AquaTrustGenesisProfile -channelID sys-channel -outputBlock ./channel-artifacts/genesis.block

Write-Host "=== 4. Generating Channel Creation Transaction ===" -ForegroundColor Cyan
configtxgen -profile AquaTrustChannelProfile -outputCreateChannelTx ./channel-artifacts/aquatrust-channel.tx -channelID aquatrust-channel

Write-Host "=== Fabric Cryptographic Setup Complete ===" -ForegroundColor Green
