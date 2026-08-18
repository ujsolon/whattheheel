"use client";

import { useRef, useState } from "react";
import { VtoResultViewer } from "@/app/components/VtoResultViewer";
import type { VtoHistoryItem } from "@/lib/services/vtoTask";

interface VtoHistoryGridProps {
  items: VtoHistoryItem[];
}

export function VtoHistoryGrid({ items }: VtoHistoryGridProps) {
  const [openItem, setOpenItem] = useState<VtoHistoryItem | null>(null);
  const [failedTaskIds, setFailedTaskIds] = useState<ReadonlySet<string>>(new Set());
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  if (items.length === 0) return null;

  function close() {
    setOpenItem(null);
    triggerRef.current?.focus();
  }

  function markFailed(taskId: string) {
    setFailedTaskIds((current) => new Set(current).add(taskId));
  }

  return (
    <section aria-label="Past Try-Ons" className="flex flex-col gap-2">
      <h2 className="text-lg font-black uppercase">Past Try-Ons</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) =>
          failedTaskIds.has(item.taskId) ? (
            <figure key={item.taskId} className="border-[3px] border-ink bg-surface-muted">
              <div className="grid aspect-square w-full place-items-center p-2 text-center text-xs text-white">
                Image unavailable
              </div>
              <figcaption className="p-1 text-xs font-bold text-white">{item.trendLabel}</figcaption>
            </figure>
          ) : (
            <figure key={item.taskId} className="border-[3px] border-ink bg-surface-muted">
              <button
                type="button"
                onClick={(event) => {
                  triggerRef.current = event.currentTarget;
                  setOpenItem(item);
                }}
                aria-label={`View full image: ${item.trendLabel}`}
                className="block w-full focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.resultUrl}
                  alt={`Your past try-on: ${item.trendLabel}`}
                  onError={() => markFailed(item.taskId)}
                  className="aspect-square w-full object-cover"
                />
              </button>
              <figcaption className="p-1 text-xs font-bold text-white">{item.trendLabel}</figcaption>
            </figure>
          ),
        )}
      </div>
      {openItem ? <VtoResultViewer item={openItem} onClose={close} /> : null}
    </section>
  );
}
