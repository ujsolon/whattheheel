"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { ChangeEvent, KeyboardEvent, PointerEvent } from "react";
import type { Trend } from "@/lib/data/trends";

interface OverlayCanvasProps {
  trend: Trend;
}

interface Pose {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface Point {
  x: number;
  y: number;
}

const DEFAULT_POSE: Pose = { x: 0, y: 0, scale: 1, rotation: 0 };
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));
const distance = (first: Point, second: Point) =>
  Math.hypot(second.x - first.x, second.y - first.y);

export function OverlayCanvas({ trend }: OverlayCanvasProps) {
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [error, setError] = useState("");
  const [pose, setPose] = useState(DEFAULT_POSE);
  const [hasInteracted, setHasInteracted] = useState(false);
  const activeUrlRef = useRef<string | undefined>(undefined);
  const selectionRef = useRef(0);
  const pointersRef = useRef(new Map<number, Point>());
  const lastDragRef = useRef<Point | undefined>(undefined);
  const pinchRef = useRef<{ distance: number; scale: number } | undefined>(undefined);

  useEffect(
    () => () => {
      selectionRef.current += 1;
      if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);
    },
    [],
  );

  const updatePose = (next: Partial<Pose>, interacted = true) => {
    setPose((current) => {
      const updated = {
        x: clamp(next.x ?? current.x, -45, 45),
        y: clamp(next.y ?? current.y, -45, 45),
        scale: clamp(next.scale ?? current.scale, 0.5, 2),
        rotation: clamp(next.rotation ?? current.rotation, -45, 45),
      };
      if (
        interacted &&
        (updated.x !== current.x ||
          updated.y !== current.y ||
          updated.scale !== current.scale ||
          updated.rotation !== current.rotation)
      ) {
        setHasInteracted(true);
      }
      return updated;
    });
  };

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    const selection = ++selectionRef.current;
    setError("");
    if (file.size === 0 || !file.type.startsWith("image/")) {
      setError("Choose an image file your browser can display.");
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    const decoder = new window.Image();
    decoder.onload = () => {
      if (selection !== selectionRef.current) {
        URL.revokeObjectURL(nextUrl);
        return;
      }
      if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = nextUrl;
      setPhotoUrl(nextUrl);
      setPose(DEFAULT_POSE);
      setHasInteracted(false);
    };
    decoder.onerror = () => {
      URL.revokeObjectURL(nextUrl);
      if (selection === selectionRef.current) {
        setError("Choose an image file your browser can display.");
      }
    };
    decoder.src = nextUrl;
  };

  const rebaseline = () => {
    const points = [...pointersRef.current.values()];
    if (points.length === 1) lastDragRef.current = points[0];
    if (points.length === 2) {
      pinchRef.current = { distance: distance(points[0], points[1]), scale: pose.scale };
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!photoUrl) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    rebaseline();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointersRef.current.values()];
    if (points.length === 1 && lastDragRef.current) {
      const rect = event.currentTarget.getBoundingClientRect();
      const width = rect.width || 1;
      const height = rect.height || 1;
      updatePose({
        x: pose.x + ((points[0].x - lastDragRef.current.x) / width) * 100,
        y: pose.y + ((points[0].y - lastDragRef.current.y) / height) * 100,
      });
      lastDragRef.current = points[0];
    } else if (points.length === 2 && pinchRef.current?.distance) {
      updatePose({
        scale: pinchRef.current.scale * (distance(points[0], points[1]) / pinchRef.current.distance),
      });
    }
  };

  const finishPointer = (event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    lastDragRef.current = undefined;
    pinchRef.current = undefined;
    rebaseline();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!photoUrl || event.target !== event.currentTarget) return;
    const amount = event.shiftKey ? 5 : 2;
    const actions: Record<string, Partial<Pose>> = {
      ArrowLeft: { x: pose.x - amount },
      ArrowRight: { x: pose.x + amount },
      ArrowUp: { y: pose.y - amount },
      ArrowDown: { y: pose.y + amount },
      "+": { scale: pose.scale + 0.05 },
      "=": { scale: pose.scale + 0.05 },
      "-": { scale: pose.scale - 0.05 },
      "[": { rotation: pose.rotation - 15 },
      "]": { rotation: pose.rotation + 15 },
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      updatePose(action);
    }
  };

  return (
    <section className="mx-auto grid w-full min-w-0 max-w-[calc(100vw-2rem)] items-start gap-6 lg:max-w-[61rem] lg:grid-cols-2">
      <div
        role="group"
        aria-label="Shoe overlay stage"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onLostPointerCapture={finishPointer}
        className={`relative aspect-square w-full min-w-0 max-w-full overflow-hidden bg-surface-muted touch-none focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime lg:max-w-[30rem] ${photoUrl ? "border-[3px] border-ink" : "border-[3px] border-dashed border-lime shadow-[4px_4px_0_var(--color-pink)]"}`}
      >
        {photoUrl ? (
          <>
            {/* Blob URLs require a native image element and never leave the browser. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="Your selected foot" className="absolute inset-0 h-full w-full object-cover" />
            <div
              data-testid="shoe-overlay"
              className="absolute left-1/2 top-1/2 h-1/2 w-1/2"
              style={{
                left: `${50 + pose.x}%`,
                top: `${50 + pose.y}%`,
                transform: `translate(-50%, -50%) scale(${pose.scale}) rotate(${pose.rotation}deg)`,
              }}
            >
              <Image
                src={trend.shoeImageUrl}
                alt={`${trend.label} shoe overlay`}
                fill
                sizes="240px"
                priority
                draggable={false}
                className="pointer-events-none object-contain mix-blend-multiply"
              />
            </div>
          </>
        ) : (
          <p className="absolute inset-0 grid place-items-center break-words p-8 text-center text-lg font-bold">
            Choose a foot photo to start your preview.
          </p>
        )}
      </div>

      <div className="box-border w-full min-w-0 max-w-full overflow-hidden border-[3px] border-ink bg-white p-5 text-ink shadow-[4px_4px_0_var(--color-pink)] lg:max-w-[30rem]">
        <label htmlFor="foot-photo" className="block font-black uppercase">
          Your foot photo
        </label>
        <input
          id="foot-photo"
          type="file"
          accept="image/*"
          aria-describedby={error ? "photo-error" : "photo-help"}
          onChange={handlePhoto}
          className="mt-2 min-h-11 w-full min-w-0 max-w-full overflow-hidden border-[3px] border-ink p-2 file:mr-3 file:min-h-11 file:border-0 file:bg-lime file:px-3 file:font-black focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
        />
        <p id="photo-help" className="mt-2 text-sm">Your photo stays in this browser tab.</p>
        {error && <p id="photo-error" className="mt-2 font-bold text-red-700">{error}</p>}

        <label htmlFor="overlay-scale" className="mt-6 block font-black">Scale: {pose.scale.toFixed(2)}</label>
        <input
          id="overlay-scale"
          type="range"
          min="0.5"
          max="2"
          step="0.05"
          value={pose.scale}
          disabled={!photoUrl}
          onChange={(event) => updatePose({ scale: Number(event.currentTarget.value) })}
          className="min-h-11 w-full accent-lime focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
        />

        <label htmlFor="overlay-rotation" className="mt-4 block font-black">Rotation: {pose.rotation}°</label>
        <input
          id="overlay-rotation"
          type="range"
          min="-45"
          max="45"
          step="1"
          value={pose.rotation}
          disabled={!photoUrl}
          onChange={(event) => updatePose({ rotation: Number(event.currentTarget.value) })}
          className="min-h-11 w-full accent-lime focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
        />

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button type="button" disabled={!photoUrl} onClick={() => updatePose({ rotation: pose.rotation - 15 })} className="min-h-11 border-[3px] border-ink bg-lime font-black focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:opacity-40">−15°</button>
          <button type="button" disabled={!photoUrl} onClick={() => updatePose({ rotation: pose.rotation + 15 })} className="min-h-11 border-[3px] border-ink bg-lime font-black focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:opacity-40">+15°</button>
          <button type="button" disabled={!photoUrl} onClick={() => setPose(DEFAULT_POSE)} className="min-h-11 border-[3px] border-ink bg-white font-black focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:opacity-40">Reset</button>
        </div>

        {hasInteracted && (
          <div className="mt-6 border-[3px] border-ink bg-pink p-4">
            <p className="font-black uppercase">Love the direction?</p>
            <button type="button" disabled className="mt-2 min-h-11 w-full cursor-not-allowed border-[3px] border-ink bg-lime px-4 font-black uppercase opacity-70 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime">
              Unlock the AI Stylist (coming soon)
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
