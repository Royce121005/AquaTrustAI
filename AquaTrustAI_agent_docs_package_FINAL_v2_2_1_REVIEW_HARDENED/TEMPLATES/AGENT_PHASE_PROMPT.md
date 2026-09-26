# Agent Prompt — Execute One AquaTrust AI Phase

You are implementing one phase of the AquaTrust AI project.

## Assigned phase

`PHASE_XX_<NAME>.md`

## Mandatory instructions

Read the entire assigned phase and the MASTER documents before changing code.

The master specification is authoritative.

Implement ONLY the assigned phase.

Do not:
- implement future phases;
- redesign the frozen architecture;
- silently change data/API contracts;
- introduce unapproved technologies;
- fabricate data, hashes, signatures, certificates or DLT IDs;
- leave fake production responses;
- disable or weaken tests;
- delete evidence to make tests pass.

## Before coding

1. Inspect the current repository.
2. Compare implementation against the phase requirements.
3. Identify dependencies and consumers.
4. Identify potential regressions.
5. State your implementation plan briefly.

## During coding

- Reuse existing code where appropriate.
- Keep responsibilities separated by layer.
- Add tests with the implementation.
- Preserve backward compatibility unless an approved contract change is required.
- Record migration/API/schema changes.

## After coding

Run:
1. unit tests;
2. integration tests;
3. negative/error-path tests;
4. regression tests;
5. build/type-check/lint commands applicable to the repository.

Then perform a self-audit against:
- architecture freeze;
- data contracts;
- API contract;
- integration rules;
- security rules;
- definition of done;
- assigned phase exit criteria.

## Completion

Create the phase completion report using the template.

Report:
- what changed;
- what passed;
- what failed;
- what remains;
- any contract changes;
- any blockers.

Do not begin the next phase.

If the phase cannot be completed safely because of a conflict with an earlier contract, stop and report the conflict rather than inventing a workaround.

- For Phase 02/05/16 validation work, `MASTER/VALIDATION_SPECIFICATION.md` is authoritative.
