import React from "react";

const formatTimestamp = (value) => {
  const total = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  const tenths = Math.floor((total - Math.floor(total)) * 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
};

export default function ClipThumbnail({ thumbnail, isActive }) {
  const gradient = `linear-gradient(180deg, hsl(${thumbnail.hue}, 85%, 28%), hsl(${thumbnail.hue + 12}, 70%, 10%))`;
  return (
    <div
      className={`relative min-w-[104px] flex-shrink-0 overflow-hidden rounded-[22px] border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.35)] transition duration-200 ${
        isActive ? "scale-105 border-pink-500/80 shadow-[0_28px_60px_rgba(255,77,109,0.22)]" : "hover:-translate-y-0.5"
      }`}
      style={{ backgroundImage: gradient }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_45%)]" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/95 to-transparent px-3 py-2">
        <div className="text-[11px] uppercase tracking-[0.3em] text-slate-300/80">Clip</div>
        <div className="mt-1 text-sm font-semibold text-white">{thumbnail.label}</div>
      </div>
      <div className="absolute right-3 top-3 rounded-full bg-slate-950/75 px-2 py-1 text-[11px] font-semibold text-slate-200">
        {formatTimestamp(thumbnail.time)}
      </div>
    </div>
  );
}
