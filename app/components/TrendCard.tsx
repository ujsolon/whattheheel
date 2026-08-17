import Image from "next/image";

import type { Trend } from "@/lib/data/trends";

interface TrendCardProps {
  trend: Trend;
  priority?: boolean;
}

export function TrendCard({ trend, priority = false }: TrendCardProps) {
  return (
    <article className="flex h-full flex-col border-[3px] border-ink bg-white text-ink shadow-[4px_4px_0_var(--color-ink)]">
      <div className="relative aspect-square overflow-hidden bg-white">
        <Image
          src={trend.shoeImageUrl}
          alt={`${trend.label}, product view`}
          fill
          priority={priority}
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
          className="object-contain p-2"
        />
      </div>
      <h2 className="min-h-16 break-words border-t-[3px] border-ink px-3 py-2 text-sm font-black uppercase leading-tight [overflow-wrap:anywhere] sm:text-base">
        {trend.label}
      </h2>
    </article>
  );
}
