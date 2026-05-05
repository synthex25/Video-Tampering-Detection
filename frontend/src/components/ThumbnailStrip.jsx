import React from "react";

const formatTime = (value) => {
  const total = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  const tenths = Math.floor((total - Math.floor(total)) * 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
};

export default function ThumbnailStrip({ thumbnails, currentTime }) {
  return (
    <div className="flex items-end gap-3">
      {thumbnails.map((thumb) => {
        const isActive = Math.abs(currentTime - thumb.time) < 0.8;
        return (
          <div
            key={thumb.id}
            className={`relative min-w-[128px] overflow-hidden rounded-[22px] bg-slate-900 shadow-[0_18px_40px_rgba(0,0,0,0.35)] transition duration-200 ${
              isActive ? "scale-105 border border-pink-500/50 shadow-[0_24px_60px_rgba(255,77,109,0.25)]" : "hover:-translate-y-0.5"
            }`}
          >
            <img src={thumb.src} alt={`Frame at ${formatTime(thumb.time)}`} className="h-32 w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 to-transparent px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-300/80">Frame</div>
              <div className="mt-1 text-sm font-semibold text-white">{formatTime(thumb.time)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
