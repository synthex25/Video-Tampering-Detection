import React from "react";

export default function FloatingUploadButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={(event) => event.stopPropagation()}
      className="absolute left-4 bottom-4 z-20 inline-flex h-14 min-w-[120px] items-center justify-center gap-2 rounded-full bg-slate-950 border border-slate-300/20 px-4 text-sm font-semibold text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)] transition duration-200 hover:scale-[1.03] focus:outline-none"
      aria-label="Upload video"
    >
      <span className="text-[22px] leading-none">+</span>
      <span>Upload</span>
    </button>
  );
}
