# AquaTrust AI — Coding Rules

## General
- Inspect existing code before editing.
- Reuse existing abstractions when they fit.
- Avoid duplicate services for the same responsibility.
- Prefer small, testable modules.
- Use explicit names.
- Keep functions focused.

## Type safety
- Preserve TypeScript typing.
- Validate API input at boundaries.
- Avoid untyped escape hatches unless documented and justified.

## Backend
- Separate routers/controllers from domain logic.
- Keep persistence logic out of transport handlers where practical.
- Validate all external data.
- Return structured errors.

## AI
- Persist model/version metadata.
- Never silently retrain a production model.
- Record feature-set version.
- Make inference behavior reproducible under a fixed model/configuration.

## Database
- Use migrations.
- Never edit production schema manually as the normal workflow.
- Add indexes based on measured query needs.
- Preserve audit/evidence lineage.

## Frontend
- Use API data rather than duplicated business calculations.
- Handle loading, empty, error and success states.
- Do not expose secrets in client code.
- Preserve the existing UI language unless the phase explicitly changes UI.

## Tests
For each feature, add appropriate:
- unit tests
- integration tests
- negative tests
- regression tests

## Prohibited shortcuts
- hardcoded success responses
- fabricated production IDs
- TODO stubs counted as completion
- commented-out fake implementations
- bypassing authorization for convenience
- disabling tests to make a phase pass
