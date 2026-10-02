#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
NETWORK="$ROOT/dlt/network"

export FABRIC_CFG_PATH="$NETWORK"
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_ADDRESS=peer0.facility.aquatrust.internal:7051
export CORE_PEER_LOCALMSPID=FacilityMSP
export CORE_PEER_MSPCONFIGPATH="$NETWORK/organizations/peerOrganizations/facility.aquatrust.internal/users/Admin@facility.aquatrust.internal/msp"
export CORE_PEER_TLS_ROOTCERT_FILE="$NETWORK/organizations/peerOrganizations/facility.aquatrust.internal/peers/peer0.facility.aquatrust.internal/tls/ca.crt"

ORDERER_CA="$NETWORK/organizations/ordererOrganizations/aquatrust.internal/orderers/orderer0.aquatrust.internal/tls/ca.crt"

if [ ! -f "$NETWORK/artifacts/aquatrust-channel.block" ]; then
  peer channel create \
    -o orderer0.aquatrust.internal:7050 \
    --ordererTLSHostnameOverride orderer0.aquatrust.internal \
    -c aquatrust-channel \
    -f "$NETWORK/artifacts/aquatrust-channel.tx" \
    --outputBlock "$NETWORK/artifacts/aquatrust-channel.block" \
    --tls \
    --cafile "$ORDERER_CA"
else
  echo "Channel block already exists; skipping channel creation."
fi

join_peer() {
  local org="$1" port="$2" msp="$3"
  export CORE_PEER_ADDRESS="peer0.$org.aquatrust.internal:$port"
  export CORE_PEER_LOCALMSPID="$msp"
  export CORE_PEER_MSPCONFIGPATH="$NETWORK/organizations/peerOrganizations/$org.aquatrust.internal/users/Admin@$org.aquatrust.internal/msp"
  export CORE_PEER_TLS_ROOTCERT_FILE="$NETWORK/organizations/peerOrganizations/$org.aquatrust.internal/peers/peer0.$org.aquatrust.internal/tls/ca.crt"
  export CORE_PEER_TLS_SERVERHOSTOVERRIDE="peer0.$org.aquatrust.internal"
  peer channel join -b "$NETWORK/artifacts/aquatrust-channel.block"
}

join_peer facility 7051 FacilityMSP
join_peer auditor 8051 AuditorMSP
join_peer regulator 9051 RegulatorMSP