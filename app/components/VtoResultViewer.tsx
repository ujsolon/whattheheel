"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
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

const FOCUSABLE_SELECTOR = 'button, input, [href], [tabindex]:not([tabindex="-1"])';

export function VtoResultViewer({ item, onClose }: VtoResultViewerProps) {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [activePointerCount, setActivePointerCount] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const pinchRef = useRef<{ distance: number; zoom: number } | undefined>(undefined);
  const lastPanPointRef = useRef<Point | undefined>(undefined);
  const gestureMovedRef = useRef(false);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
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

  function setZoomClamped(next: number) {
    const clamped = clamp(next, MIN_ZOOM, MAX_ZOOM);
    setZoom(clamped);
    if (clamped <= MIN_ZOOM) setPan({ x: 0, y: 0 });
  }

  function rebaseline() {
    const points = [...pointersRef.current.values()];
    if (points.length === 1) {
      lastPanPointRef.current = points[0];
    }
    if (points.length === 2) {
      pinchRef.current = { distance: Math.max(distance(points[0], points[1]), 1), zoom };
      lastPanPointRef.current = undefined;
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gestureMovedRef.current = false;
    setActivePointerCount(pointersRef.current.size);
    rebaseline();
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gestureMovedRef.current = true;
    const points = [...pointersRef.current.values()];

    if (points.length === 1 && zoom > MIN_ZOOM && lastPanPointRef.current) {
      const deltaX = points[0].x - lastPanPointRef.current.x;
      const deltaY = points[0].y - lastPanPointRef.current.y;
      setPan((current) => ({ x: current.x + deltaX, y: current.y + deltaY }));
      lastPanPointRef.current = points[0];
    } else if (points.length === 2 && pinchRef.current) {
      const baseline = pinchRef.current;
      setZoomClamped((baseline.zoom * distance(points[0], points[1])) / baseline.distance);
    }
  }

  function finishPointer(event: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pinchRef.current = undefined;
    setActivePointerCount(pointersRef.current.size);
    rebaseline();
  }

  function stopPropagation(event: ReactMouseEvent) {
    event.stopPropagation();
  }

  function handleBackdropClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    // A pinch/pan that starts on the stage and releases over the backdrop
    // resolves its `click` target to their common ancestor (this root),
    // which is indistinguishable from a plain backdrop tap by target alone —
    // gestureMovedRef is what tells them apart.
    if (gestureMovedRef.current) {
      gestureMovedRef.current = false;
      return;
    }
    onClose();
  }

  function handleZoomChange(event: ChangeEvent<HTMLInputElement>) {
    const next = Number(event.target.value);
    if (Number.isNaN(next)) return;
    setZoomClamped(next);
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Full view: ${item.trendLabel}`}
      onClick={handleBackdropClick}
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
        onLostPointerCapture={finishPointer}
        className="relative max-h-[70vh] max-w-full touch-none overflow-hidden"
      >
        {imageFailed ? (
          <p className="p-8 text-center text-sm text-white">Image unavailable</p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.resultUrl}
            alt={`Your past try-on: ${item.trendLabel}`}
            onError={() => setImageFailed(true)}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            className={`max-h-[70vh] max-w-full object-contain ${activePointerCount === 0 ? "transition-transform" : ""}`}
          />
        )}
      </div>

      <div onClick={stopPropagation} className="flex flex-col items-center gap-1 text-white">
        <label htmlFor="vto-zoom" className="text-xs font-bold">
          Zoom: {zoom.toFixed(2)}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoomClamped(zoom - ZOOM_STEP)}
            aria-label="Zoom out"
            className="grid h-11 w-11 place-items-center border-[3px] border-ink bg-surface-muted font-black focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            &minus;
          </button>
          <input
            id="vto-zoom"
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={handleZoomChange}
            className="min-h-11 w-40 accent-lime focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
          />
          <button
            type="button"
            onClick={() => setZoomClamped(zoom + ZOOM_STEP)}
            aria-label="Zoom in"
            className="grid h-11 w-11 place-items-center border-[3px] border-ink bg-surface-muted font-black focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
