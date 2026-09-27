"""
AquaTrust AI — Inference Latency Benchmarker
Measures cold-start, steady-state single-reading, and batch inference latencies in milliseconds.
"""

import time
import joblib
import numpy as np
from typing import Dict, Any, Tuple


class LatencyBenchmarker:
    """Benchmarks production inference latency of Isolation Forest models."""

    @classmethod
    def benchmark_model_latency(
        cls,
        model_path: str,
        n_warmup: int = 50,
        n_single_runs: int = 1000,
        batch_sizes: Tuple = (10, 50, 100)
    ) -> Dict[str, Any]:
        """
        Executes comprehensive latency profiling.
        """
        # 1. Cold-start model load latency
        t0 = time.perf_counter()
        model = joblib.load(model_path)
        t_load = (time.perf_counter() - t0) * 1000.0  # ms

        # Sample vector (4 features)
        sample_1 = np.array([[0.5, -0.1, 0.45, 0.05]], dtype=np.float64)

        # Warmup
        for _ in range(n_warmup):
            _ = model.decision_function(sample_1)

        # 2. Steady-state single-reading latency
        single_latencies = []
        for _ in range(n_single_runs):
            t_start = time.perf_counter()
            _ = model.decision_function(sample_1)
            t_end = time.perf_counter()
            single_latencies.append((t_end - t_start) * 1000.0)

        single_arr = np.array(single_latencies)

        # 3. Batch latencies
        batch_results = {}
        for bs in batch_sizes:
            batch_samples = np.repeat(sample_1, bs, axis=0)
            batch_latencies = []
            for _ in range(100):
                t_start = time.perf_counter()
                _ = model.decision_function(batch_samples)
                t_end = time.perf_counter()
                batch_latencies.append((t_end - t_start) * 1000.0)
            b_arr = np.array(batch_latencies)
            batch_results[f"batch_size_{bs}"] = {
                "mean_batch_ms": round(float(np.mean(b_arr)), 4),
                "per_sample_ms": round(float(np.mean(b_arr) / bs), 5),
                "p95_batch_ms": round(float(np.percentile(b_arr, 95)), 4)
            }

        return {
            "cold_start_load_ms": round(t_load, 3),
            "single_reading_latency_ms": {
                "mean": round(float(np.mean(single_arr)), 4),
                "median": round(float(np.median(single_arr)), 4),
                "p95": round(float(np.percentile(single_arr, 95)), 4),
                "p99": round(float(np.percentile(single_arr, 99)), 4),
                "min": round(float(np.min(single_arr)), 4),
                "max": round(float(np.max(single_arr)), 4),
                "n_iterations": n_single_runs
            },
            "batch_latency_benchmarks": batch_results
        }
