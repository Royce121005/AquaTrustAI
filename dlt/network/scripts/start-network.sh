#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
NETWORK="$ROOT/dlt/network"
if [ ! -f "$NETWORK/artifacts/genesis.block" ]; then
  "$NETWORK/scripts/generate-artifacts.sh"
fi
docker compose --env-file "$ROOT/environment/fabric-version.env" --env-file "$NETWORK/.env" -f "$NETWORK/docker-compose.yaml" up -d --build
