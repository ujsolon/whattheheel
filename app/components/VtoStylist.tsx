"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TrendCard } from "@/app/components/TrendCard";
import type { Trend } from "@/lib/data/trends";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;
const LONG_WAIT_MS = 30_000;
const MAX_CONSECUTIVE_POLL_FAILURES = 4;
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
const CONNECTION_ERROR_COPY = "We lost the connection — tap to retry.";

interface VtoStylistProps {
  initialTrend: Trend | undefined;
  initialGender: "female" | "male" | null;
  trends: Trend[];
}

type Phase = "idle" | "pending" | "success" | "error";
type ErrorKind = "generation" | "connection";

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
  const [selectedTrend, setSelectedTrend] = useState<Trend | undefined>(initialTrend);
  const [gender, setGender] = useState<"female" | "male" | null>(initialGender);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorKind, setErrorKind] = useState<ErrorKind>("generation");
  const [resultUrl, setResultUrl] = useState<string | undefined>(undefined);
  const [statusIndex, setStatusIndex] = useState(0);
  const [showLongWait, setShowLongWait] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const copyTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const ceilingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const longWaitTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeTaskIdRef = useRef<string | undefined>(undefined);
  const consecutiveFailuresRef = useRef(0);
  const pollSessionRef = useRef(0);

  function clearTimers() {
    clearTimeout(pollTimerRef.current);
    clearInterval(copyTimerRef.current);
    clearTimeout(ceilingTimerRef.current);
    clearTimeout(longWaitTimerRef.current);
  }

  useEffect(
    () => () => {
      pollSessionRef.current += 1;
      clearTimers();
    },
    [],
  );

  function showConnectionError() {
    pollSessionRef.current += 1;
    clearTimers();
    setErrorKind("connection");
    setPhase("error");
  }

  function schedulePoll(taskId: string, session: number) {
    pollTimerRef.current = setTimeout(() => void poll(taskId, session), POLL_INTERVAL_MS);
  }

  function handlePollFailure(taskId: string, session: number) {
    if (session !== pollSessionRef.current) return;
    consecutiveFailuresRef.current += 1;
    if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_POLL_FAILURES) {
      showConnectionError();
      return;
    }
    schedulePoll(taskId, session);
  }

  async function poll(taskId: string, session: number) {
    try {
      const response = await fetch(`/api/vto-tasks/${taskId}`);
      if (session !== pollSessionRef.current) return;
      if (!response.ok) {
        handlePollFailure(taskId, session);
        return;
      }
      const body: { data?: { status?: string; resultUrl?: string } } = await response.json();
      const status = body.data?.status;

      if (reducedMotion) setStatusIndex((current) => (current + 1) % STATUS_COPY.length);

      if (status === "success") {
        if (!body.data?.resultUrl) {
          setErrorKind("generation");
          clearTimers();
          setPhase("error");
          return;
        }
        clearTimers();
        setResultUrl(body.data.resultUrl);
        setPhase("success");
      } else if (status === "error") {
        clearTimers();
        setErrorKind("generation");
        setPhase("error");
      } else if (status === "pending") {
        consecutiveFailuresRef.current = 0;
        schedulePoll(taskId, session);
      } else {
        handlePollFailure(taskId, session);
      }
    } catch {
      handlePollFailure(taskId, session);
    }
  }

  function startPolling(taskId: string) {
    clearTimers();
    const session = pollSessionRef.current + 1;
    pollSessionRef.current = session;
    activeTaskIdRef.current = taskId;
    consecutiveFailuresRef.current = 0;
    setShowLongWait(false);
    setPhase("pending");

    if (!reducedMotion) {
      copyTimerRef.current = setInterval(
        () => setStatusIndex((current) => (current + 1) % STATUS_COPY.length),
        COPY_ROTATE_MS,
      );
    }
    longWaitTimerRef.current = setTimeout(() => setShowLongWait(true), LONG_WAIT_MS);
    ceilingTimerRef.current = setTimeout(showConnectionError, POLL_TIMEOUT_MS);
    void poll(taskId, session);
  }

  async function trigger() {
    if (!selectedTrend || !gender) return;
    setPhase("pending");
    setStatusIndex(0);
    setShowLongWait(false);

    try {
      const response = await fetch("/api/vto-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trendId: selectedTrend.id, gender }),
      });
      if (!response.ok) {
        setErrorKind("generation");
        setPhase("error");
        return;
      }
      const body: { data?: { taskId?: string } } = await response.json();
      const taskId = body.data?.taskId;
      if (!taskId) {
        setErrorKind("generation");
        setPhase("error");
        return;
      }

      startPolling(taskId);
    } catch {
      setErrorKind("generation");
      setPhase("error");
    }
  }

  function retry() {
    if (errorKind === "connection" && activeTaskIdRef.current) {
      startPolling(activeTaskIdRef.current);
      return;
    }
    pollSessionRef.current += 1;
    clearTimers();
    activeTaskIdRef.current = undefined;
    setResultUrl(undefined);
    setPhase("idle");
  }

  return (
    <div className="flex flex-col gap-4">
      {!initialTrend && (
        <section aria-label="Choose a trend" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {trends.map((trend) => (
            <TrendCard
              key={trend.id}
              trend={trend}
              compact
              selected={selectedTrend?.id === trend.id}
              onSelect={setSelectedTrend}
            />
          ))}
        </section>
      )}

      {selectedTrend && <p className="text-lg font-black uppercase">{selectedTrend.label}</p>}

      {selectedTrend && phase === "idle" && (
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
          {showLongWait && <p className="text-sm text-white">Still working — hang tight.</p>}
        </div>
      )}

      {phase === "success" && resultUrl && selectedTrend && (
        <div className="border-[3px] border-lime">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultUrl}
            alt={`Your AI try-on result: ${selectedTrend.label}`}
            className="w-full object-contain"
          />
        </div>
      )}

      {phase === "error" && (
        <div className="flex flex-col gap-2">
          <p role="alert" className="border-[3px] border-error bg-surface-muted p-3 text-sm text-white">
            {errorKind === "connection" ? CONNECTION_ERROR_COPY : GENERIC_ERROR_COPY}
          </p>
          <button
            type="button"
            onClick={retry}
            className="min-h-11 bg-lime px-4 py-2 font-black uppercase text-ink focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            {errorKind === "connection" ? "Retry" : "Try another photo"}
          </button>
        </div>
      )}
    </div>
  );
}
