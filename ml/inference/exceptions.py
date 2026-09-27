"""
AquaTrust AI — AI Inference Engine Exceptions
Defines explicit, controlled exceptions for the anomaly detection runtime.
"""

class InferenceEngineError(Exception):
    """Base exception for all AI anomaly inference errors."""
    pass


class UnsupportedParameterError(InferenceEngineError):
    """Raised when an anomaly prediction is requested for an unsupported or unmodeled parameter."""
    def __init__(self, parameter: str, supported_parameters: list):
        self.parameter = parameter
        self.supported_parameters = supported_parameters
        super().__init__(
            f"Parameter '{parameter}' is not supported for anomaly detection. "
            f"Supported parameters: {supported_parameters}"
        )


class InvalidReadingError(InferenceEngineError):
    """Raised when an incoming measurement payload fails validation contracts."""
    pass


class InvalidUnitError(InvalidReadingError):
    """Raised when a measurement specifies an incompatible unit."""
    def __init__(self, parameter: str, unit: str, expected_units: list):
        self.parameter = parameter
        self.unit = unit
        self.expected_units = expected_units
        super().__init__(
            f"Invalid unit '{unit}' for parameter '{parameter}'. Expected one of: {expected_units}"
        )


class ModelArtifactMissingError(InferenceEngineError):
    """Raised when required serialized model or scaler artifacts cannot be found on disk."""
    pass
