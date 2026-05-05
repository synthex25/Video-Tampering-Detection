import os
from dataclasses import dataclass
from typing import Iterable, List, Sequence, Tuple

import numpy as np


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def robust_stats(x: np.ndarray) -> Tuple[float, float]:
    """
    Returns (median, mad_scaled) where mad_scaled approximates std for normal data.
    """
    x = np.asarray(x, dtype=np.float32)
    if x.size == 0:
        return 0.0, 1.0
    med = float(np.median(x))
    mad = float(np.median(np.abs(x - med)))
    mad_scaled = 1.4826 * mad
    return med, max(mad_scaled, 1e-6)


def robust_z(x: np.ndarray) -> np.ndarray:
    med, scale = robust_stats(x)
    return (x - med) / scale


def clip01(x: np.ndarray) -> np.ndarray:
    return np.clip(x, 0.0, 1.0)


def z_to_unit_interval(z: np.ndarray, z0: float = 0.0, z1: float = 3.0) -> np.ndarray:
    """
    Maps z-scores to [0, 1] where z<=z0 -> 0 and z>=z1 -> 1.
    """
    z = np.asarray(z, dtype=np.float32)
    return clip01((z - z0) / (z1 - z0))


def group_indices_to_ranges(indices: Sequence[int], fps: float, min_gap_frames: int = 2) -> List[Tuple[int, int]]:
    if not indices:
        return []
    sorted_idx = sorted(set(int(i) for i in indices))
    ranges: List[Tuple[int, int]] = []
    start = prev = sorted_idx[0]
    for idx in sorted_idx[1:]:
        if idx - prev <= min_gap_frames:
            prev = idx
            continue
        ranges.append((start, prev))
        start = prev = idx
    ranges.append((start, prev))
    return ranges


def frames_to_timestamp(frame_index: int, fps: float) -> str:
    if fps <= 0:
        fps = 25.0
    total_seconds = frame_index / fps
    mm = int(total_seconds // 60)
    ss = int(total_seconds % 60)
    return f"{mm:02d}:{ss:02d}"


def frame_to_seconds(frame_index: int, fps: float) -> float:
    if fps <= 0:
        fps = 25.0
    return float(frame_index) / float(fps)


def ranges_to_seconds(ranges: Sequence[Tuple[int, int]], fps: float) -> List[Tuple[float, float]]:
    out: List[Tuple[float, float]] = []
    for a, b in ranges:
        # Treat (a,b) as an inclusive frame-range and convert to a non-zero time interval.
        # End is made exclusive by adding 1 frame so single-frame ranges still render in UI.
        out.append((frame_to_seconds(a, fps), frame_to_seconds(b + 1, fps)))
    return out


def ranges_to_timestamp_strings(ranges: Sequence[Tuple[int, int]], fps: float) -> List[str]:
    out: List[str] = []
    for a, b in ranges:
        out.append(f"{frames_to_timestamp(a, fps)}-{frames_to_timestamp(b, fps)}")
    return out


@dataclass(frozen=True)
class DetectionConfig:
    resize_w: int = 256
    resize_h: int = 256
    flow_params: Tuple[float, int, int, int, int, float, int] = (0.5, 3, 15, 3, 5, 1.2, 0)
    # Component weights for final anomaly score
    w_flow: float = 0.35
    w_texture: float = 0.25
    w_deletion: float = 0.25
    w_interpolation: float = 0.15
    # Decision thresholds
    frame_threshold: float = 0.60  # per-frame anomaly cutoff
    video_tamper_ratio: float = 0.02  # tampered frames fraction to call video tampered
    min_frames: int = 12
