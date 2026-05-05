import React from "react";

export default function FloatingActionButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={(event) => event.stopPropagation()}
      className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/10 bg-gradient-to-br from-[#ff4d6d] via-[#ff2f6d] to-[#d02b5a] p-3 text-white shadow-[0_18px_40px_rgba(255,77,109,0.3)] transition duration-200 hover:scale-105 focus:outline-none"
      aria-label="Add clip"
    >
      <span className="text-2xl leading-none">+</span>
    </button>
  );
}
