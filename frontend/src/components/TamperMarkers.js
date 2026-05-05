import React, { useMemo } from "react";

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

export default function TamperMarkers({ duration, ranges }) {
  const safeDuration = duration > 0 ? duration : 1;

  const segs = useMemo(() => {
    const out = (ranges || [])
      .map((r) => ({
        start: clamp(Number(r.start_s || 0), 0, safeDuration),
        end: clamp(Number(r.end_s || 0), 0, safeDuration),
      }))
      .filter((r) => r.end > r.start)
      .sort((a, b) => a.start - b.start);

    // Merge small gaps for cleaner UX
    const merged = [];
    for (const s of out) {
      const last = merged[merged.length - 1];
      if (!last) merged.push(s);
      else if (s.start - last.end <= 0.2) last.end = Math.max(last.end, s.end);
      else merged.push(s);
    }
    return merged;
  }, [ranges, safeDuration]);

  return (
    <>
      <style>
        {`
          @keyframes tamperPulse {
            0% { transform: translateY(0); opacity: 0.85; }
            50% { transform: translateY(-1px); opacity: 1; }
            100% { transform: translateY(0); opacity: 0.85; }
          }
        `}
      </style>
      <div style={styles.layer}>
        {segs.map((s, i) => {
          const left = (s.start / safeDuration) * 100;
          const width = ((s.end - s.start) / safeDuration) * 100;
          return (
            <React.Fragment key={i}>
              <div style={{ ...styles.bar, left: `${left}%`, width: `${width}%` }} />
              <div style={{ ...styles.tri, left: `${left}%` }} />
              <div style={{ ...styles.tri, left: `${left + width}%` }} />
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
}

const styles = {
  layer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 6,
    height: 18,
    pointerEvents: "none",
  },
  bar: {
    position: "absolute",
    top: 6,
    height: 8,
    background: "linear-gradient(90deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95))",
    borderRadius: 999,
    boxShadow: "0 0 0 1px rgba(0,0,0,0.25), 0 8px 16px rgba(239,68,68,0.18)",
    animation: "tamperPulse 1.4s ease-in-out infinite",
  },
  tri: {
    position: "absolute",
    top: 0,
    width: 0,
    height: 0,
    transform: "translateX(-6px)",
    borderLeft: "6px solid transparent",
    borderRight: "6px solid transparent",
    borderTop: "10px solid rgba(239,68,68,0.98)",
    filter: "drop-shadow(0 6px 10px rgba(239,68,68,0.18))",
    animation: "tamperPulse 1.4s ease-in-out infinite",
  },
};
