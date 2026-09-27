#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# AquaTrust AI — Hyperledger Fabric MSP & Artifacts Generator
# ---------------------------------------------------------------------------
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR/network"

echo "=== 1. Generating Crypto Material for 3 Orgs + Orderer ==="
rm -rf crypto-config
cryptogen generate --config=./crypto-config.yaml --output="crypto-config"

echo "=== 2. Creating Channel Artifacts Directory ==="
mkdir -p channel-artifacts

echo "=== 3. Generating Orderer Genesis Block ==="
configtxgen -profile AquaTrustGenesisProfile -channelID sys-channel -outputBlock ./channel-artifacts/genesis.block

echo "=== 4. Generating Channel Creation Transaction ==="
configtxgen -profile AquaTrustChannelProfile -outputCreateChannelTx ./channel-artifacts/aquatrust-channel.tx -channelID aquatrust-channel

echo "=== Fabric Cryptographic Setup Complete ==="
