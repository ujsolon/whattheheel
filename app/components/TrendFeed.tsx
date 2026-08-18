import { TrendCard } from "@/app/components/TrendCard";

import type { Trend } from "@/lib/data/trends";

interface TrendFeedProps {
  trends: Trend[];
}

export function TrendFeed({ trends }: TrendFeedProps) {
  if (trends.length === 0) {
    return (
      <p role="status" className="bg-surface-muted px-4 py-8 text-center text-white">
        No trends right now — check back soon.
      </p>
    );
  }

  return (
    <section aria-label="Trending shoes" className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
      {trends.map((trend, index) => (
        <TrendCard key={trend.id} trend={trend} priority={index < 4} showBuyLink />
      ))}
    </section>
  );
}
