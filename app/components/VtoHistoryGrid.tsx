"use client";

import { useRef, useState } from "react";
import { VtoResultViewer } from "@/app/components/VtoResultViewer";
import type { VtoHistoryItem } from "@/lib/services/vtoTask";

interface VtoHistoryGridProps {
  items: VtoHistoryItem[];
}

export function VtoHistoryGrid({ items }: VtoHistoryGridProps) {
  const [openItem, setOpenItem] = useState<VtoHistoryItem | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  if (items.length === 0) return null;

  function close() {
    setOpenItem(null);
    triggerRef.current?.focus();
  }

  return (
    <section aria-label="Past Try-Ons" className="flex flex-col gap-2">
      <p className="text-lg font-black uppercase">Past Try-Ons</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
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
                className="aspect-square w-full object-cover"
              />
            </button>
            <figcaption className="p-1 text-xs font-bold text-white">{item.trendLabel}</figcaption>
          </figure>
        ))}
      </div>
      {openItem ? <VtoResultViewer item={openItem} onClose={close} /> : null}
    </section>
  );
}
