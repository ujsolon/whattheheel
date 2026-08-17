"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import type { VtoHistoryItem } from "@/lib/services/vtoTask";

interface VtoResultViewerProps {
  item: VtoHistoryItem;
  onClose: () => void;
}

interface Point {
  x: number;
  y: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

export function VtoResultViewer({ item, onClose }: VtoResultViewerProps) {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const pinchRef = useRef<{ distance: number; zoom: number } | undefined>(undefined);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, []);

  function rebaseline() {
    const points = [...pointersRef.current.values()];
    if (points.length === 2) {
      pinchRef.current = { distance: Math.max(distance(points[0], points[1]), 1), zoom };
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    rebaseline();
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointersRef.current.values()];
    if (points.length === 2 && pinchRef.current) {
      const baseline = pinchRef.current;
      setZoom(clamp((baseline.zoom * distance(points[0], points[1])) / baseline.distance, MIN_ZOOM, MAX_ZOOM));
    }
  }

  function finishPointer(event: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pinchRef.current = undefined;
    rebaseline();
  }

  function stopPropagation(event: ReactMouseEvent) {
    event.stopPropagation();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Full view: ${item.trendLabel}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink p-4"
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="absolute right-4 top-4 grid h-11 w-11 place-items-center border-[3px] border-ink bg-lime text-xl font-black text-ink focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
      >
        &times;
      </button>

      <div
        data-testid="vto-viewer-stage"
        onClick={stopPropagation}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        className="max-h-[70vh] max-w-full overflow-auto"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.resultUrl}
          alt={`Your past try-on: ${item.trendLabel}`}
          style={{ transform: `scale(${zoom})` }}
          className="max-h-[70vh] max-w-full object-contain transition-transform"
        />
      </div>

      <div onClick={stopPropagation} className="flex items-center gap-2 text-white">
        <button
          type="button"
          onClick={() => setZoom((current) => clamp(current - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM))}
          aria-label="Zoom out"
          className="grid h-11 w-11 place-items-center border-[3px] border-ink bg-surface-muted font-black focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
        >
          &minus;
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.1}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          aria-label={`Zoom: ${zoom.toFixed(2)}`}
          className="w-40 accent-lime"
        />
        <button
          type="button"
          onClick={() => setZoom((current) => clamp(current + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM))}
          aria-label="Zoom in"
          className="grid h-11 w-11 place-items-center border-[3px] border-ink bg-surface-muted font-black focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
        >
          +
        </button>
      </div>
    </div>
  );
}
