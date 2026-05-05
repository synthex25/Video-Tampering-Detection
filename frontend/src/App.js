import React, { useRef, useState } from "react";
import TimelineScroller from "./components/TimelineScroller";
import VideoPlayer from "./components/VideoPlayer.jsx";
import FrameTimeline from "./components/FrameTimeline.jsx";

const API = process.env.REACT_APP_API_URL || "http://localhost:10000";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatDuration(s) {
  if (!s) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function App() {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const [videoSrc, setVideoSrc] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setUploadError("");
    setResult(null);
    setVideoSrc("");
    setDuration(0);
    setCurrentTime(0);

    try {
      const formData = new FormData();
      formData.append("video", file);

      const response = await fetch(`${API}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");

      setVideoSrc(`${API}${data.preview_video}`);
      setResult(data);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  const handleSeek = (time) => {
    const video = videoRef.current;
    if (!video) return;
    const t = clamp(time, 0, duration || 0);
    video.currentTime = t;
    setCurrentTime(t);
  };

  const tamperedRanges = result?.tampered_time_ranges || [];
  const isTampered = result?.is_tampered;

  return (
    <div className="app-root">
      {/* NAVBAR */}
      <header className="navbar">
        <div className="navbar-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          TamperDetect
        </div>
        <button className="upload-btn-nav" onClick={openFilePicker} disabled={loading}>
          {loading ? <><span className="spinner" /> Analyzing…</> : "+ Upload Video"}
        </button>
      </header>

      {/* MAIN */}
      <main className="main-content">

        {/* LEFT */}
        <div className="left-col">

          {/* Video */}
          <div className="video-card">
            <VideoPlayer
              ref={videoRef}
              src={videoSrc}
              isPlaying={isPlaying}
              currentTime={currentTime}
              onTogglePlay={handleTogglePlay}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              hasVideo={!!videoSrc}
              tamperedRanges={tamperedRanges}
            />
          </div>

          {/* Scrub bar */}
          <div className="timeline-card">
            <TimelineScroller
              duration={duration}
              currentTime={currentTime}
              loading={loading}
              onSeek={handleSeek}
              onUploadClick={openFilePicker}
              tamperedRanges={tamperedRanges}
            />
          </div>

          {/* Frame strip */}
          <div className="frame-card">
            <FrameTimeline
              videoSrc={videoSrc}
              duration={duration}
              currentTime={currentTime}
              tamperedRanges={tamperedRanges}
              onSeek={handleSeek}
              loading={loading}
            />
          </div>

        </div>

        {/* RIGHT — results */}
        <div className="right-col">
          <div className="results-card">
            <p className="results-title">Analysis</p>

            {!result && !loading && (
              <div className="results-empty">
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p>Upload a video to see detection results</p>
              </div>
            )}

            {loading && (
              <div className="results-empty">
                <span className="spinner large" />
                <p>Running analysis…</p>
              </div>
            )}

            {uploadError && <div className="error-box">{uploadError}</div>}

            {result && !loading && (
              <div className="results-body">
                <div className={`verdict-badge ${isTampered ? "tampered" : "authentic"}`}>
                  {isTampered ? "⚠ Tampered" : "✓ Authentic"}
                </div>

                <div className="stat-grid">
                  <div className="stat-item">
                    <span className="stat-label">Confidence</span>
                    <span className="stat-value">
                      {result.confidence != null ? `${(result.confidence * 100).toFixed(1)}%` : "—"}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Duration</span>
                    <span className="stat-value">{formatDuration(result.duration)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">FPS</span>
                    <span className="stat-value">{result.fps ? result.fps.toFixed(2) : "—"}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Frames</span>
                    <span className="stat-value">{result.total_frames ?? "—"}</span>
                  </div>
                </div>

                {tamperedRanges.length > 0 && (
                  <div className="tamper-ranges">
                    <p className="ranges-label">Tampered Segments</p>
                    {tamperedRanges.map((r, i) => (
                      <div key={i} className="range-row" onClick={() => handleSeek(r.start_s)}>
                        <span className="range-dot" />
                        <span>{formatDuration(r.start_s)} – {formatDuration(r.end_s)}</span>
                        <span className="range-seek">Seek →</span>
                      </div>
                    ))}
                  </div>
                )}

                {result.artifacts?.download_url && (
                  <a
                    className="download-btn"
                    href={`${API}${result.artifacts.download_url}`}
                    download
                  >
                    ↓ Download Report
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <input
        type="file"
        accept="video/*"
        ref={fileInputRef}
        className="hidden-input"
        onChange={handleFileChange}
      />
    </div>
  );
}
