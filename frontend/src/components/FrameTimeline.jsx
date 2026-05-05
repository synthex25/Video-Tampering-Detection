import React, { useEffect, useRef, useState, useCallback } from "react";

const FRAME_WIDTH = 96;
const FRAME_HEIGHT = 54;
const MAX_FRAMES = 60;

function formatTime(value) {
  const total = Math.max(0, Number(value) || 0);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function isInTamperedRange(time, ranges) {
  return ranges.some((r) => time >= r.start_s && time <= r.end_s);
}

export default function FrameTimeline({ videoSrc, duration, currentTime, tamperedRanges = [], onSeek, loading }) {
  const [frames, setFrames] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const stripRef = useRef(null);
  const videoEl = useRef(null);

  // Extract frames whenever videoSrc or duration changes
  useEffect(() => {
    if (!videoSrc || !duration) {
      setFrames([]);
      return;
    }

    let cancelled = false;
    setExtracting(true);
    setFrames([]);

    const count = Math.min(MAX_FRAMES, Math.max(10, Math.floor(duration * 2)));
    const interval = duration / count;
    const canvas = document.createElement("canvas");
    canvas.width = FRAME_WIDTH;
    canvas.height = FRAME_HEIGHT;
    const ctx = canvas.getContext("2d");

    const vid = document.createElement("video");
    vid.src = videoSrc;
    vid.crossOrigin = "anonymous";
    vid.preload = "auto";
    vid.muted = true;
    videoEl.current = vid;

    const captured = [];

    const captureFrame = (index) => {
      return new Promise((resolve) => {
        if (cancelled) return resolve(null);
        const time = index * interval;
        vid.currentTime = Math.min(time, duration - 0.01);
        const onSeeked = () => {
          vid.removeEventListener("seeked", onSeeked);
          try {
            ctx.drawImage(vid, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
            resolve({ time, dataUrl: canvas.toDataURL("image/jpeg", 0.7) });
          } catch {
            resolve({ time, dataUrl: null });
          }
        };
        vid.addEventListener("seeked", onSeeked);
      });
    };

    const run = async () => {
      await new Promise((res) => {
        vid.addEventListener("loadedmetadata", res, { once: true });
        vid.load();
      });

      for (let i = 0; i < count; i++) {
        if (cancelled) break;
        const frame = await captureFrame(i);
        if (frame && !cancelled) {
          captured.push(frame);
          setFrames([...captured]);
        }
      }
      if (!cancelled) setExtracting(false);
    };

    run();

    return () => {
      cancelled = true;
      vid.src = "";
    };
  }, [videoSrc, duration]);

  // Auto-scroll strip to keep playhead visible
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || !duration || frames.length === 0) return;
    const pct = currentTime / duration;
    const totalWidth = frames.length * (FRAME_WIDTH + 4);
    const target = pct * totalWidth - strip.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [currentTime, duration, frames.length]);

  const handleClick = useCallback((e) => {
    const strip = stripRef.current;
    if (!strip || !duration || frames.length === 0) return;
    const rect = strip.getBoundingClientRect();
    const x = e.clientX - rect.left + strip.scrollLeft;
    const totalWidth = frames.length * (FRAME_WIDTH + 4);
    const pct = Math.max(0, Math.min(1, x / totalWidth));
    onSeek?.(pct * duration);
  }, [duration, frames.length, onSeek]);

  const playheadPct = duration ? currentTime / duration : 0;
  const totalWidth = frames.length * (FRAME_WIDTH + 4);

  return (
    <div className="ft-root">
      <div className="ft-header">
        <span className="ft-title">Frames</span>
        {extracting && <span className="ft-extracting"><span className="spinner" /> Extracting frames…</span>}
        {!extracting && frames.length > 0 && (
          <span className="ft-count">{frames.length} frames · click to seek</span>
        )}
        {loading && <span className="ft-extracting"><span className="spinner" /> Analyzing…</span>}
      </div>

      <div className="ft-strip-wrap">
        <div
          ref={stripRef}
          className="ft-strip"
          onClick={handleClick}
          style={{ cursor: frames.length ? "pointer" : "default" }}
        >
          {frames.length === 0 && !extracting && (
            <div className="ft-empty">
              {loading ? "Waiting for analysis…" : "Upload a video to see frames"}
            </div>
          )}

          {frames.map((f, i) => {
            const tampered = isInTamperedRange(f.time, tamperedRanges);
            return (
              <div
                key={i}
                className={`ft-frame${tampered ? " ft-frame-tampered" : ""}`}
                title={`${formatTime(f.time)}${tampered ? " · Tampered" : ""}`}
              >
                {f.dataUrl ? (
                  <img src={f.dataUrl} alt={formatTime(f.time)} draggable={false} />
                ) : (
                  <div className="ft-frame-blank" />
                )}
                <span className="ft-frame-time">{formatTime(f.time)}</span>
                {tampered && <div className="ft-frame-tamper-bar" />}
              </div>
            );
          })}

          {/* Playhead needle */}
          {frames.length > 0 && duration > 0 && (
            <div
              className="ft-playhead"
              style={{ left: `${playheadPct * totalWidth}px` }}
            />
          )}
        </div>

        {/* Tampered region overlay on the strip scrollbar area */}
        {frames.length > 0 && duration > 0 && (
          <div className="ft-tamper-map">
            {tamperedRanges.map((r, i) => (
              <div
                key={i}
                className="ft-tamper-region"
                style={{
                  left: `${(r.start_s / duration) * 100}%`,
                  width: `${((r.end_s - r.start_s) / duration) * 100}%`,
                }}
              />
            ))}
            <div
              className="ft-map-playhead"
              style={{ left: `${playheadPct * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
