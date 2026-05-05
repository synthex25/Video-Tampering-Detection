import json
import os
import shutil
import uuid
from datetime import datetime

from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS

from detection import analyze_video, find_ffmpeg
from utils import DetectionConfig, ensure_dir


def _safe_filename(name: str) -> str:
    name = os.path.basename(name).replace(" ", "_")
    keep = [ch for ch in name if ch.isalnum() or ch in ("_", "-", ".", "(", ")", "[", "]")]
    return "".join(keep) or "upload.mp4"


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    runs_dir = os.path.join(base_dir, "runs")
    uploads_dir = os.path.join(base_dir, "uploads")
    ensure_dir(runs_dir)
    ensure_dir(uploads_dir)

    @app.get("/api/health")
    def health():
        return jsonify({
            "ok": True,
            "ffmpeg_found": bool(find_ffmpeg()),
            "time": datetime.utcnow().isoformat() + "Z",
        })

    @app.post("/api/analyze")
    def analyze():
        if "video" not in request.files:
            return jsonify({"error": "Missing video file"}), 400

        f = request.files["video"]
        if not f.filename:
            return jsonify({"error": "Empty filename"}), 400

        job_id = uuid.uuid4().hex
        job_dir = os.path.join(runs_dir, job_id)
        ensure_dir(job_dir)

        filename = _safe_filename(f.filename)
        video_path = os.path.join(uploads_dir, f"{job_id}_{filename}")
        f.save(video_path)

        try:
            result = analyze_video(video_path=video_path, output_dir=job_dir)
        except Exception as e:
            _cleanup(video_path)
            return jsonify({"error": str(e)}), 500
        finally:
            _cleanup(video_path)

        preview_path = os.path.join(job_dir, "preview_h264.mp4")
        if os.path.exists(preview_path) and os.path.getsize(preview_path) > 0:
            preview_url = f"/api/artifacts/{job_id}/file/preview_h264.mp4"
        else:
            preview_url = None

        result["preview_video"] = preview_url
        result["job_id"] = job_id
        result["artifacts"] = {
            "download_url": f"/api/download/{job_id}",
            "preview_video_url": preview_url,
        }

        with open(os.path.join(job_dir, "result.json"), "w") as fp:
            json.dump(result, fp, indent=2)

        return jsonify(result)

    @app.get("/api/artifacts/<job_id>/file/<path:filename>")
    def artifact_file(job_id: str, filename: str):
        job_dir = os.path.join(runs_dir, job_id)
        if not os.path.isdir(job_dir):
            return jsonify({"error": "Invalid job_id"}), 404
        return send_from_directory(job_dir, filename)

    @app.get("/api/download/<job_id>")
    def download(job_id: str):
        job_dir = os.path.join(runs_dir, job_id)
        if not os.path.isdir(job_dir):
            return jsonify({"error": "Invalid job_id"}), 404
        zip_base = os.path.join(runs_dir, f"{job_id}_artifacts")
        shutil.make_archive(zip_base, "zip", root_dir=job_dir)
        return send_file(
            f"{zip_base}.zip",
            mimetype="application/zip",
            as_attachment=True,
            download_name=f"{job_id}.zip",
        )

    return app


def _cleanup(*paths: str) -> None:
    for p in paths:
        try:
            if os.path.exists(p):
                os.remove(p)
        except Exception:
            pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app = create_app()
    app.run(host="0.0.0.0", port=port, debug=False)
