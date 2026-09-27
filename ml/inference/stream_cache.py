"""
AquaTrust AI — Stream Context Cache
Maintains trailing observation windows per stream to support chronological feature extraction
without synthetic zero or forward-fill imputation.
"""

from collections import deque
from typing import Dict, List, Optional, Tuple, Any
import numpy as np


class StreamContextCache:
    """
    In-memory FIFO buffer maintaining trailing sensor readings per stream key.
    Stream key format: '<facility_id>:<measurement_stage>:<parameter>'
    """

    def __init__(self, max_history_size: int = 10, min_history_required: int = 3):
        self.max_history_size = max(max_history_size, min_history_required)
        self.min_history_required = min_history_required
        self._cache: Dict[str, deque] = {}

    def get_stream_history(self, stream_key: str) -> List[Tuple[str, float]]:
        """Returns ordered list of (timestamp, value) pairs for the given stream."""
        if stream_key not in self._cache:
            return []
        return list(self._cache[stream_key])

    def get_history_length(self, stream_key: str) -> int:
        """Returns the number of historical observations recorded for a stream."""
        if stream_key not in self._cache:
            return 0
        return len(self._cache[stream_key])

    def update(self, stream_key: str, timestamp: str, value: float) -> Tuple[bool, Optional[Dict[str, float]]]:
        """
        Appends a new observation to the stream's sliding window and computes trailing features.

        Returns:
            Tuple of:
            - is_ready (bool): True if history length >= min_history_required, False otherwise.
            - features (dict or None): Dictionary of raw features if ready, otherwise None.
        """
        if stream_key not in self._cache:
            self._cache[stream_key] = deque(maxlen=self.max_history_size)

        buffer = self._cache[stream_key]
        buffer.append((timestamp, float(value)))

        if len(buffer) < self.min_history_required:
            return False, None

        # Extract last 3 readings: [x_{t-2}, x_{t-1}, x_t]
        recent_values = [item[1] for item in list(buffer)[-self.min_history_required:]]
        x_t_minus_2, x_t_minus_1, x_t = recent_values

        delta_1 = x_t - x_t_minus_1
        rolling_mean_3 = float(np.mean(recent_values))
        rolling_std_3 = float(np.std(recent_values, ddof=1))

        features = {
            "value_t": float(x_t),
            "delta_1": float(delta_1),
            "rolling_mean_3": float(rolling_mean_3),
            "rolling_std_3": float(rolling_std_3),
        }

        return True, features

    def peek_features(self, stream_key: str, candidate_value: float) -> Tuple[bool, Optional[Dict[str, float]]]:
        """
        Computes what features would be without mutating the cache buffer.
        """
        if stream_key not in self._cache:
            return False, None

        buffer = self._cache[stream_key]
        if len(buffer) < (self.min_history_required - 1):
            return False, None

        # Take last (min_history_required - 1) items and append candidate_value
        sub_values = [item[1] for item in list(buffer)[-(self.min_history_required - 1):]]
        recent_values = sub_values + [float(candidate_value)]

        x_t_minus_1 = recent_values[-2]
        x_t = recent_values[-1]

        delta_1 = x_t - x_t_minus_1
        rolling_mean_3 = float(np.mean(recent_values))
        rolling_std_3 = float(np.std(recent_values, ddof=1))

        features = {
            "value_t": float(x_t),
            "delta_1": float(delta_1),
            "rolling_mean_3": float(rolling_mean_3),
            "rolling_std_3": float(rolling_std_3),
        }

        return True, features

    def clear(self, stream_key: Optional[str] = None):
        """Clears cache for a specific stream or all streams."""
        if stream_key is not None:
            if stream_key in self._cache:
                del self._cache[stream_key]
        else:
            self._cache.clear()

    def count_streams(self) -> int:
        """Returns count of actively tracked streams."""
        return len(self._cache)
