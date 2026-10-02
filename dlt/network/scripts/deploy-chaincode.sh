#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
NETWORK="$ROOT/dlt/network"
CHAINCODE="$ROOT/dlt/chaincode/aquatrust-records"
export FABRIC_CFG_PATH="$NETWORK"
export CORE_PEER_TLS_ENABLED=true
ORDERER_CA="$NETWORK/organizations/ordererOrganizations/aquatrust.internal/orderers/orderer0.aquatrust.internal/tls/ca.crt"
CHAINCODE_VERSION=1.0.1
CHAINCODE_SEQUENCE=2
PACKAGE="$NETWORK/artifacts/aquatrust-records-$CHAINCODE_VERSION.tar.gz"
LABEL="aquatrust-records_$CHAINCODE_VERSION"

peer lifecycle chaincode package "$PACKAGE" --path "$CHAINCODE" --lang node --label "$LABEL"
PACKAGE_ID="$(peer lifecycle chaincode calculatepackageid "$PACKAGE" -O json | sed -n 's/.*"package_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
if [ -z "$PACKAGE_ID" ]; then echo "Could not calculate package ID" >&2; exit 1; fi

set_peer() {
  local org="$1" port="$2" msp="$3"
  export CORE_PEER_ADDRESS="127.0.0.1:$port"
  export CORE_PEER_LOCALMSPID="$msp"
  export CORE_PEER_MSPCONFIGPATH="$NETWORK/organizations/peerOrganizations/$org.aquatrust.internal/users/Admin@$org.aquatrust.internal/msp"
  export CORE_PEER_TLS_ROOTCERT_FILE="$NETWORK/organizations/peerOrganizations/$org.aquatrust.internal/peers/peer0.$org.aquatrust.internal/tls/ca.crt"
}
install_approve() {
  local org="$1" port="$2" msp="$3"
  set_peer "$org" "$port" "$msp"
  peer lifecycle chaincode install "$PACKAGE"
  peer lifecycle chaincode approveformyorg -o 127.0.0.1:7050 --ordererTLSHostnameOverride orderer0.aquatrust.internal --channelID aquatrust-channel --name aquatrust-records --version "$CHAINCODE_VERSION" --package-id "$PACKAGE_ID" --sequence "$CHAINCODE_SEQUENCE" --signature-policy "OutOf(2, 'FacilityMSP.peer', 'AuditorMSP.peer', 'RegulatorMSP.peer')" --tls --cafile "$ORDERER_CA"
}
install_approve facility 7051 FacilityMSP
install_approve auditor 8051 AuditorMSP
install_approve regulator 9051 RegulatorMSP

set_peer facility 7051 FacilityMSP
peer lifecycle chaincode checkcommitreadiness --channelID aquatrust-channel --name aquatrust-records --version "$CHAINCODE_VERSION" --sequence "$CHAINCODE_SEQUENCE" --signature-policy "OutOf(2, 'FacilityMSP.peer', 'AuditorMSP.peer', 'RegulatorMSP.peer')" --output json
peer lifecycle chaincode commit -o 127.0.0.1:7050 --ordererTLSHostnameOverride orderer0.aquatrust.internal --channelID aquatrust-channel --name aquatrust-records --version "$CHAINCODE_VERSION" --sequence "$CHAINCODE_SEQUENCE" --signature-policy "OutOf(2, 'FacilityMSP.peer', 'AuditorMSP.peer', 'RegulatorMSP.peer')" --peerAddresses 127.0.0.1:7051 --tlsRootCertFiles "$NETWORK/organizations/peerOrganizations/facility.aquatrust.internal/peers/peer0.facility.aquatrust.internal/tls/ca.crt" --peerAddresses 127.0.0.1:8051 --tlsRootCertFiles "$NETWORK/organizations/peerOrganizations/auditor.aquatrust.internal/peers/peer0.auditor.aquatrust.internal/tls/ca.crt" --tls --cafile "$ORDERER_CA"
