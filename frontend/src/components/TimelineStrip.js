import React, { useEffect, useMemo, useRef, useState } from "react";
import Playhead from "./Playhead";
import TamperMarkers from "./TamperMarkers";
import { formatTime } from "./TimelineBar";

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

export default function TimelineStrip({ duration, currentTime, tamperRanges, thumbnails, loading, onSeek }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);

  const safeDuration = duration > 0 ? duration : 1;

  const thumbItems = useMemo(() => thumbnails || [], [thumbnails]);

  const onPointerDown = (e) => {
    if (!outerRef.current || !innerRef.current) return;
    setDragging(true);
    outerRef.current.setPointerCapture?.(e.pointerId);
    seekFromEvent(e);
  };

  const onPointerMove = (e) => {
    if (!outerRef.current || !innerRef.current) return;
    const t = timeFromEvent(e);
    setHoverTime(t);
    if (dragging) seekFromEvent(e);
  };

  const onPointerUp = () => {
    setDragging(false);
  };

  const timeFromEvent = (e) => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return null;
    const rect = outer.getBoundingClientRect();
    const x = e.clientX - rect.left + outer.scrollLeft;
    const pct = clamp(x / Math.max(inner.scrollWidth, 1), 0, 1);
    return safeDuration * pct;
  };

  const seekFromEvent = (e) => {
    const t = timeFromEvent(e);
    if (t == null) return;
    onSeek?.(t);
  };

  // Ensure playhead stays visible while playing
  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const pct = clamp(currentTime / safeDuration, 0, 1);
    const x = pct * inner.scrollWidth;
    const left = x - outer.scrollLeft;
    const pad = 80;
    if (left < pad) outer.scrollLeft = clamp(x - pad, 0, Math.max(0, inner.scrollWidth - outer.clientWidth));
    else if (left > outer.clientWidth - pad)
      outer.scrollLeft = clamp(x - (outer.clientWidth - pad), 0, Math.max(0, inner.scrollWidth - outer.clientWidth));
  }, [currentTime, safeDuration]);

  return (
    <div style={styles.wrap}>
      <div style={styles.headerRow}>
        <div style={styles.title}>Timeline</div>
        <div style={styles.hint}>{dragging ? "Scrubbing…" : "Drag the white line to seek"}</div>
      </div>

      <div
        ref={outerRef}
        style={styles.outer}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div ref={innerRef} style={styles.inner}>
          {loading ? (
            <div style={styles.loading}>Generating thumbnails…</div>
          ) : (
            thumbItems.map((t, i) => (
              <div
                key={i}
                style={styles.thumb}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.00)")}
              >
                <img src={t.dataUrl} alt={`thumb ${i}`} style={styles.img} draggable={false} />
              </div>
            ))
          )}

          <TamperMarkers duration={safeDuration} ranges={tamperRanges} />
        </div>

        <Playhead duration={safeDuration} currentTime={currentTime} scrollRef={outerRef} contentRef={innerRef} />
      </div>

      <div style={styles.footerRow}>
        <div style={styles.timeHint}>
          {hoverTime != null ? `Cursor: ${formatTime(hoverTime)}` : "Tip: click anywhere to jump"}
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: { marginTop: 12 },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { color: "white", fontWeight: 900, letterSpacing: 0.2 },
  hint: { color: "#9ca3af", fontSize: 12 },
  outer: {
    position: "relative",
    overflowX: "auto",
    overflowY: "hidden",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "linear-gradient(180deg, #0b1220 0%, #060a12 100%)",
    padding: 8,
    cursor: "grab",
    userSelect: "none",
    WebkitOverflowScrolling: "touch",
    overscrollBehavior: "contain",
  },
  inner: {
    position: "relative",
    display: "flex",
    gap: 6,
    paddingBottom: 10,
    width: "max-content",
  },
  thumb: {
    width: 120,
    height: 82,
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 10px 18px rgba(0,0,0,0.35)",
    background: "#000",
    flex: "0 0 auto",
    transition: "transform 120ms ease, filter 120ms ease",
  },
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  loading: {
    color: "#cbd5e1",
    fontWeight: 800,
    padding: "18px 10px",
    minWidth: 420,
  },
  footerRow: { display: "flex", justifyContent: "space-between", marginTop: 8 },
  timeHint: { color: "#9ca3af", fontSize: 12 },
};
