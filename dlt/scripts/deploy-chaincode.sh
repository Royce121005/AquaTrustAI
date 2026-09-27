#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# AquaTrust AI — Hyperledger Fabric Chaincode Package & Lifecycle Deployment
# ---------------------------------------------------------------------------
set -e

CC_NAME="aquatrust-records"
CC_VERSION="1.0.0"
CC_SEQUENCE=1
CHANNEL_NAME="aquatrust-channel"
CC_SRC_PATH="../chaincode/aquatrust-records"

echo "=== 1. Building Chaincode TypeScript ==="
cd "$CC_SRC_PATH"
npm install --silent
npm run build
cd -

echo "=== 2. Packaging Chaincode ==="
peer lifecycle chaincode package ${CC_NAME}.tar.gz \
  --path "$CC_SRC_PATH" \
  --lang node \
  --label ${CC_NAME}_${CC_VERSION}

echo "=== 3. Chaincode Package Created: ${CC_NAME}.tar.gz ==="
echo "Install and approve across FacilityOrg, AuditorOrg, and RegulatorOrg before committing."
