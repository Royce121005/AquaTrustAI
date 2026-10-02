#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
NETWORK="$ROOT/dlt/network"
mkdir -p "$NETWORK/artifacts"

for binary in cryptogen configtxgen; do
  if ! command -v "$binary" >/dev/null; then
    echo "Install the pinned Hyperledger Fabric 2.5.15 binaries; missing $binary." >&2
    exit 1
  fi
done
if [ -d "$NETWORK/organizations" ]; then
  echo "Refusing to overwrite existing MSP credentials in $NETWORK/organizations" >&2
  exit 1
fi

cryptogen generate --config="$NETWORK/crypto-config.yaml" --output="$NETWORK/organizations"
(
  cd "$NETWORK"
  FABRIC_CFG_PATH="$NETWORK" configtxgen -profile AquaTrustOrdererGenesis -channelID system-channel -outputBlock artifacts/genesis.block
  FABRIC_CFG_PATH="$NETWORK" configtxgen -profile AquaTrustChannel -channelID aquatrust-channel -outputCreateChannelTx artifacts/aquatrust-channel.tx
)
echo "Generated development MSP identities and Fabric channel artifacts. Keep organizations/ private."
