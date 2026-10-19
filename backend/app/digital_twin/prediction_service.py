"""AquaTrust AI — Evidence-Gated Water Quality Estimation & Projection Service.

Provides steady-state effluent water quality estimates derived from first-principles
process kinetics, gated strictly by input feature completeness and calibrated against
empirical holdout error bounds.

SCIENTIFIC / METHODOLOGICAL NOTE:
This service computes steady-state kinetic expectations on available influent observations.
It is an algebraic process-kinetic projection engine, NOT an auto-regressive multi-step
machine learning forecasting model (e.g., LSTM/Transformer/ARIMA). Forward uncertainty
intervals reflect empirical held-out error distribution (±1.96 * RMSE) on historical test data.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Any, Optional, Tuple, List
from uuid import UUID, uuid4
from sqlalchemy.orm import Session

from app.db.base import utc_now
from app.models.digital_twin import TwinPrediction, TwinState
from app.digital_twin.repository import TwinRepository
from app.digital_twin.process_model import ProcessModelEngine


class PredictionService:
    """
    Evidence-gated kinetic projection service.
    Exposes projections only when validated paired input features are present;
    otherwise emits explicit 'insufficient_data' status to protect data trust.
    """

    PREDICTOR_VERSION = "aquatrust-predictor-v1.0"
    TARGET_HORIZON_HOURS = 24.0

    # Empirical metrics verified on UCI Water Treatment Plant held-out validation set (last 20%, 96 samples)
    HISTORICAL_METRICS = {
        "dataset": "UCI_Water_Treatment_Plant_HeldOut",
        "evaluation_period": "Temporal Split (Last 20% chronologically, 96 observations)",
        "methodology": "First-principles Monod/CSTR biological process kinetics evaluated on paired influent-effluent",
        "metrics": {
            "bod": {"mae": 7.36, "rmse": 15.61, "unit": "mg/L"},
            "cod": {"mae": 26.08, "rmse": 42.23, "unit": "mg/L"},
            "tss": {"mae": 11.65, "rmse": 17.70, "unit": "mg/L"},
            "ph": {"mae": 0.47, "rmse": 0.50, "unit": "pH units"},
        },
    }

    def __init__(self, db: Session, process_engine: Optional[ProcessModelEngine] = None):
        self.db = db
        self.repo = TwinRepository(db)
        self.process_engine = process_engine or ProcessModelEngine()

    def generate_prediction(
        self,
        facility_id: UUID,
        horizon_hours: float = 24.0,
    ) -> TwinPrediction:
        """
        Generates a forward water-quality prediction from latest facility virtual state.
        If essential influent features are missing, persists an 'insufficient_data' record.
        """
        latest_state = self.repo.get_latest_state(facility_id)
        if not latest_state:
            from app.digital_twin.state_updater import StateUpdater
            updater = StateUpdater(self.db, self.process_engine)
            latest_state = updater.initialize_state(facility_id)
            self.db.commit()

        base_obs = dict(latest_state.latest_observations or {})
        required_features = ["bod", "cod", "tss", "ph"]
        missing_features = [
            f for f in required_features
            if f not in base_obs or base_obs[f].get("value") is None
        ]

        if missing_features:
            # Emit explicit insufficient_data status per Section 10 & 12
            prediction = TwinPrediction(
                prediction_id=uuid4(),
                facility_id=facility_id,
                base_state_version=latest_state.state_version,
                model_version=self.PREDICTOR_VERSION,
                horizon_hours=Decimal(str(horizon_hours)),
                predicted_values={},
                uncertainty_bounds=None,
                input_features={
                    "available": list(base_obs.keys()),
                    "missing": missing_features,
                    "reason": "Missing required influent water quality features for forward prediction",
                },
                status="insufficient_data",
                created_at=utc_now(),
            )
            return self.repo.save_prediction(prediction)

        # Features available: compute forward expectation using process kinetics + historical bias
        influent_inputs = {k: float(base_obs[k]["value"]) for k in required_features}
        if "nh4_n" in base_obs and base_obs["nh4_n"].get("value") is not None:
            influent_inputs["nh4_n"] = float(base_obs["nh4_n"]["value"])

        status, eval_results = self.process_engine.evaluate_stages(influent_inputs)
        eff_estimates = eval_results.get("final_effluent_estimates", {})

        # Compute uncertainty bounds from historical RMSE
        predicted_values = {}
        uncertainty_bounds = {}

        for p, est_val in eff_estimates.items():
            rmse = self.HISTORICAL_METRICS["metrics"].get(p, {}).get("rmse", est_val * 0.1)
            predicted_values[p] = {
                "value": round(est_val, 2),
                "unit": "pH units" if p == "ph" else "mg/L",
                "horizon_hours": horizon_hours,
                "data_origin": "predicted",
            }
            uncertainty_bounds[p] = {
                "lower_bound": round(max(0.0, est_val - (1.96 * rmse)), 2),
                "upper_bound": round(est_val + (1.96 * rmse), 2),
                "confidence_level": 0.95,
                "model_rmse": rmse,
            }

        prediction = TwinPrediction(
            prediction_id=uuid4(),
            facility_id=facility_id,
            base_state_version=latest_state.state_version,
            model_version=self.PREDICTOR_VERSION,
            horizon_hours=Decimal(str(horizon_hours)),
            predicted_values=predicted_values,
            uncertainty_bounds=uncertainty_bounds,
            input_features=influent_inputs,
            status="ready",
            created_at=utc_now(),
        )
        return self.repo.save_prediction(prediction)

    def evaluate_heldout_dataset(
        self,
        dataset_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates forward effluent quality model against held-out test split of empirical data.
        Prevents data leakage by strictly evaluating on chronologically later held-out records.
        """
        import os
        import pandas as pd
        import numpy as np

        if not dataset_path:
            candidates = [
                "datasets/processed/DATASET_01_UCI_WATER_TREATMENT/uci_water_treatment_processed.csv",
                "../datasets/processed/DATASET_01_UCI_WATER_TREATMENT/uci_water_treatment_processed.csv",
                os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../datasets/processed/DATASET_01_UCI_WATER_TREATMENT/uci_water_treatment_processed.csv")),
            ]
            for c in candidates:
                if os.path.exists(c):
                    dataset_path = c
                    break

        if not dataset_path or not os.path.exists(dataset_path):
            return {
                "status": "dataset_not_found",
                "message": "Empirical UCI dataset not found at expected path.",
                "historical_metrics": self.HISTORICAL_METRICS,
            }

        df = pd.read_csv(dataset_path)
        cols = {
            "in_bod": "DBO-E", "in_cod": "DQO-E", "in_tss": "SS-E", "in_ph": "PH-E",
            "out_bod": "DBO-S", "out_cod": "DQO-S", "out_tss": "SS-S", "out_ph": "PH-S",
        }
        clean_df = df.dropna(subset=list(cols.values())).copy()
        for k, col in cols.items():
            clean_df[col] = pd.to_numeric(clean_df[col], errors="coerce")
        clean_df = clean_df.dropna(subset=list(cols.values()))

        # Chronological temporal holdout (last 20%)
        n = len(clean_df)
        split_idx = int(n * 0.8)
        test_df = clean_df.iloc[split_idx:]

        errors = {"bod": [], "cod": [], "tss": [], "ph": []}

        for _, row in test_df.iterrows():
            influent = {
                "bod": float(row["DBO-E"]),
                "cod": float(row["DQO-E"]),
                "tss": float(row["SS-E"]),
                "ph": float(row["PH-E"]),
            }
            status, res = self.process_engine.evaluate_stages(influent)
            if status == "ready":
                eff = res["final_effluent_estimates"]
                errors["bod"].append(float(eff["bod"]) - float(row["DBO-S"]))
                errors["cod"].append(float(eff["cod"]) - float(row["DQO-S"]))
                errors["tss"].append(float(eff["tss"]) - float(row["SS-S"]))
                errors["ph"].append(float(eff["ph"]) - float(row["PH-S"]))

        metrics = {}
        for p in ["bod", "cod", "tss", "ph"]:
            err_arr = np.array(errors[p])
            mae = float(np.mean(np.abs(err_arr))) if len(err_arr) > 0 else 0.0
            rmse = float(np.sqrt(np.mean(err_arr ** 2))) if len(err_arr) > 0 else 0.0
            metrics[p] = {
                "mae": round(mae, 2),
                "rmse": round(rmse, 2),
                "unit": "mg/L" if p != "ph" else "pH units",
                "samples_evaluated": len(err_arr),
            }

        eval_summary = {
            "status": "evaluated",
            "dataset": "UCI_Water_Treatment_Plant_Processed",
            "split": f"Temporal Holdout (Last 20%, {len(test_df)} observations)",
            "metrics": metrics,
            "evaluated_at": utc_now().isoformat(),
        }

        existing = self.repo.get_model_version(
            "AquaTrust Wastewater Process Kinetics",
            self.process_engine.MODEL_VERSION,
        )
        if existing:
            existing.validation_metrics = eval_summary
            self.db.commit()

        return eval_summary
