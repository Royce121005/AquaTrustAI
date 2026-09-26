# AquaTrust AI — API Contract

This document defines integration principles. Concrete endpoint paths, request/response schemas, and error contracts are authoritative in `API_ENDPOINT_REGISTRY.md`. Phase 01 implements and validates that registry and must not redesign it.

## 1. API layers

```text
Frontend / Simulator / External Facility
              ↓
        FastAPI Gateway
              ↓
        Domain Services
              ↓
       PostgreSQL / AI / DLT
```

## 2. Required API capability groups

The final API must expose capabilities for:
- facilities
- sensors
- readings
- validation
- anomaly results
- compliance
- treatment records
- certificates
- verification
- corrections
- audit events
- authentication/authorization
- experimental benchmark control/results where appropriate

## 3. API requirements

Every endpoint must define:
- method
- path
- authentication requirement
- role/permission requirement
- request schema
- response schema
- error schema
- status codes
- idempotency behavior where relevant
- audit behavior where relevant

## 4. Error contract

Errors must be structured and machine-readable.

At minimum:
```text
error_code
message
details
request_id
```

Do not expose secrets, stack traces or internal database details.

## 5. No frontend business logic

The frontend must not become the authoritative source for:
- compliance calculations
- anomaly calculations
- cryptographic signing
- DLT transaction creation
- record finalization

## 6. Contract change rule

A breaking API change requires:
1. contract update;
2. affected-client identification;
3. server tests;
4. client tests;
5. migration/deprecation strategy where needed;
6. regression verification.

## 7. Integration principle

The simulator, future real-facility adapters and frontend should consume the same canonical domain contract rather than maintaining separate data formats.
