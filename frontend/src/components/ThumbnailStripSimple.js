import React, { useEffect, useMemo, useRef, useState } from "react";

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function formatTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export default function ThumbnailStripSimple({ src, duration, currentTime, onSeek }) {
  const [thumbs, setThumbs] = useState([]);
  const [loading, setLoading] = useState(false);
  const tokenRef = useRef(0);

  const safeDuration = duration > 0 ? duration : 0;

  useEffect(() => {
    if (!src || !safeDuration) return;
    let cancelled = false;
    const token = ++tokenRef.current;
    setLoading(true);
    setThumbs([]);
    generateThumbnails(src, safeDuration, 12)
      .then((out) => {
        if (cancelled || token !== tokenRef.current) return;
        setThumbs(out);
      })
      .catch(() => {
        if (cancelled || token !== tokenRef.current) return;
        setThumbs([]);
      })
      .finally(() => {
        if (cancelled || token !== tokenRef.current) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [src, safeDuration]);

  const activeId = useMemo(() => {
    if (!thumbs.length) return null;
    let best = thumbs[0].t;
    let bestDist = Math.abs(currentTime - best);
    for (const th of thumbs) {
      const d = Math.abs(currentTime - th.t);
      if (d < bestDist) {
        bestDist = d;
        best = th.t;
      }
    }
    return best;
  }, [thumbs, currentTime]);

  if (!safeDuration) return null;

  return (
    <div style={styles.wrap}>
      <div style={styles.headerRow}>
        <div style={styles.title}>Frames</div>
        <div style={styles.hint}>{loading ? "Generating…" : "Tap a frame to jump"}</div>
      </div>
      <div style={styles.scroller}>
        {thumbs.map((th) => {
          const isActive = activeId != null && Math.abs(th.t - activeId) < 0.001;
          return (
            <button
              key={th.t}
              type="button"
              style={styles.thumbBtn(isActive)}
              onClick={() => onSeek?.(th.t)}
              title={`Jump to ${formatTime(th.t)}`}
            >
              <img alt={`Frame ${formatTime(th.t)}`} src={th.dataUrl} style={styles.img} />
              <div style={styles.time}>{formatTime(th.t)}</div>
            </button>
          );
        })}
        {!loading && thumbs.length === 0 && (
          <div style={styles.empty}>Couldn’t generate thumbnails (codec/CORS). Timeline still works.</div>
        )}
      </div>
    </div>
  );
}

async function generateThumbnails(src, duration, count) {
  const v = document.createElement("video");
  v.src = src;
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.crossOrigin = "anonymous";

  await once(v, "canplay");

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const targetW = 120;
  const aspect = (v.videoWidth || 16) / (v.videoHeight || 9);
  canvas.width = targetW;
  canvas.height = Math.round(targetW / aspect);

  const thumbs = [];
  for (let i = 0; i < count; i++) {
    const t = (duration * i) / Math.max(count - 1, 1);
    v.currentTime = clamp(t, 0, duration);
    await once(v, "seeked");
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    thumbs.push({ t: Number(t.toFixed(2)), dataUrl: canvas.toDataURL("image/jpeg", 0.65) });
  }
  v.src = "";
  return thumbs;
}

function once(el, event) {
  return new Promise((resolve, reject) => {
    const ok = () => {
      cleanup();
      resolve();
    };
    const err = () => {
      cleanup();
      reject(new Error("media error"));
    };
    const cleanup = () => {
      el.removeEventListener(event, ok);
      el.removeEventListener("error", err);
    };
    el.addEventListener(event, ok, { once: true });
    el.addEventListener("error", err, { once: true });
  });
}

const styles = {
  wrap: { marginTop: 12 },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontWeight: 800, color: "#111827" },
  hint: { fontSize: 12, color: "#6b7280" },
  scroller: {
    display: "flex",
    gap: 10,
    overflowX: "auto",
    paddingBottom: 6,
    WebkitOverflowScrolling: "touch",
  },
  thumbBtn: (active) => ({
    border: active ? "2px solid #ef4444" : "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 0,
    background: "#fff",
    cursor: "pointer",
    overflow: "hidden",
    minWidth: 120,
    boxShadow: active ? "0 8px 18px rgba(239,68,68,0.15)" : "0 2px 10px rgba(0,0,0,0.06)",
  }),
  img: { width: 120, height: 70, objectFit: "cover", display: "block", background: "#000" },
  time: { fontSize: 12, fontWeight: 700, padding: "6px 8px", color: "#111827" },
  empty: { color: "#6b7280", fontSize: 13, padding: "8px 2px" },
};

