"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TrendCard } from "@/app/components/TrendCard";
import type { Trend } from "@/lib/data/trends";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90_000;
const COPY_ROTATE_MS = 2500;

// EXPERIENCE.md quotes the first two verbatim; the rest match that same
// hype-register voice as this story's own reasonable extension, not locked spec.
const STATUS_COPY = [
  "Lacing up your fit…",
  "Blending the shadows…",
  "Matching the light…",
  "Polishing the pixels…",
];

const GENERIC_ERROR_COPY = "Something went wrong generating your preview — please try again.";

interface VtoStylistProps {
  initialTrend: Trend | undefined;
  initialGender: "female" | "male" | null;
  trends: Trend[];
}

type Phase = "idle" | "pending" | "success" | "error";

function stylistHref(trend: Trend) {
  return `/stylist?trend=${encodeURIComponent(trend.id)}`;
}

function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeToReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);
}

export function VtoStylist({ initialTrend, initialGender, trends }: VtoStylistProps) {
  const [gender, setGender] = useState<"female" | "male" | null>(initialGender);
  const [phase, setPhase] = useState<Phase>("idle");
  const [resultUrl, setResultUrl] = useState<string | undefined>(undefined);
  const [statusIndex, setStatusIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const copyTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const ceilingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function clearTimers() {
    clearInterval(pollTimerRef.current);
    clearInterval(copyTimerRef.current);
    clearTimeout(ceilingTimerRef.current);
  }

  useEffect(() => clearTimers, []);

  async function poll(taskId: string) {
    try {
      const response = await fetch(`/api/vto-tasks/${taskId}`);
      if (!response.ok) return; // transient — try again next tick, ceiling still applies
      const body: { data?: { status?: string; resultUrl?: string } } = await response.json();
      const status = body.data?.status;

      if (reducedMotion) setStatusIndex((current) => (current + 1) % STATUS_COPY.length);

      if (status === "success") {
        clearTimers();
        setResultUrl(body.data?.resultUrl);
        setPhase("success");
      } else if (status === "error") {
        clearTimers();
        setPhase("error");
      }
    } catch {
      // transient network failure — keep polling until the ceiling fires
    }
  }

  async function trigger() {
    if (!initialTrend || !gender) return;
    setPhase("pending");
    setStatusIndex(0);

    try {
      const response = await fetch("/api/vto-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trendId: initialTrend.id, gender }),
      });
      if (!response.ok) {
        setPhase("error");
        return;
      }
      const body: { data?: { taskId?: string } } = await response.json();
      const taskId = body.data?.taskId;
      if (!taskId) {
        setPhase("error");
        return;
      }

      pollTimerRef.current = setInterval(() => poll(taskId), POLL_INTERVAL_MS);
      if (!reducedMotion) {
        copyTimerRef.current = setInterval(
          () => setStatusIndex((current) => (current + 1) % STATUS_COPY.length),
          COPY_ROTATE_MS,
        );
      }
      ceilingTimerRef.current = setTimeout(() => {
        clearTimers();
        setPhase("error");
      }, POLL_TIMEOUT_MS);
    } catch {
      setPhase("error");
    }
  }

  function retry() {
    clearTimers();
    setResultUrl(undefined);
    setPhase("idle");
  }

  if (!initialTrend) {
    return (
      <section aria-label="Choose a trend" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {trends.map((trend) => (
          <TrendCard key={trend.id} trend={trend} hrefBuilder={stylistHref} />
        ))}
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-black uppercase">{initialTrend.label}</p>

      {phase === "idle" && (
        <>
          {gender === null && (
            <fieldset className="flex flex-col gap-2 border-[3px] border-ink bg-surface-muted p-4">
              <legend className="px-1 text-xs font-black uppercase tracking-[0.05em] text-white">
                Which fit should we style?
              </legend>
              <label className="flex min-h-11 items-center gap-2 text-white">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={gender === "female"}
                  onChange={() => setGender("female")}
                  className="h-5 w-5 accent-lime focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
                />
                Feminine
              </label>
              <label className="flex min-h-11 items-center gap-2 text-white">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={gender === "male"}
                  onChange={() => setGender("male")}
                  className="h-5 w-5 accent-lime focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
                />
                Masculine
              </label>
            </fieldset>
          )}
          <button
            type="button"
            disabled={!gender}
            onClick={trigger}
            className="min-h-11 bg-lime px-4 py-2 font-black uppercase text-ink focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:opacity-40"
          >
            Try It On
          </button>
        </>
      )}

      {phase === "pending" && (
        <div className="flex flex-col gap-2">
          <div
            role="progressbar"
            aria-label="Generating your try-on"
            className="h-3 w-full overflow-hidden border-[3px] border-ink bg-surface-muted"
          >
            <div className="vto-progress-fill h-full w-1/3 bg-lime" />
          </div>
          <p className="text-sm text-white">{STATUS_COPY[statusIndex]}</p>
        </div>
      )}

      {phase === "success" && resultUrl && (
        <div className="border-[3px] border-lime">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultUrl}
            alt={`Your AI try-on result: ${initialTrend.label}`}
            className="w-full object-contain"
          />
        </div>
      )}

      {phase === "error" && (
        <div className="flex flex-col gap-2">
          <p role="alert" className="border-[3px] border-error bg-surface-muted p-3 text-sm text-white">
            {GENERIC_ERROR_COPY}
          </p>
          <button
            type="button"
            onClick={retry}
            className="min-h-11 bg-lime px-4 py-2 font-black uppercase text-ink focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            Try another photo
          </button>
        </div>
      )}
    </div>
  );
}
