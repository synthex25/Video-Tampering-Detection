import React, { useEffect, useMemo, useRef, useState } from "react";
import ClipThumbnail from "./ClipThumbnail";
import FloatingActionButton from "./FloatingActionButton";

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

const formatTimestamp = (value) => {
  const total = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  const tenths = Math.floor((total - Math.floor(total)) * 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
};

export default function Timeline({ duration, currentTime, thumbnails, onSeek, onAddClip = () => {} }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);

  const safeDuration = duration > 0 ? duration : 30;
  const markerStep = Math.max(1, Math.round(safeDuration / 6));

  const markers = useMemo(() => {
    const steps = Math.ceil(safeDuration / markerStep);
    return Array.from({ length: steps + 1 }, (_, index) => clamp(index * markerStep, 0, safeDuration));
  }, [safeDuration, markerStep]);

  const onPointerDown = (event) => {
    if (!outerRef.current) return;
    setDragging(true);
    outerRef.current.setPointerCapture?.(event.pointerId);
    handleSeekFromEvent(event);
  };

  const onPointerMove = (event) => {
    if (!outerRef.current) return;
    const next = computeTimeFromEvent(event);
    setHoverTime(next);
    if (dragging) handleSeekFromEvent(event);
  };

  const onPointerUp = () => {
    setDragging(false);
  };

  const computeTimeFromEvent = (event) => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return 0;
    const rect = outer.getBoundingClientRect();
    const x = event.clientX - rect.left + outer.scrollLeft;
    const pct = clamp(x / Math.max(inner.scrollWidth, 1), 0, 1);
    return pct * safeDuration;
  };

  const handleSeekFromEvent = (event) => {
    const nextTime = computeTimeFromEvent(event);
    onSeek?.(nextTime);
  };

  useEffect(() => {
    const onRelease = () => setDragging(false);
    document.addEventListener("pointerup", onRelease);
    return () => document.removeEventListener("pointerup", onRelease);
  }, []);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const currentPct = clamp(currentTime / safeDuration, 0, 1);
    const targetX = currentPct * inner.scrollWidth;
    const margin = 120;
    if (targetX < outer.scrollLeft + margin) {
      outer.scrollLeft = clamp(targetX - margin, 0, inner.scrollWidth - outer.clientWidth);
    } else if (targetX > outer.scrollLeft + outer.clientWidth - margin) {
      outer.scrollLeft = clamp(targetX - outer.clientWidth + margin, 0, inner.scrollWidth - outer.clientWidth);
    }
  }, [currentTime, safeDuration]);

  const activeWindow = safeDuration / Math.max(thumbnails.length, 1);

  return (
    <div className="relative mt-4 rounded-[24px] border border-white/10 bg-slate-950/80 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.35)]">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Timeline</div>
          <p className="mt-1 max-w-xl text-sm text-slate-300/90">Drag the playhead or scrub through the thumbnails to preview the current clip.</p>
        </div>
        <div className="rounded-full bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 ring-1 ring-white/10">{dragging ? "Scrubbing…" : `Current frame ${formatTimestamp(currentTime)}`}</div>
      </div>

      <div
        ref={outerRef}
        className="relative overflow-x-auto overflow-y-hidden rounded-[22px] border border-white/10 bg-slate-900/70 px-6 py-5 touch-pan-x scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-950"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHoverTime(null)}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <FloatingActionButton onClick={onAddClip} />

        <div ref={innerRef} className="relative flex items-end gap-4 pb-4 pl-14">
          {thumbnails.map((thumbnail, index) => {
            const isActive = Math.abs(currentTime - thumbnail.time) < activeWindow * 0.75;
            return <ClipThumbnail key={thumbnail.id} thumbnail={thumbnail} isActive={isActive} />;
          })}

          <div className="absolute inset-x-0 bottom-0 h-px bg-white/5" />
          <div className="absolute inset-x-0 bottom-12 h-0.5 bg-white/5" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-5 top-0">
          {markers.map((marker, index) => {
            const percent = (marker / safeDuration) * 100;
            return (
              <div key={marker + index} className="absolute top-0 flex -translate-x-1/2 flex-col items-center text-[11px] text-slate-400/90" style={{ left: `${percent}%` }}>
                <span className="h-2 w-2 rounded-full bg-slate-400/60" />
                <span className="mt-1">{marker === 0 ? "0" : marker}</span>
              </div>
            );
          })}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 right-0">
          <div className="absolute inset-y-0 left-0 right-0">
            <div className="absolute top-0 bottom-0 left-0 right-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.04),_transparent_26%)]" />
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-y-0"
          style={{ left: `${clamp((currentTime / safeDuration) * 100, 0, 100)}%` }}
        >
          <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.5)]" />
          <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-pink-500 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-pink-500/10" style={{ transform: "translateX(-50%)" }}>
            {formatTimestamp(currentTime)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-3xl bg-slate-950/80 px-4 py-3 text-sm text-slate-300 ring-1 ring-white/10">
        <span>{hoverTime != null ? `Hover ${formatTimestamp(hoverTime)}` : `Duration ${formatTimestamp(safeDuration)}`}</span>
        <span className="rounded-full bg-white/5 px-3 py-1 text-slate-200">{thumbnails.length} clips</span>
      </div>
    </div>
  );
}
