"""AquaTrust AI — Treatment Process Model Engine.

Implements a transparent, mass-balance and kinetic process model for multi-stage
decentralized Sewage Treatment Plants (STPs).
Stages supported:
  1. Inlet (Influent)
  2. Primary Clarifier (Physical sedimentation)
  3. Biological Aeration (Activated sludge oxidation & nitrification)
  4. Secondary Clarifier (Secondary settling & clarification)
  5. Final Effluent (Treated discharge)

NOTE ON CALIBRATION & SCOPE:
This engine implements an illustrative first-principles mass balance and
continuous-stirred-tank-reactor (CSTR) kinetic approximation for decentralized
activated sludge STPs. It provides directional realism for sanity checks, baseline
estimations, and what-if exploration. It does NOT substitute for an independently
calibrated site-specific digital twin calibrated against facility tracer studies,
respirometry, or hydrodynamic CFD modeling.
"""

import math
import hashlib
import json
from decimal import Decimal
from typing import Dict, Any, Optional, Tuple, List


class ProcessModelEngine:
    """Documented, versioned wastewater treatment process model engine."""

    MODEL_VERSION = "aquatrust-process-v1.0"
    MODEL_TYPE = "process_model"

    DEFAULT_PARAMETERS = {
        # Primary clarifier TSS removal efficiency
        "primary_tss_removal_fraction": 0.60,
        "primary_bod_particulate_fraction": 0.35,
        "primary_cod_particulate_fraction": 0.30,
        # Biological aeration kinetics (Activated Sludge)
        "k_bod_20": 0.85,            # base BOD removal rate constant at 20°C (1/hour)
        "theta_bod": 1.04,           # temperature coefficient for BOD degradation
        "half_saturation_do": 0.5,   # mg/L DO half-saturation constant
        "k_nitrification_20": 0.20,  # base nitrification rate constant at 20°C (1/hour)
        "half_saturation_do_nit": 1.0,  # mg/L DO half-saturation for nitrifiers
        "default_hrt_hours": 8.0,    # hydraulic retention time in aeration basin
        "default_do_mg_l": 2.0,      # nominal dissolved oxygen concentration
        "default_temp_c": 20.0,      # nominal operating temperature
        # Secondary clarifier
        "secondary_clarifier_tss_removal": 0.92,
        "secondary_bod_polishing_factor": 0.85,
        # Minimum non-biodegradable COD ratio
        "min_cod_to_bod_ratio": 2.0,
    }

    def __init__(self, parameters: Optional[Dict[str, Any]] = None):
        self.parameters = dict(self.DEFAULT_PARAMETERS)
        if parameters:
            self.parameters.update(parameters)
        self.configuration_hash = self._compute_configuration_hash()

    def _compute_configuration_hash(self) -> str:
        """Calculate deterministic SHA-256 hash of model parameters."""
        serialized = json.dumps(self.parameters, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def evaluate_stages(
        self,
        influent_observations: Dict[str, float],
        operating_variables: Optional[Dict[str, Any]] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Calculates treatment progression across all configured stages.

        Args:
            influent_observations: Dict mapping parameter names ('bod', 'cod', 'tss', 'ph', 'nh4_n') to values.
            operating_variables: Optional dict with 'hrt_hours', 'do_mg_l', 'temperature_c', 'flow_rate_m3_d'.

        Returns:
            Tuple of (status, stage_results_dict)
            status is 'ready' on successful calculation, or 'insufficient_data' if mandatory inputs missing.
        """
        # Normalize parameter keys to lower-case
        norm_influent = {k.lower(): float(v) for k, v in influent_observations.items() if v is not None}

        # Check required influent parameters
        required = ["bod", "cod", "tss", "ph"]
        missing = [p for p in required if p not in norm_influent]
        if missing:
            return "insufficient_data", {
                "error": f"Missing mandatory influent parameters: {missing}",
                "missing_parameters": missing,
            }

        op_vars = operating_variables or {}
        hrt = float(op_vars.get("hrt_hours", self.parameters["default_hrt_hours"]))
        do = float(op_vars.get("do_mg_l", self.parameters["default_do_mg_l"]))
        temp = float(op_vars.get("temperature_c", self.parameters["default_temp_c"]))

        # Bounds safety
        hrt = max(0.5, min(48.0, hrt))
        do = max(0.0, min(15.0, do))
        temp = max(5.0, min(45.0, temp))

        in_bod = max(0.0, norm_influent["bod"])
        in_cod = max(in_bod * 1.5, norm_influent["cod"])  # Stoichiometric consistency
        in_tss = max(0.0, norm_influent["tss"])
        in_ph = max(0.0, min(14.0, norm_influent["ph"]))
        in_nh4 = max(0.0, norm_influent.get("nh4_n", 30.0))

        # -------------------------------------------------------------
        # 1. Stage: Inlet
        # -------------------------------------------------------------
        stage_inlet = {
            "stage_id": "inlet",
            "stage_name": "Raw Influent",
            "sequence_order": 1,
            "parameters": {
                "bod": in_bod,
                "cod": in_cod,
                "tss": in_tss,
                "ph": in_ph,
                "nh4_n": in_nh4,
            },
            "operating_variables": {
                "temperature_c": temp,
            },
        }

        # -------------------------------------------------------------
        # 2. Stage: Primary Clarifier (Sedimentation)
        # -------------------------------------------------------------
        p_tss_rem = self.parameters["primary_tss_removal_fraction"]
        p_bod_part = self.parameters["primary_bod_particulate_fraction"]
        p_cod_part = self.parameters["primary_cod_particulate_fraction"]

        prim_tss = in_tss * (1.0 - p_tss_rem)
        prim_bod = in_bod * (1.0 - (p_bod_part * p_tss_rem))
        prim_cod = in_cod * (1.0 - (p_cod_part * p_tss_rem))
        prim_ph = in_ph  # Physical settling does not alter pH
        prim_nh4 = in_nh4  # Soluble ammonia unaffected by settling

        stage_primary = {
            "stage_id": "primary_clarifier",
            "stage_name": "Primary Clarifier",
            "sequence_order": 2,
            "parameters": {
                "bod": round(prim_bod, 2),
                "cod": round(prim_cod, 2),
                "tss": round(prim_tss, 2),
                "ph": round(prim_ph, 2),
                "nh4_n": round(prim_nh4, 2),
            },
            "removal_efficiencies": {
                "tss_removal_percent": round(p_tss_rem * 100, 1),
                "bod_removal_percent": round((1.0 - prim_bod / (in_bod or 1.0)) * 100, 1),
            },
        }

        # -------------------------------------------------------------
        # 3. Stage: Biological Aeration (Activated Sludge)
        # -------------------------------------------------------------
        # Temperature-corrected kinetic constants
        k_bod_t = self.parameters["k_bod_20"] * (self.parameters["theta_bod"] ** (temp - 20.0))
        do_factor_bod = do / (self.parameters["half_saturation_do"] + do) if do > 0 else 0.0

        # CSTR Substrate Removal: S_out = S_in / (1 + k * HRT * DO_factor)
        bio_bod = prim_bod / (1.0 + (k_bod_t * hrt * do_factor_bod))

        # Refractory COD remains; soluble COD degrades with BOD
        refractory_cod = prim_cod * 0.12
        degradable_cod = max(0.0, prim_cod - refractory_cod)
        bio_cod = refractory_cod + (degradable_cod / (1.0 + (k_bod_t * 0.8 * hrt * do_factor_bod)))
        bio_cod = max(bio_cod, bio_bod * self.parameters["min_cod_to_bod_ratio"])

        # Nitrification kinetics: CSTR Monod-DO driven ammonia oxidation (consistent with CSTR aeration basin)
        k_nit_t = self.parameters["k_nitrification_20"] * (1.06 ** (temp - 20.0))
        do_factor_nit = do / (self.parameters["half_saturation_do_nit"] + do) if do > 0 else 0.0
        bio_nh4 = prim_nh4 / (1.0 + (k_nit_t * hrt * do_factor_nit))

        # pH balance: Nitrification consumes ~7.14 mg CaCO3 alkalinity per mg NH4 oxidized
        nh4_oxidized = max(0.0, prim_nh4 - bio_nh4)
        ph_drop = nh4_oxidized * 0.02
        bio_ph = max(6.2, min(8.8, prim_ph - ph_drop))

        # Biomass growth in aeration basin (MLSS / TSS high inside tank, before clarification)
        mixed_liquor_tss = 2500.0 + (prim_bod * 0.6)

        stage_aeration = {
            "stage_id": "biological_aeration",
            "stage_name": "Biological Aeration Basin",
            "sequence_order": 3,
            "parameters": {
                "bod": round(bio_bod, 2),
                "cod": round(bio_cod, 2),
                "tss": round(mixed_liquor_tss, 2),
                "ph": round(bio_ph, 2),
                "nh4_n": round(bio_nh4, 2),
            },
            "operating_variables": {
                "hrt_hours": hrt,
                "do_mg_l": do,
                "temperature_c": temp,
                "do_inhibition_factor": round(do_factor_bod, 3),
            },
        }

        # -------------------------------------------------------------
        # 4. Stage: Secondary Clarifier (Biomass separation)
        # -------------------------------------------------------------
        sec_tss_rem = self.parameters["secondary_clarifier_tss_removal"]
        sec_tss = max(5.0, (mixed_liquor_tss * (1.0 - sec_tss_rem)) * 0.05)
        # Residual BOD associated with effluent solids (approx 0.5 mg BOD / mg TSS)
        eff_bod = bio_bod * self.parameters["secondary_bod_polishing_factor"] + (sec_tss * 0.15)
        eff_cod = max(bio_cod * 0.90, eff_bod * self.parameters["min_cod_to_bod_ratio"])
        eff_ph = bio_ph
        eff_nh4 = bio_nh4

        stage_secondary = {
            "stage_id": "secondary_clarifier",
            "stage_name": "Secondary Clarifier",
            "sequence_order": 4,
            "parameters": {
                "bod": round(eff_bod, 2),
                "cod": round(eff_cod, 2),
                "tss": round(sec_tss, 2),
                "ph": round(eff_ph, 2),
                "nh4_n": round(eff_nh4, 2),
            },
        }

        # -------------------------------------------------------------
        # 5. Stage: Final Effluent
        # -------------------------------------------------------------
        stage_effluent = {
            "stage_id": "final_effluent",
            "stage_name": "Final Effluent",
            "sequence_order": 5,
            "parameters": {
                "bod": round(eff_bod, 2),
                "cod": round(eff_cod, 2),
                "tss": round(sec_tss, 2),
                "ph": round(eff_ph, 2),
                "nh4_n": round(eff_nh4, 2),
            },
            "overall_removal_efficiencies": {
                "bod_removal_percent": round((1.0 - eff_bod / (in_bod or 1.0)) * 100, 1),
                "cod_removal_percent": round((1.0 - eff_cod / (in_cod or 1.0)) * 100, 1),
                "tss_removal_percent": round((1.0 - sec_tss / (in_tss or 1.0)) * 100, 1),
                "nh4_removal_percent": round((1.0 - eff_nh4 / (in_nh4 or 1.0)) * 100, 1),
            },
        }

        return "ready", {
            "model_version": self.MODEL_VERSION,
            "configuration_hash": self.configuration_hash,
            "stages": {
                "inlet": stage_inlet,
                "primary_clarifier": stage_primary,
                "biological_aeration": stage_aeration,
                "secondary_clarifier": stage_secondary,
                "final_effluent": stage_effluent,
            },
            "final_effluent_estimates": stage_effluent["parameters"],
        }
