import React, { useEffect, useMemo, useRef, useState } from "react";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const formatTime = (value) => {
  const total = Math.max(0, Number(value) || 0);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const t = Math.floor((total - Math.floor(total)) * 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${t}`;
};

export default function TimelineScroller({ duration, currentTime, onSeek, onUploadClick, loading, tamperedRanges = [] }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);

  const markerCount = useMemo(() => {
    if (!duration) return 0;
    return Math.min(10, Math.max(3, Math.floor(duration / 2)));
  }, [duration]);

  const markers = useMemo(() => {
    if (!duration || markerCount === 0) return [];
    const step = duration / markerCount;
    return Array.from({ length: markerCount + 1 }, (_, i) => Math.min(duration, i * step));
  }, [duration, markerCount]);

  const computeTime = (clientX) => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || !duration) return 0;
    const rect = outer.getBoundingClientRect();
    const x = clientX - rect.left + outer.scrollLeft;
    return clamp(x / Math.max(inner.scrollWidth, 1), 0, 1) * duration;
  };

  const handlePointerDown = (e) => {
    if (!duration) return;
    setIsScrubbing(true);
    outerRef.current?.setPointerCapture?.(e.pointerId);
    onSeek?.(computeTime(e.clientX));
  };

  const handlePointerMove = (e) => {
    if (!duration) return;
    setHoverTime(computeTime(e.clientX));
    if (isScrubbing) onSeek?.(computeTime(e.clientX));
  };

  const handlePointerUp = () => setIsScrubbing(false);

  useEffect(() => {
    const up = () => setIsScrubbing(false);
    document.addEventListener("pointerup", up);
    return () => document.removeEventListener("pointerup", up);
  }, []);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || !duration || isScrubbing) return;
    const target = clamp(
      (currentTime / duration) * inner.scrollWidth - outer.clientWidth / 2,
      0,
      Math.max(0, inner.scrollWidth - outer.clientWidth)
    );
    outer.scrollTo({ left: target, behavior: "smooth" });
  }, [currentTime, duration, isScrubbing]);

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const label = isScrubbing ? "Scrubbing…" : hoverTime != null ? formatTime(hoverTime) : formatTime(currentTime);

  return (
    <div className="tl-root">
      <div className="tl-header">
        <span className="tl-title">Scrub</span>
        
        <button className="tl-upload-btn" onClick={onUploadClick}>+ Upload</button>
      </div>

      <div
        ref={outerRef}
        className="tl-track-outer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: "pan-x" }}
      >
        <div ref={innerRef} className="tl-track-inner">
          <div className="tl-rail" />

          {/* Tampered regions on rail */}
          {duration > 0 && tamperedRanges.map((r, i) => (
            <div
              key={i}
              className="tl-tamper-zone"
              style={{
                left: `calc(16px + ${(r.start_s / duration) * 100}%)`,
                width: `${((r.end_s - r.start_s) / duration) * 100}%`,
              }}
            />
          ))}

          <div className="tl-progress" style={{ width: `${progress}%` }} />

          {duration > 0 && (
            <div className="tl-playhead" style={{ left: `${progress}%` }} />
          )}

          {markers.map((m, i) => (
            <div
              key={i}
              className="tl-marker"
              style={{ left: `${duration ? (m / duration) * 100 : 0}%` }}
            >
              <div className="tl-marker-tick" />
              <span className="tl-marker-label">{formatTime(m)}</span>
            </div>
          ))}

          {!duration && (
            <div className="tl-empty-msg">
              {loading ? "Analyzing video…" : "Upload a video to begin"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
