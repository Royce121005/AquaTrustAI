#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# AquaTrust AI — Hyperledger Fabric Network Up
# ---------------------------------------------------------------------------
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR/network"

if [ ! -d "crypto-config" ]; then
  echo "crypto-config not found. Running generate-crypto.sh first..."
  ../scripts/generate-crypto.sh
fi

echo "=== Starting AquaTrust Fabric Network (Orderer + 3 Peer Orgs + CouchDB) ==="
docker compose -f docker-compose-fabric.yaml up -d

echo "=== Fabric Containers Running ==="
docker compose -f docker-compose-fabric.yaml ps
