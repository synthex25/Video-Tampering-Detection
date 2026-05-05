import React, { useMemo } from "react";

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

export default function TimelineBar({ duration, currentTime, ranges, onSeek }) {
  const safeDuration = duration > 0 ? duration : 1;

  const segments = useMemo(() => {
    const out = (ranges || [])
      .map((r) => ({
        start: clamp(Number(r.start_s || 0), 0, safeDuration),
        end: clamp(Number(r.end_s || 0), 0, safeDuration),
      }))
      .filter((r) => r.end > r.start)
      .sort((a, b) => a.start - b.start);

    // Merge tiny gaps (0.2s) to keep it clean for users
    const merged = [];
    for (const seg of out) {
      const last = merged[merged.length - 1];
      if (!last) merged.push(seg);
      else if (seg.start - last.end <= 0.2) last.end = Math.max(last.end, seg.end);
      else merged.push(seg);
    }
    return merged;
  }, [ranges, safeDuration]);

  const progressPct = (currentTime / safeDuration) * 100;

  return (
    <div style={styles.wrap}>
      <div
        style={styles.bar}
        onClick={(e) => onClickBar(e, safeDuration, onSeek)}
        onPointerDown={(e) => startDrag(e, safeDuration, onSeek)}
        onPointerMove={(e) => moveDrag(e, safeDuration, onSeek)}
        onPointerUp={(e) => endDrag(e)}
        onPointerCancel={(e) => endDrag(e)}
      >
        {segments.map((seg, i) => {
          const left = (seg.start / safeDuration) * 100;
          const width = ((seg.end - seg.start) / safeDuration) * 100;
          return (
            <div
              key={i}
              style={{ ...styles.tampered, left: `${left}%`, width: `${width}%` }}
              title={`Tampered: ${formatTime(seg.start)} – ${formatTime(seg.end)}`}
              onClick={(ev) => {
                ev.stopPropagation();
                onSeek(seg.start);
              }}
            />
          );
        })}
        <div style={{ ...styles.playhead, left: `${progressPct}%` }} />
      </div>
      <div style={styles.timeRow}>
        <div>{formatTime(currentTime)}</div>
        <div>{formatTime(safeDuration)}</div>
      </div>
    </div>
  );
}

function onClickBar(e, duration, onSeek) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const pct = clamp(x / rect.width, 0, 1);
  onSeek(duration * pct);
}

function startDrag(e, duration, onSeek) {
  // Enable drag scrubbing anywhere on the bar.
  try {
    e.currentTarget.setPointerCapture?.(e.pointerId);
  } catch {}
  onClickBar(e, duration, onSeek);
}

function moveDrag(e, duration, onSeek) {
  // Only scrub while pointer is pressed.
  if ((e.buttons & 1) !== 1) return;
  onClickBar(e, duration, onSeek);
}

function endDrag(e) {
  try {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  } catch {}
}

export function formatTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

const styles = {
  wrap: { width: "100%" },
  bar: {
    position: "relative",
    height: 14,
    borderRadius: 999,
    background: "#e5e7eb",
    overflow: "hidden",
    cursor: "pointer",
    border: "1px solid #ddd",
  },
  tampered: {
    position: "absolute",
    top: 0,
    bottom: 0,
    background: "#ef4444",
  },
  playhead: {
    position: "absolute",
    top: -3,
    bottom: -3,
    width: 2,
    background: "#111827",
    transform: "translateX(-1px)",
  },
  timeRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "#555",
    marginTop: 6,
  },
};
