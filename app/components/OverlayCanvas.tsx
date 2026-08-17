"use client";

import Image from "next/image";
import Link from "next/link";
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

type PoseUpdate = Partial<Pose> | ((current: Pose) => Partial<Pose>);

const DEFAULT_POSE: Pose = { x: 0, y: 0, scale: 1, rotation: 0 };
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));
const distance = (first: Point, second: Point) =>
  Math.hypot(second.x - first.x, second.y - first.y);

export function OverlayCanvas({ trend }: OverlayCanvasProps) {
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [error, setError] = useState("");
  const [pose, setPose] = useState(DEFAULT_POSE);
  const poseRef = useRef(DEFAULT_POSE);
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

  const resetPose = () => {
    poseRef.current = DEFAULT_POSE;
    setPose(DEFAULT_POSE);
  };

  const updatePose = (next: PoseUpdate, interacted = true) => {
    setPose((current) => {
      const values = typeof next === "function" ? next(current) : next;
      const updated = {
        x: clamp(values.x ?? current.x, -45, 45),
        y: clamp(values.y ?? current.y, -45, 45),
        scale: clamp(values.scale ?? current.scale, 0.5, 2),
        rotation: clamp(values.rotation ?? current.rotation, -45, 45),
      };
      poseRef.current = updated;
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

    let nextUrl: string;
    try {
      nextUrl = URL.createObjectURL(file);
    } catch (objectUrlError) {
      console.error("Unable to preview selected photo", objectUrlError);
      setError("Choose an image file your browser can display.");
      return;
    }
    const decoder = new window.Image();
    decoder.onload = () => {
      if (selection !== selectionRef.current) {
        URL.revokeObjectURL(nextUrl);
        return;
      }
      if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = nextUrl;
      setPhotoUrl(nextUrl);
      resetPose();
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
      pinchRef.current = { distance: distance(points[0], points[1]), scale: poseRef.current.scale };
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!photoUrl) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
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
      const deltaX = ((points[0].x - lastDragRef.current.x) / width) * 100;
      const deltaY = ((points[0].y - lastDragRef.current.y) / height) * 100;
      updatePose((current) => ({ x: current.x + deltaX, y: current.y + deltaY }));
      lastDragRef.current = points[0];
    } else if (points.length === 2 && pinchRef.current) {
      const baselineDistance = Math.max(pinchRef.current.distance, 1);
      updatePose({
        scale: pinchRef.current.scale * (distance(points[0], points[1]) / baselineDistance),
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
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const amount = event.shiftKey ? 5 : 2;
    const actions: Record<string, (current: Pose) => Partial<Pose>> = {
      ArrowLeft: (current) => ({ x: current.x - amount }),
      ArrowRight: (current) => ({ x: current.x + amount }),
      ArrowUp: (current) => ({ y: current.y - amount }),
      ArrowDown: (current) => ({ y: current.y + amount }),
      "+": (current) => ({ scale: current.scale + 0.05 }),
      "=": (current) => ({ scale: current.scale + 0.05 }),
      "-": (current) => ({ scale: current.scale - 0.05 }),
      "[": (current) => ({ rotation: current.rotation - 15 }),
      "]": (current) => ({ rotation: current.rotation + 15 }),
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      updatePose(action);
    }
  };

  return (
    <section className="mx-auto grid w-full min-w-0 max-w-[30rem] items-start gap-6 lg:max-w-[61rem] lg:grid-cols-2">
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
        className={`relative mx-auto aspect-square w-full min-w-0 max-w-[30rem] overflow-hidden bg-surface-muted touch-none focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime ${photoUrl ? "" : "border-[3px] border-dashed border-lime shadow-[4px_4px_0_var(--color-pink)]"}`}
      >
        {photoUrl ? (
          <>
            {/* Blob URLs require a native image element and never leave the browser. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="Your selected foot" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
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

      <div className="mx-auto box-border w-full min-w-0 max-w-[30rem] overflow-hidden border-[3px] border-ink bg-white p-5 text-ink shadow-[4px_4px_0_var(--color-pink)]">
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
        {error && <p id="photo-error" role="alert" className="mt-2 font-bold text-error">{error}</p>}

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
          <button type="button" disabled={!photoUrl} onClick={() => updatePose((current) => ({ rotation: current.rotation - 15 }))} className="min-h-11 border-[3px] border-ink bg-lime font-black focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:opacity-40">−15°</button>
          <button type="button" disabled={!photoUrl} onClick={() => updatePose((current) => ({ rotation: current.rotation + 15 }))} className="min-h-11 border-[3px] border-ink bg-lime font-black focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:opacity-40">+15°</button>
          <button type="button" disabled={!photoUrl} onClick={resetPose} className="min-h-11 border-[3px] border-ink bg-white font-black focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:opacity-40">Reset</button>
        </div>

        {hasInteracted && (
          <div className="mt-6 border-[3px] border-ink bg-pink p-4">
            <p className="font-black uppercase">Love the direction?</p>
            <Link
              href={`/register?callbackUrl=${encodeURIComponent(`/profile?trend=${trend.id}`)}&trend=${encodeURIComponent(trend.id)}`}
              className="mt-2 grid min-h-11 w-full place-items-center border-[3px] border-ink bg-lime px-4 font-black uppercase focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
            >
              Register to unlock the AI Stylist
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
