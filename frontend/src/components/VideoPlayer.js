import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import TimelineBar from "./TimelineBar";

function inAnyRange(t, ranges) {
  for (const r of ranges || []) {
    const a = Number(r.start_s || 0);
    const b = Number(r.end_s || 0);
    if (t >= a && t <= b) return true;
  }
  return false;
}

const VideoPlayer = forwardRef(function VideoPlayer({ src, ranges, onDuration, onTimeUpdate }, ref) {
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const isInTampered = useMemo(() => inAnyRange(currentTime, ranges), [currentTime, ranges]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTime = () => {
      const t = v.currentTime || 0;
      setCurrentTime(t);
      onTimeUpdate?.(t);
    };
    const onMeta = () => {
      const d = v.duration || 0;
      setDuration(d);
      onDuration?.(d);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onErr = () => setLoadError(true);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("error", onErr);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("error", onErr);
    };
  }, [onDuration]);

  const seek = (t) => {
    const v = videoRef.current;
    if (!v) return;
    const next = Math.max(0, Math.min(duration || v.duration || 0, t));
    v.currentTime = next;
    // Update UI immediately while scrubbing (timeupdate may not fire until playback resumes).
    setCurrentTime(next);
    onTimeUpdate?.(next);
  };

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      // Avoid "play() request was interrupted by a call to pause()" crashing the app.
      try {
        await v.play?.();
      } catch {
        // Ignore transient play interruptions (common when seeking/scrubbing).
      }
    } else {
      v.pause?.();
    }
  };

  useImperativeHandle(ref, () => ({ seek }), [duration]);

  return (
    <div>
      <div style={styles.videoWrap(isInTampered)}>
        <video
          key={src}
          ref={videoRef}
          controls={false}
          style={styles.video}
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
          onError={() => setLoadError(true)}
        >
          <source src={src} type="video/mp4" />
        </video>
      </div>
      {loadError && (
        <div style={styles.err}>
          This video format/codec isn’t supported by your browser. Try exporting as MP4 (H.264).
        </div>
      )}
      <div style={styles.controlsRow}>
        <button onClick={togglePlay} style={styles.playBtn}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <div style={styles.timeText}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <TimelineBar duration={duration} currentTime={currentTime} ranges={ranges} onSeek={seek} />
      </div>
    </div>
  );
});

export default VideoPlayer;

function formatTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

const styles = {
  videoWrap: (isTamperedNow) => ({
    borderRadius: 12,
    overflow: "hidden",
    border: `3px solid ${isTamperedNow ? "#ef4444" : "#e5e7eb"}`,
    boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
  }),
  video: {
    width: "100%",
    display: "block",
    background: "#000",
  },
  controlsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 10,
  },
  playBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#111827",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
    minWidth: 92,
  },
  timeText: {
    color: "#6b7280",
    fontSize: 13,
    fontVariantNumeric: "tabular-nums",
  },
  err: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
    fontWeight: 600,
  },
};
