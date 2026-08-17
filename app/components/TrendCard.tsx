import Image from "next/image";

import type { Trend } from "@/lib/data/trends";

interface TrendCardProps {
  trend: Trend;
}

export function TrendCard({ trend }: TrendCardProps) {
  return (
    <article className="flex h-full flex-col border-[3px] border-black bg-white text-black shadow-[4px_4px_0_#0a0a0a]">
      <div className="relative aspect-square overflow-hidden bg-white">
        <Image
          src={trend.shoeImageUrl}
          alt={`${trend.label}, product view`}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
          className="object-contain p-2"
        />
      </div>
      <h2 className="min-h-16 border-t-[3px] border-black px-3 py-2 text-sm font-black uppercase leading-tight sm:text-base">
        {trend.label}
      </h2>
    </article>
  );
}
