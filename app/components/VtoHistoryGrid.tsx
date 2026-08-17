import type { VtoHistoryItem } from "@/lib/services/vtoTask";

interface VtoHistoryGridProps {
  items: VtoHistoryItem[];
}

export function VtoHistoryGrid({ items }: VtoHistoryGridProps) {
  if (items.length === 0) return null;

  return (
    <section aria-label="Past Try-Ons" className="flex flex-col gap-2">
      <p className="text-lg font-black uppercase">Past Try-Ons</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <figure key={item.taskId} className="border-[3px] border-ink bg-surface-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.resultUrl}
              alt={`Your past try-on: ${item.trendLabel}`}
              className="aspect-square w-full object-cover"
            />
            <figcaption className="p-1 text-xs font-bold text-white">{item.trendLabel}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
