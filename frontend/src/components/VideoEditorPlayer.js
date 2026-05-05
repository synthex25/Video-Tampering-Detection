import React, { useEffect, useMemo, useRef, useState } from "react";
import TimelineStrip from "./TimelineStrip";
import { formatTime } from "./TimelineBar";

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

export default function VideoEditorPlayer({ src, tamperRanges, onDuration }) {
  const videoRef = useRef(null);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnails, setThumbnails] = useState([]);
  const [thumbLoading, setThumbLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const isInTamper = useMemo(() => {
    const t = currentTime;
    for (const r of tamperRanges || []) {
      const a = Number(r.start_s || 0);
      const b = Number(r.end_s || 0);
      if (t >= a && t <= b) return true;
    }
    return false;
  }, [currentTime, tamperRanges]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onMeta = () => {
      const d = v.duration || 0;
      setDuration(d);
      onDuration?.(d);
    };
    const onTime = () => setCurrentTime(v.currentTime || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onErr = () => setLoadError(true);

    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("error", onErr);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("error", onErr);
    };
  }, [onDuration]);

  // Smooth playhead sync via requestAnimationFrame (no laggy timeupdate)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let raf = 0;
    const tick = () => {
      setCurrentTime(v.currentTime || 0);
      raf = window.requestAnimationFrame(tick);
    };
    if (isPlaying) raf = window.requestAnimationFrame(tick);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [isPlaying]);

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) await v.play?.();
    else v.pause?.();
  };

  const seek = (t) => {
    const v = videoRef.current;
    if (!v) return;
    const d = v.duration || duration || 0;
    v.currentTime = clamp(t, 0, d);
  };

  useEffect(() => {
    // Generate thumbnails from the uploaded blob URL (no backend work).
    // This uses a hidden <video> + <canvas> to capture frames at intervals.
    let cancelled = false;
    async function run() {
      if (!src) return;
      setThumbLoading(true);
      setThumbnails([]);
      try {
        const thumbs = await generateThumbnailsCached(src);
        if (!cancelled) setThumbnails(thumbs);
      } catch {
        if (!cancelled) setThumbnails([]);
      } finally {
        if (!cancelled) setThumbLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div style={styles.wrap}>
      <div style={styles.videoFrame(isInTamper)}>
        <div style={styles.gradient} />
        <video
          key={src}
          ref={videoRef}
          playsInline
          preload="metadata"
          controls={false}
          style={styles.video}
          crossOrigin="anonymous"
          onError={() => setLoadError(true)}
        >
          <source src={src} type="video/mp4" />
        </video>
        <button type="button" style={styles.playOverlay} onClick={togglePlay} title="Play / Pause">
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>

      {loadError && (
        <div style={styles.err}>
          This video can’t be played in your browser (codec issue). Export as MP4 (H.264) and retry.
        </div>
      )}

      <div style={styles.timeRow}>
        <div style={styles.timePill}>{formatTime(currentTime)}</div>
        <div style={{ color: "#9ca3af" }}>{formatTime(duration)}</div>
      </div>

      <TimelineStrip
        duration={duration}
        currentTime={currentTime}
        tamperRanges={tamperRanges}
        thumbnails={thumbnails}
        loading={thumbLoading}
        onSeek={seek}
      />
    </div>
  );
}

const THUMB_CACHE = new Map();

async function generateThumbnailsCached(src) {
  if (THUMB_CACHE.has(src)) return THUMB_CACHE.get(src);
  const promise = generateThumbnails(src);
  THUMB_CACHE.set(src, promise);
  return promise;
}

async function generateThumbnails(src) {
  const v = document.createElement("video");
  v.src = src;
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.crossOrigin = "anonymous";

  // Only proceed once the browser confirms it can play the media.
  await once(v, "canplay");
  const duration = v.duration || 0;
  if (!duration || !isFinite(duration)) return [];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const targetW = 120;
  const aspect = (v.videoWidth || 16) / (v.videoHeight || 9);
  canvas.width = targetW;
  canvas.height = Math.round(targetW / aspect);

  // Aim for ~20 thumbs max, spaced by time (roughly 15–20 frames at typical FPS).
  const maxThumbs = 20;
  const count = Math.min(maxThumbs, Math.max(10, Math.round(duration / 1.25)));

  const thumbs = [];
  for (let i = 0; i < count; i++) {
    const t = (duration * i) / Math.max(count - 1, 1);
    v.currentTime = t;
    await once(v, "seeked");
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    thumbs.push({ t, dataUrl: canvas.toDataURL("image/jpeg", 0.65) });
  }

  v.src = "";
  return thumbs;
}

function once(el, event) {
  return new Promise((resolve, reject) => {
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error("media error"));
    };
    const cleanup = () => {
      el.removeEventListener(event, onOk);
      el.removeEventListener("error", onErr);
    };
    el.addEventListener(event, onOk, { once: true });
    el.addEventListener("error", onErr, { once: true });
  });
}

const styles = {
  wrap: { width: "100%" },
  videoFrame: (isTamperedNow) => ({
    position: "relative",
    borderRadius: 18,
    overflow: "hidden",
    border: `3px solid ${isTamperedNow ? "#ef4444" : "#111827"}`,
    background: "#000",
    boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
  }),
  gradient: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.35) 100%)",
    pointerEvents: "none",
  },
  video: { width: "100%", display: "block" },
  playOverlay: {
    position: "absolute",
    right: 14,
    bottom: 14,
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(17,24,39,0.65)",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
    backdropFilter: "blur(10px)",
  },
  timeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  timePill: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#111827",
    color: "white",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 800,
    border: "1px solid rgba(255,255,255,0.08)",
  },
  err: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
    fontWeight: 700,
  },
};
