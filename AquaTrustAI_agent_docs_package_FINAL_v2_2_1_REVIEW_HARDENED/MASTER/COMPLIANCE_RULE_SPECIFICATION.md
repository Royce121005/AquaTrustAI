# AquaTrust AI — Compliance Rule Specification

**Status:** AUTHORITATIVE — v2.2.1 engineering freeze

## 1. Purpose

The compliance engine evaluates wastewater evidence against explicit, versioned quality rules. It is deterministic for a fixed input snapshot and rule set.

## 2. Rule schema

Every rule must contain:
```text
rule_id
parameter
operator
threshold / threshold_min / threshold_max
threshold_unit
facility_scope
stage_scope
effective_from
effective_to
rule_version
source_reference
active
```

## 3. Supported operators

Minimum operators:
- `lt`
- `lte`
- `gt`
- `gte`
- `eq`
- `between` (inclusive)

The implementation must not interpret free-form natural-language rules as executable policy.

## 4. Unit handling

A rule is evaluated only after the measurement is normalized to the rule's declared unit and its treatment stage/sample-point semantics match the rule's scope when `stage_scope` is specified. Unit conversion must be deterministic and versioned.

If conversion is impossible or the unit is unknown, the result is `not_evaluable`, not compliant by default.

## 5. Effective dating

Rules are selected using the treatment observation/finalization period and the rule's effective dates. A newer rule must not retroactively replace a historical rule unless the source explicitly requires retroactive application.

## 6. Parameter result

Each parameter evaluation records:
```text
parameter
observed_value
observed_unit
rule_id
rule_version
operator
threshold / threshold_min / threshold_max
threshold_unit
result
reason
```

Minimum result states:
`compliant`, `non_compliant`, `not_evaluable`.

## 7. Aggregate compliance

Aggregate status is derived from parameter results using the frozen policy:
- `non_compliant` if any required evaluated parameter is non-compliant;
- `not_evaluable` if no non-compliance exists but a required parameter cannot be evaluated;
- `compliant` only when all required parameters are evaluable and compliant.

This prevents missing evidence from being silently treated as compliant.

## 8. Source hierarchy

The implementation must record the source/reference for each rule. If multiple sources conflict, do not silently choose one. Mark the rule set as requiring human resolution and record the selected rule version after approval.

## 9. Rule versioning

Changing threshold, operator, parameter, unit, scope, effective date or source creates a new `rule_version`. Historical compliance results retain the original version.

## 10. Test cases

Mandatory:
- exactly at threshold;
- just inside threshold;
- just outside threshold;
- wrong unit;
- missing value;
- duplicate reading;
- stage mismatch / stage out of scope;
- rule not yet effective;
- expired rule;
- multiple parameters with mixed results.

## 11. Separation

Compliance is independent from `quality_status` and `anomaly_status`. A validation failure may make a measurement unavailable for compliance evaluation, but the system must retain the separate reason.

## Frozen operator schema
For `lt`, `lte`, `gt`, `gte`, and `eq`, `threshold` is required and `threshold_min`/`threshold_max` must be null. For `between`, `threshold` must be null and both `threshold_min` and `threshold_max` are required. `between` is inclusive: `threshold_min <= value <= threshold_max`. `threshold_min` must be less than or equal to `threshold_max`.
