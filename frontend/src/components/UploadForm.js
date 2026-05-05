import React from "react";

export default function UploadForm({ file, onPickFile, onAnalyze, loading }) {
  return (
    <div className="upload-card">
      <div className="upload-title">Video Tampering Detection</div>

      <div className="upload-sub">
        Upload a video and we'll show tampered time ranges on a timeline
      </div>

      <div className="upload-row">
        <label className="pick-btn">
          <input
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
            disabled={loading}
          />
          {file ? "Change Video" : "Choose Video"}
        </label>

        <div className="meta">
          {file
            ? `${file.name} (${Math.round(file.size / 1024 / 1024)} MB)`
            : "No file selected"}
        </div>

        <button
          className="analyze-btn"
          onClick={onAnalyze}
          disabled={!file || loading}
        >
          {loading ? "Processing…" : "Analyze"}
        </button>
      </div>
    </div>
  );
}