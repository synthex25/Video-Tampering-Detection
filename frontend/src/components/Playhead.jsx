import React from "react";

const formatTime = (value) => {
  const total = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  const tenths = Math.floor((total - Math.floor(total)) * 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
};

export default function Playhead({ currentTime }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-full w-0">
      <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 rounded-full bg-white/90 shadow-[0_0_18px_rgba(255,255,255,0.45)]" />
      <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-pink-500 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white shadow-lg shadow-pink-500/20">
        {formatTime(currentTime)}
      </div>
    </div>
  );
}
