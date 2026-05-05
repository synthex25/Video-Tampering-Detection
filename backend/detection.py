import os
import shutil
import subprocess
from typing import Dict, List, Optional

import cv2
import numpy as np

DEFAULT_FFMPEG_PATHS = ["ffmpeg"]


def find_ffmpeg() -> Optional[str]:
    found = shutil.which("ffmpeg")
    if found:
        return found
    # Local fallback for development only
    local = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ffmpeg.exe")
    if os.path.exists(local):
        return local
    return None


from utils import (
    DetectionConfig,
    ensure_dir,
    group_indices_to_ranges,
    ranges_to_seconds,
    ranges_to_timestamp_strings,
)


def _annotate_frame(frame_bgr: np.ndarray, text: str, is_active: bool) -> np.ndarray:
    if not is_active:
        return frame_bgr
    out = frame_bgr.copy()
    h, w = out.shape[:2]
    cv2.rectangle(out, (0, 0), (w - 1, h - 1), (0, 0, 255), 8)
    cv2.putText(out, text, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
    return out


def analyze_video(video_path: str, output_dir: str, config: Optional[DetectionConfig] = None) -> Dict:

    if config is None:
        config = DetectionConfig()

    if not os.path.exists(video_path):
        raise ValueError("Video not found")

    ensure_dir(output_dir)
    frames_dir = os.path.join(output_dir, "frames")
    ensure_dir(frames_dir)

    # ---------------- PREVIEW ----------------
    preview_path = os.path.join(output_dir, "preview_h264.mp4")
    ffmpeg = find_ffmpeg()
    preview_ok = False
    preview_warning = None

    if ffmpeg:
        try:
            subprocess.run(
                [
                    ffmpeg, "-y", "-i", video_path,
                    "-vcodec", "libx264",
                    "-acodec", "aac",
                    "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart",
                    preview_path,
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            preview_ok = os.path.exists(preview_path) and os.path.getsize(preview_path) > 0
        except Exception as e:
            preview_warning = f"FFmpeg failed: {e}"
    else:
        preview_warning = "FFmpeg not found"

    # ---------------- READ VIDEO ----------------
    cap = cv2.VideoCapture(video_path)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 25.0)

    frames_gray, frames_bgr = [], []

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frames_bgr.append(frame)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.resize(gray, (128, 128))
        frames_gray.append(gray)

    cap.release()

    total_frames = len(frames_gray)
    duration_s = total_frames / fps if fps > 0 else total_frames / 25.0

    if total_frames < 10:
        return {"label": "Too few frames", "is_tampered": False}

    # ---------------- DIFF + FLOW ----------------
    diffs, flows = [], []
    prev = None

    for gray in frames_gray:
        if prev is not None:
            diff = np.mean(np.abs(gray.astype(np.float32) - prev.astype(np.float32)))
            diffs.append(diff)
            flow = cv2.calcOpticalFlowFarneback(prev, gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)
            flows.append(np.mean(np.sqrt(flow[..., 0] ** 2 + flow[..., 1] ** 2)))
        prev = gray

    diffs_a = np.array(diffs)
    flows_a = np.array(flows)

    mean_diff = np.mean(diffs_a)
    std_diff = np.std(diffs_a) + 1e-6
    mean_flow = np.mean(flows_a)
    std_flow = np.std(flows_a) + 1e-6

    diff_thresh = mean_diff + 2 * std_diff
    flow_thresh = mean_flow + 2 * std_flow

    # Real tampering spikes need both a meaningful absolute flow
    # (not just relative) — filters out high-diff static/noise videos
    MIN_FLOW = 0.3

    # ---------------- SPIKES ----------------
    event_indices = []
    for i in range(len(diffs_a)):
        if diffs_a[i] > diff_thresh and flows_a[i] > flow_thresh and flows_a[i] > MIN_FLOW:
            event_indices.append(i)

    grouped_events = []
    if event_indices:
        curr = [event_indices[0]]
        for i in range(1, len(event_indices)):
            if event_indices[i] - event_indices[i - 1] <= 3:
                curr.append(event_indices[i])
            else:
                grouped_events.append(curr)
                curr = [event_indices[i]]
        grouped_events.append(curr)

    # ---------------- LABEL ----------------
    label = "Authentic"
    conf = 0.9

    if grouped_events:
        if len(grouped_events) == 1:
            label = "Frame Deletion"
            conf = 0.96
        else:
            label = "Frame Insertion"
            conf = 0.9

    # ---------------- DUPLICATION ----------------
    duplication_flags = []

    if label == "Authentic":
        dup_thresh = max(0.12, mean_diff * 0.08)
        matches = []

        for i in range(len(frames_gray) - 15):
            for k in range(5, 16):
                diff = np.mean(np.abs(frames_gray[i].astype(np.float32) - frames_gray[i + k].astype(np.float32)))
                if diff < dup_thresh:
                    matches.append((i, i + k))

        if len(matches) > 8:
            label = "Frame Duplication"
            conf = 0.85

            best_match = None
            best_score = float("inf")

            for a, b in matches:
                diff = np.mean(np.abs(frames_gray[a].astype(np.float32) - frames_gray[b].astype(np.float32)))
                if diff < best_score:
                    best_score = diff
                    best_match = (a, b)

            if best_match:
                a, b = best_match
                duplication_flags = [(a + b) // 2]

    # ---------------- INTERPOLATION ----------------
    interpolation_flags = []
    smooth_ratio = np.sum((diffs_a < 1.5) & (flows_a < 1.5)) / len(diffs_a)

    if label == "Authentic":
        diff_var = np.std(diffs_a)
        flow_var = np.std(flows_a)
        # Interpolation signature: unnaturally smooth motion (flow_var near zero)
        # diff_var can be high (pixel changes) but flow is robotically uniform
        if smooth_ratio > 0.93 and flow_var < 0.05:
            label = "Interpolation Tampering"
            conf = 0.88
            interpolation_flags = list(range(total_frames))

    # ---------------- FLAGS ----------------
    deletion_flags = [grouped_events[0][0]] if label == "Frame Deletion" else []
    insertion_flags = [g[0] for g in grouped_events] if label == "Frame Insertion" else []

    # ---------------- BEST TAMPERED FRAME ----------------
    if label == "Authentic":
        tampered_frames = []
    else:
        all_flags = (
            set(deletion_flags)
            | set(insertion_flags)
            | set(duplication_flags)
            | set(interpolation_flags)
        )

        if all_flags:
            best_frame = max(
                (i for i in all_flags if i < len(diffs_a) and i < len(flows_a)),
                key=lambda i: diffs_a[i] + flows_a[i],
                default=None,
            )
            tampered_frames = [best_frame] if best_frame is not None else []
        else:
            tampered_frames = []

    is_tampered = len(tampered_frames) > 0

    # ---------------- TIME RANGES ----------------
    tampered_ranges = group_indices_to_ranges(tampered_frames, fps=fps)
    tampered_timestamps = ranges_to_timestamp_strings(tampered_ranges, fps=fps)
    tampered_ranges_s = ranges_to_seconds(tampered_ranges, fps=fps)

    tampered_time_ranges = []
    for (a, b) in tampered_ranges_s:
        if b - a < 0.5:
            b = a + 0.8
        tampered_time_ranges.append({"start_s": float(a), "end_s": float(b)})

    # ---------------- ANNOTATED VIDEO ----------------
    if frames_bgr:
        tampered_set = set(tampered_frames)
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out_path = os.path.join(output_dir, "annotated.mp4")
        vw = None
        for frame_idx, bgr in enumerate(frames_bgr):
            is_bad = frame_idx in tampered_set
            out_bgr = _annotate_frame(bgr, label if is_bad else "", is_bad)
            if vw is None:
                h, w = out_bgr.shape[:2]
                vw = cv2.VideoWriter(out_path, fourcc, fps, (w, h))
            vw.write(out_bgr)
            if is_bad:
                cv2.imwrite(os.path.join(frames_dir, f"frame_{frame_idx:06d}.jpg"), out_bgr)
        if vw is not None:
            vw.release()

    return {
        "is_tampered": is_tampered,
        "tampered_frame_indices": tampered_frames,
        "tampered_time_ranges": tampered_time_ranges,
        "tampered_timestamps": tampered_timestamps,
        "label": label,
        "confidence": round(float(conf), 3),
        "fps": float(fps),
        "duration": float(duration_s),
        "total_frames": int(total_frames),
        "components": {
            "preview_ok": preview_ok,
            "preview_warning": preview_warning,
        },
    }
