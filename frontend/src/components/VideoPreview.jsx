import React, { forwardRef, useEffect, useRef } from "react";

const clampTime = (value) => Math.max(0, Number(value) || 0);
const formatTimestamp = (value) => {
  const total = clampTime(value);
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  const tenths = Math.floor((total - Math.floor(total)) * 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
};

const VideoPreview = forwardRef(({ src, isPlaying, onTogglePlay, onTimeUpdate, onDuration }, ref) => {
  const localRef = useRef(null);

  useEffect(() => {
    const video = localRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => onDuration?.(video.duration || 0);
    const handleTimeUpdate = () => onTimeUpdate?.(video.currentTime || 0);
    const handlePlay = () => onTimeUpdate?.(video.currentTime || 0);

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
    };
  }, [onDuration, onTimeUpdate]);

  React.useImperativeHandle(ref, () => localRef.current, [localRef]);

  return (
    <div className="relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-[0_34px_120px_rgba(0,0,0,0.4)]">
      <div className="relative aspect-[16/9] w-full bg-slate-900">
        <video
          ref={localRef}
          src={src}
          playsInline
          muted
          preload="metadata"
          className="h-full w-full object-cover"
        />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1),_transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/95 to-transparent" />

        <button
          type="button"
          onClick={onTogglePlay}
          className="absolute inset-0 m-auto flex h-full w-full items-center justify-center rounded-[28px] bg-slate-950/10 transition duration-200 hover:bg-slate-950/20 focus:outline-none"
          aria-label={isPlaying ? "Pause video" : "Play video"}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition duration-200 hover:scale-105">
            <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current">
              {isPlaying ? (
                <g>
                  <rect x="6" y="5" width="4" height="14" rx="1.5" />
                  <rect x="14" y="5" width="4" height="14" rx="1.5" />
                </g>
              ) : (
                <path d="M8 5L19 12L8 19V5Z" />
              )}
            </svg>
          </div>
        </button>
      </div>

      <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-sm font-semibold text-slate-100 shadow-lg shadow-black/20 backdrop-blur-sm">
        <span className="block text-xs text-slate-400">Preview</span>
        <span>Playback Studio</span>
      </div>
    </div>
  );
});

export default VideoPreview;
