import React, { useMemo, useRef, useState } from "react";
import VideoPlayer from "./VideoPlayer";
import ThumbnailStripSimple from "./ThumbnailStripSimple";
import { formatTime } from "./TimelineBar";

export default function Results({ result, videoUrl, backendBase }) {
  const playerRef = useRef(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const ranges = result?.tampered_time_ranges || [];
  const duration = result?.duration || videoDuration || 0;

  // 🔥 FIX: use correct backend field
  const previewVideoUrl = result?.preview_video
    ? backendBase + result.preview_video
    : "";

  const downloadUrl =
    backendBase + (result?.artifacts?.download_url || "");

  const annotatedVideoUrl =
    backendBase + (result?.artifacts?.annotated_video_url || "");

  const prettyRanges = useMemo(() => {
    return (ranges || [])
      .map((r, i) => ({
        key: i,
        start_s: Number(r.start_s || 0),
        end_s: Number(r.end_s || 0),
      }))
      .filter((r) => r.end_s > r.start_s);
  }, [ranges]);

  const jumpTo = (t) => playerRef.current?.seek?.(t);

  return (
    <div>
      <div style={styles.grid}>
        {/* VIDEO PANEL */}
        <div style={styles.panel}>
          <h3 style={styles.h3}>Video</h3>

          {previewVideoUrl ? (
            <>
              <VideoPlayer
                ref={playerRef}
                src={previewVideoUrl}   // 🔥 ALWAYS use converted video
                ranges={prettyRanges}
                onDuration={setVideoDuration}
                onTimeUpdate={setCurrentTime}
              />

              <ThumbnailStripSimple
                src={previewVideoUrl}  // 🔥 thumbnails also use converted video
                duration={duration}
                currentTime={currentTime}
                onSeek={jumpTo}
              />
            </>
          ) : (
            <div style={styles.warn}>
              Preview video not available. Conversion may have failed.
            </div>
          )}
        </div>

        {/* RESULT PANEL */}
        <div style={styles.panel}>
          <h3 style={styles.h3}>Result</h3>

          <div style={styles.badge(result?.is_tampered)}>
            {result?.is_tampered
              ? "Tampered Video Detected"
              : "No Tampering Detected"}
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ color: "#6b7280" }}>
              {result?.label || ""}
            </div>

            <div style={{ marginTop: 6, color: "#6b7280" }}>
              Duration: {formatTime(duration)}
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            {downloadUrl && (
              <a
                href={downloadUrl}
                style={styles.linkButton}
                target="_blank"
                rel="noreferrer"
              >
                Download results
              </a>
            )}

            {annotatedVideoUrl && (
              <a
                href={annotatedVideoUrl}
                style={styles.linkButtonAlt}
                target="_blank"
                rel="noreferrer"
              >
                View annotated video
              </a>
            )}
          </div>
        </div>
      </div>

      {/* TAMPERING SECTION */}
      <div style={styles.panel}>
        <h3 style={styles.h3}>Tampering Detected At</h3>

        {prettyRanges.length ? (
          <ul style={{ marginTop: 8 }}>
            {prettyRanges.map((r) => (
              <li key={r.key} style={{ marginBottom: 8 }}>
                <button
                  style={styles.timePillBtn}
                  onClick={() => jumpTo(r.start_s)}
                >
                  {formatTime(r.start_s)} – {formatTime(r.end_s)}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div style={styles.muted}>
            No tampering intervals found
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 12,
  },
  panel: {
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 12,
    background: "#fafafa",
    marginBottom: 12,
  },
  h3: { margin: "4px 0 10px 0" },

  muted: { color: "#666" },

  badge: (isBad) => ({
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 800,
    color: isBad ? "#7f1d1d" : "#065f46",
    background: isBad ? "#fee2e2" : "#d1fae5",
    border: `1px solid ${isBad ? "#fecaca" : "#a7f3d0"}`,
  }),

  linkButton: {
    padding: "10px 12px",
    borderRadius: 10,
    background: "#0b5fff",
    color: "white",
    textDecoration: "none",
    fontWeight: 700,
  },

  linkButtonAlt: {
    padding: "10px 12px",
    borderRadius: 10,
    background: "#111827",
    color: "white",
    textDecoration: "none",
    fontWeight: 700,
  },

  timePillBtn: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#fee2e2",
    border: "1px solid #fecaca",
    color: "#7f1d1d",
    fontWeight: 800,
    cursor: "pointer",
  },

  warn: {
    padding: 10,
    borderRadius: 10,
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
    fontWeight: 700,
  },
};