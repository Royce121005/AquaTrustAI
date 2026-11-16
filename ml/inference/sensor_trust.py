"""
AquaTrust AI — Sensor Trust & Anomaly Classification Engine
Formalizes Phase 2 deliverables for Member 1 (AI/ML Lead).

Provides explicit taxonomy and statistical classification for:
1. Missing readings (MISSING_READING)
2. Hardware/boundary sensor failures (SENSOR_FAILURE)
3. Stuck/frozen sensors (STUCK_SENSOR)
4. Duplicate readings (DUPLICATE_READING)
5. Sudden transient spikes (SUDDEN_SPIKE)
6. Progressive sensor drift (SENSOR_DRIFT)
7. Cross-parameter stoichiometric inconsistency (PARAMETER_INCONSISTENCY)
8. Contamination shock load / process change (SUDDEN_PROCESS_CHANGE)
9. Statistical multi-feature outlier (STATISTICAL_ANOMALY)
10. Normal nominal operation (NORMAL)
"""

from enum import Enum
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any, Union
import numpy as np


class SensorTrustAnomalyType(str, Enum):
    """Authoritative taxonomy for sensor anomalies and process events."""
    NORMAL = "NORMAL"
    MISSING_READING = "MISSING_READING"
    SENSOR_FAILURE = "SENSOR_FAILURE"
    STUCK_SENSOR = "STUCK_SENSOR"
    DUPLICATE_READING = "DUPLICATE_READING"
    SUDDEN_SPIKE = "SUDDEN_SPIKE"
    SENSOR_DRIFT = "SENSOR_DRIFT"
    PARAMETER_INCONSISTENCY = "PARAMETER_INCONSISTENCY"
    SUDDEN_PROCESS_CHANGE = "SUDDEN_PROCESS_CHANGE"
    STATISTICAL_ANOMALY = "STATISTICAL_ANOMALY"


class SensorTrustSeverity(str, Enum):
    """Standardized severity levels for operational alerts."""
    NORMAL = "NORMAL"       # 0.0
    LOW = "LOW"             # 0.01 - 0.35
    MEDIUM = "MEDIUM"       # 0.36 - 0.65
    HIGH = "HIGH"           # 0.66 - 0.85
    CRITICAL = "CRITICAL"   # 0.86 - 1.00


@dataclass
class SensorTrustResult:
    """Standardized output structure for Phase 2 sensor trust evaluation."""
    anomaly_type: SensorTrustAnomalyType
    severity: SensorTrustSeverity
    severity_score: float  # Normalized 0.0 (benign) to 1.0 (extreme/fatal)
    confidence: float      # Confidence of diagnosis 0.0 to 1.0
    reason: str
    is_sensor_fault: bool  # True if fault is sensor hardware/signal; False if real process event
    timestamp: str
    parameter: str
    value: Optional[float]
    unit: str
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["anomaly_type"] = self.anomaly_type.value
        d["severity"] = self.severity.value
        return d


class SensorTrustClassifier:
    """
    Evaluates temporal patterns, boundary plausibility, and cross-parameter stoichiometry
    to classify specific sensor trust anomaly types and assign calibrated severity scores.
    """

    # Physical boundary limits for wastewater parameters
    PHYSICAL_BOUNDS = {
        "ph": (0.0, 14.0),
        "bod": (0.0, 5000.0),
        "cod": (0.0, 15000.0),
        "tss": (0.0, 10000.0),
        "nh4_n": (0.0, 1000.0),
        "tkn": (0.0, 1500.0),
        "tn": (0.0, 2000.0),
        "nox_n": (0.0, 1000.0),
        "temperature": (-5.0, 60.0),
        "dissolved_oxygen": (0.0, 30.0),
    }

    def __init__(
        self,
        stuck_epsilon: float = 1e-4,
        stuck_min_samples: int = 3,
        spike_z_threshold: float = 3.5,
        drift_consecutive_steps: int = 4,
        drift_min_slope: float = 0.05,
    ):
        self.stuck_epsilon = stuck_epsilon
        self.stuck_min_samples = stuck_min_samples
        self.spike_z_threshold = spike_z_threshold
        self.drift_consecutive_steps = drift_consecutive_steps
        self.drift_min_slope = drift_min_slope

    def evaluate(
        self,
        current_value: Optional[float],
        parameter: str,
        unit: str,
        timestamp: str,
        sliding_history: List[float],
        iforest_anomaly: bool = False,
        iforest_score: Optional[float] = None,
        contemporaneous_readings: Optional[Dict[str, float]] = None,
        is_duplicate: bool = False,
    ) -> SensorTrustResult:
        """
        Classifies the reading into an authoritative SensorTrustAnomalyType.

        Args:
            current_value: The observed numeric reading (or None if missing).
            parameter: Canonical parameter name (e.g. 'ph', 'bod', 'cod').
            unit: Engineering unit string.
            timestamp: ISO-8601 timestamp string.
            sliding_history: Recent numeric observations in chronological order (excludes current_value).
            iforest_anomaly: Boolean flag from Isolation Forest engine.
            iforest_score: Raw decision function score from Isolation Forest.
            contemporaneous_readings: Dictionary of other parameter values at same timestamp.
            is_duplicate: Flag indicating an identical timestamp/value collision was received.

        Returns:
            SensorTrustResult object.
        """
        param = parameter.lower()
        contemporaneous = contemporaneous_readings or {}

        # 1. Check Missing Reading
        if current_value is None:
            return SensorTrustResult(
                anomaly_type=SensorTrustAnomalyType.MISSING_READING,
                severity=SensorTrustSeverity.MEDIUM,
                severity_score=0.50,
                confidence=1.0,
                reason=f"Telemetry signal for parameter '{parameter}' dropped (null observation received).",
                is_sensor_fault=True,
                timestamp=timestamp,
                parameter=parameter,
                value=None,
                unit=unit,
            )

        val = float(current_value)

        # 2. Check Duplicate Reading
        if is_duplicate:
            return SensorTrustResult(
                anomaly_type=SensorTrustAnomalyType.DUPLICATE_READING,
                severity=SensorTrustSeverity.LOW,
                severity_score=0.20,
                confidence=1.0,
                reason=f"Duplicate telemetry payload received for sensor '{parameter}' at timestamp {timestamp}.",
                is_sensor_fault=False,
                timestamp=timestamp,
                parameter=parameter,
                value=val,
                unit=unit,
            )

        # 3. Check Physical Boundary Violation (Sensor Failure)
        if param in self.PHYSICAL_BOUNDS:
            min_bound, max_bound = self.PHYSICAL_BOUNDS[param]
            if val < min_bound or val > max_bound:
                return SensorTrustResult(
                    anomaly_type=SensorTrustAnomalyType.SENSOR_FAILURE,
                    severity=SensorTrustSeverity.CRITICAL,
                    severity_score=0.95,
                    confidence=0.99,
                    reason=(
                        f"Physical boundary violation: {parameter}={val} {unit} is outside "
                        f"physically possible domain [{min_bound}, {max_bound}]."
                    ),
                    is_sensor_fault=True,
                    timestamp=timestamp,
                    parameter=parameter,
                    value=val,
                    unit=unit,
                    metadata={"min_bound": min_bound, "max_bound": max_bound},
                )

        # 4. Check Stuck / Frozen Sensor
        # If last N readings (including current) have standard deviation ~ 0 and val != 0
        all_recent = sliding_history + [val]
        if len(all_recent) >= self.stuck_min_samples and val != 0.0:
            window = all_recent[-self.stuck_min_samples:]
            std_dev = float(np.std(window))
            val_range = max(window) - min(window)
            if std_dev <= self.stuck_epsilon or val_range <= self.stuck_epsilon:
                return SensorTrustResult(
                    anomaly_type=SensorTrustAnomalyType.STUCK_SENSOR,
                    severity=SensorTrustSeverity.HIGH,
                    severity_score=0.75,
                    confidence=0.92,
                    reason=(
                        f"Sensor frozen / stuck: {parameter} has reported identical value "
                        f"{val:.3f} across {self.stuck_min_samples} consecutive observations (std={std_dev:.5f})."
                    ),
                    is_sensor_fault=True,
                    timestamp=timestamp,
                    parameter=parameter,
                    value=val,
                    unit=unit,
                    metadata={"stuck_value": val, "consecutive_samples": self.stuck_min_samples},
                )

        # 5. Check Cross-Parameter Stoichiometric Inconsistency
        inconsistency_result = self._check_parameter_inconsistency(param, val, contemporaneous, timestamp, unit)
        if inconsistency_result is not None:
            return inconsistency_result

        # 6. Check Sudden Transient Spike
        if len(sliding_history) >= 3:
            hist_mean = float(np.mean(sliding_history[-5:]))
            hist_std = float(np.std(sliding_history[-5:]))
            if hist_std > 1e-4:
                z_score = abs(val - hist_mean) / hist_std
                if z_score >= self.spike_z_threshold:
                    delta = val - sliding_history[-1]
                    severity = SensorTrustSeverity.HIGH if z_score > 5.0 else SensorTrustSeverity.MEDIUM
                    sev_score = min(0.90, 0.40 + (z_score / 10.0) * 0.5)
                    return SensorTrustResult(
                        anomaly_type=SensorTrustAnomalyType.SUDDEN_SPIKE,
                        severity=severity,
                        severity_score=round(sev_score, 2),
                        confidence=0.90,
                        reason=(
                            f"Sudden transient spike on {parameter}: jump of {delta:+.2f} {unit} "
                            f"(z-score={z_score:.2f} > {self.spike_z_threshold})."
                        ),
                        is_sensor_fault=(z_score > 7.0),  # extreme jump is typically sensor glitch
                        timestamp=timestamp,
                        parameter=parameter,
                        value=val,
                        unit=unit,
                        metadata={"z_score": round(z_score, 2), "delta": round(delta, 2), "mean": round(hist_mean, 2)},
                    )

        # 7. Check Sensor Drift
        drift_result = self._check_sensor_drift(all_recent, parameter, val, unit, timestamp)
        if drift_result is not None:
            return drift_result

        # 8. Check Sudden Process Change (Contamination Shock / Hydraulic Surge)
        # If Isolation Forest flagged an anomaly and multiple parameters simultaneously shifted
        if iforest_anomaly:
            score = iforest_score if iforest_score is not None else -0.15
            # Calibrate severity from negative score (e.g. -0.05 is mild, -0.3 is severe)
            sev_score = min(0.90, max(0.40, abs(score) * 2.5))
            
            # Distinguish shock load from statistical anomaly if other parameters also spiked
            is_shock = self._detect_shock_load(param, val, contemporaneous)
            anomaly_type = (
                SensorTrustAnomalyType.SUDDEN_PROCESS_CHANGE
                if is_shock
                else SensorTrustAnomalyType.STATISTICAL_ANOMALY
            )
            severity = SensorTrustSeverity.CRITICAL if sev_score > 0.80 else SensorTrustSeverity.HIGH
            reason = (
                f"Industrial shock load / sudden process surge detected on {parameter}."
                if is_shock
                else f"Isolation Forest detected multi-feature statistical deviation on {parameter} (score={score:.4f})."
            )

            return SensorTrustResult(
                anomaly_type=anomaly_type,
                severity=severity,
                severity_score=round(sev_score, 2),
                confidence=0.88,
                reason=reason,
                is_sensor_fault=False,
                timestamp=timestamp,
                parameter=parameter,
                value=val,
                unit=unit,
                metadata={"iforest_score": round(score, 4), "is_process_event": True},
            )

        # 9. Nominal / Normal State
        return SensorTrustResult(
            anomaly_type=SensorTrustAnomalyType.NORMAL,
            severity=SensorTrustSeverity.NORMAL,
            severity_score=0.0,
            confidence=0.98,
            reason=f"Parameter {parameter} is operating within nominal statistical and physical bounds.",
            is_sensor_fault=False,
            timestamp=timestamp,
            parameter=parameter,
            value=val,
            unit=unit,
        )

    def _check_parameter_inconsistency(
        self,
        param: str,
        val: float,
        contemporaneous: Dict[str, float],
        timestamp: str,
        unit: str,
    ) -> Optional[SensorTrustResult]:
        """Validates chemical and stoichiometric consistency between related parameters."""
        # Rule 1: COD must be greater than or equal to BOD (COD >= BOD)
        if param == "cod" and "bod" in contemporaneous:
            bod_val = float(contemporaneous["bod"])
            if val < bod_val * 0.95:  # 5% tolerance
                return SensorTrustResult(
                    anomaly_type=SensorTrustAnomalyType.PARAMETER_INCONSISTENCY,
                    severity=SensorTrustSeverity.CRITICAL,
                    severity_score=0.88,
                    confidence=0.95,
                    reason=(
                        f"Chemical impossibility: COD ({val} {unit}) is lower than BOD ({bod_val} mg/L). "
                        f"Chemical Oxygen Demand must strictly equal or exceed Biochemical Oxygen Demand."
                    ),
                    is_sensor_fault=True,
                    timestamp=timestamp,
                    parameter=param,
                    value=val,
                    unit=unit,
                    metadata={"cod": val, "bod": bod_val, "rule": "COD >= BOD"},
                )

        if param == "bod" and "cod" in contemporaneous:
            cod_val = float(contemporaneous["cod"])
            if val > cod_val * 1.05:
                return SensorTrustResult(
                    anomaly_type=SensorTrustAnomalyType.PARAMETER_INCONSISTENCY,
                    severity=SensorTrustSeverity.CRITICAL,
                    severity_score=0.88,
                    confidence=0.95,
                    reason=(
                        f"Chemical impossibility: BOD ({val} {unit}) exceeds COD ({cod_val} mg/L). "
                        f"Biochemical Oxygen Demand cannot exceed Chemical Oxygen Demand."
                    ),
                    is_sensor_fault=True,
                    timestamp=timestamp,
                    parameter=param,
                    value=val,
                    unit=unit,
                    metadata={"bod": val, "cod": cod_val, "rule": "COD >= BOD"},
                )

        # Rule 2: TKN must equal or exceed Ammonia Nitrogen (TKN >= NH4-N)
        if param == "tkn" and "nh4_n" in contemporaneous:
            nh4_val = float(contemporaneous["nh4_n"])
            if val < nh4_val * 0.90:  # 10% tolerance for measurement error
                return SensorTrustResult(
                    anomaly_type=SensorTrustAnomalyType.PARAMETER_INCONSISTENCY,
                    severity=SensorTrustSeverity.HIGH,
                    severity_score=0.80,
                    confidence=0.92,
                    reason=(
                        f"Nitrogen balance violation: TKN ({val} {unit}) is less than NH4-N ({nh4_val} mg/L). "
                        f"Total Kjeldahl Nitrogen includes ammonia and must be >= NH4-N."
                    ),
                    is_sensor_fault=True,
                    timestamp=timestamp,
                    parameter=param,
                    value=val,
                    unit=unit,
                    metadata={"tkn": val, "nh4_n": nh4_val, "rule": "TKN >= NH4-N"},
                )

        return None

    def _check_sensor_drift(
        self,
        window: List[float],
        parameter: str,
        val: float,
        unit: str,
        timestamp: str,
    ) -> Optional[SensorTrustResult]:
        """Detects monotonic systematic drift across the observation window."""
        if len(window) < self.drift_consecutive_steps:
            return None

        recent = window[-self.drift_consecutive_steps:]
        diffs = np.diff(recent)

        # Check if strictly increasing or strictly decreasing
        all_increasing = all(d > 0 for d in diffs)
        all_decreasing = all(d < 0 for d in diffs)

        if all_increasing or all_decreasing:
            # Check slope relative to mean
            total_change = recent[-1] - recent[0]
            avg_val = np.mean(recent)
            if avg_val > 0:
                rel_change = abs(total_change) / avg_val
                # If steady progressive drift without high step variance
                if rel_change >= self.drift_min_slope and np.std(diffs) < (abs(np.mean(diffs)) * 1.5):
                    direction = "upward" if all_increasing else "downward"
                    return SensorTrustResult(
                        anomaly_type=SensorTrustAnomalyType.SENSOR_DRIFT,
                        severity=SensorTrustSeverity.MEDIUM,
                        severity_score=0.55,
                        confidence=0.85,
                        reason=(
                            f"Systematic sensor drift detected: {parameter} shows steady {direction} drift "
                            f"of {total_change:+.2f} {unit} ({rel_change*100:.1f}%) across {len(recent)} steps."
                        ),
                        is_sensor_fault=True,
                        timestamp=timestamp,
                        parameter=parameter,
                        value=val,
                        unit=unit,
                        metadata={"direction": direction, "total_change": round(total_change, 2)},
                    )
        return None

    def _detect_shock_load(self, param: str, val: float, contemporaneous: Dict[str, float]) -> bool:
        """Determines if a flagged reading represents a real industrial shock load."""
        # Shock loads typically show correlated elevated levels in COD, BOD, or TSS simultaneously
        if param == "cod" and val > 500.0:
            if contemporaneous.get("bod", 0.0) > 150.0 or contemporaneous.get("tss", 0.0) > 200.0:
                return True
        if param == "bod" and val > 200.0:
            if contemporaneous.get("cod", 0.0) > 400.0:
                return True
        return False
