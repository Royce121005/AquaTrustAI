"""
AquaTrust AI — Isolation Forest Model Factory
Constructs the frozen baseline Isolation Forest model.
"""

from typing import Dict, Any
from sklearn.ensemble import IsolationForest


class IsolationForestFactory:
    """Factory creating Isolation Forest models with strictly frozen configuration."""

    DEFAULT_CONFIG = {
        "n_estimators": 200,
        "contamination": 0.05,
        "random_state": 42,
        "bootstrap": False,
        "max_samples": "auto",
        "max_features": 1.0
    }

    @classmethod
    def create_model(cls, custom_config: Dict[str, Any] = None) -> IsolationForest:
        """
        Creates an IsolationForest instance configured to frozen baseline standards.
        """
        config = cls.DEFAULT_CONFIG.copy()
        if custom_config:
            config.update(custom_config)
            
        return IsolationForest(
            n_estimators=config["n_estimators"],
            contamination=config["contamination"],
            random_state=config["random_state"],
            bootstrap=config["bootstrap"],
            max_samples=config["max_samples"],
            max_features=config["max_features"]
        )

    @classmethod
    def get_config(cls) -> Dict[str, Any]:
        """Returns the frozen configuration dictionary."""
        return cls.DEFAULT_CONFIG.copy()
