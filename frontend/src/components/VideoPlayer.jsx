import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const formatTime = (value) => {
  const total = Math.max(0, Number(value) || 0);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const t = Math.floor((total - Math.floor(total)) * 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${t}`;
};

const VideoPlayer = forwardRef(
  ({ src, isPlaying, currentTime, onTogglePlay, onDurationChange, onTimeUpdate, onPlay, onPause, hasVideo, tamperedRanges = [] }, ref) => {
    const localRef = useRef(null);

    useImperativeHandle(ref, () => localRef.current, [localRef]);

    useEffect(() => {
      const video = localRef.current;
      if (!video) return;
      const onMeta = () => onDurationChange?.(video.duration || 0);
      const onTime = () => onTimeUpdate?.(video.currentTime || 0);
      const onP = () => onPlay?.();
      const onPa = () => onPause?.();
      video.addEventListener("loadedmetadata", onMeta);
      video.addEventListener("timeupdate", onTime);
      video.addEventListener("play", onP);
      video.addEventListener("pause", onPa);
      return () => {
        video.removeEventListener("loadedmetadata", onMeta);
        video.removeEventListener("timeupdate", onTime);
        video.removeEventListener("play", onP);
        video.removeEventListener("pause", onPa);
      };
    }, [onDurationChange, onTimeUpdate, onPlay, onPause, src]);

    const isTampered = tamperedRanges.some(
      (r) => currentTime >= r.start_s && currentTime <= r.end_s
    );

    return (
      <div className={`vp-root${isTampered ? " vp-tampered" : ""}`}>
        <video
          ref={localRef}
          src={src}
          playsInline
          preload="metadata"
          className="vp-video"
          controls={false}
        />

        {isTampered && (
          <div className="vp-tamper-overlay">
            <span className="vp-tamper-badge">⚠ Tampered Segment</span>
          </div>
        )}

        {!hasVideo && (
          <div className="vp-placeholder">
            <div className="vp-placeholder-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <p className="vp-placeholder-title">No video loaded</p>
            <p className="vp-placeholder-sub">Upload a video to begin analysis</p>
          </div>
        )}

        <div className="vp-bottom-bar">
          <button className="vp-play-btn" onClick={onTogglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              {isPlaying ? (
                <g>
                  <rect x="6" y="5" width="4" height="14" rx="1.5" />
                  <rect x="14" y="5" width="4" height="14" rx="1.5" />
                </g>
              ) : (
                <path d="M8 5L19 12L8 19V5Z" />
              )}
            </svg>
          </button>
          <span className="vp-time">{formatTime(currentTime)}</span>
        </div>
      </div>
    );
  }
);

export default VideoPlayer;
