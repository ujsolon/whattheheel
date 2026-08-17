import Image from "next/image";
import Link from "next/link";

import type { Trend } from "@/lib/data/trends";

interface TrendCardProps {
  trend: Trend;
  priority?: boolean;
  hrefBuilder?: (trend: Trend) => string;
  compact?: boolean;
  selected?: boolean;
  onSelect?: (trend: Trend) => void;
}

const defaultHrefBuilder = (trend: Trend) => `/preview?trend=${encodeURIComponent(trend.id)}`;

export function TrendCard({
  trend,
  priority = false,
  hrefBuilder = defaultHrefBuilder,
  compact = false,
  selected = false,
  onSelect,
}: TrendCardProps) {
  const className = `relative flex h-full w-full flex-col border-[3px] border-ink bg-white text-left text-ink shadow-[4px_4px_0_var(--color-ink)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime ${
    selected ? "outline outline-4 outline-lime shadow-[4px_4px_0_var(--color-lime)]" : ""
  }`;
  const content = (
    <>
      <div className={`relative overflow-hidden bg-white ${compact ? "aspect-[4/3]" : "aspect-square"}`}>
        <Image
          src={trend.shoeImageUrl}
          alt={`${trend.label}, product view`}
          fill
          priority={priority}
          sizes={compact ? "160px" : "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"}
          className="object-contain p-2"
        />
      </div>
      <h2
        className={`${compact ? "min-h-11 px-2 py-1 text-xs" : "min-h-16 px-3 py-2 text-sm sm:text-base"} break-words border-t-[3px] border-ink font-black uppercase leading-tight [overflow-wrap:anywhere]`}
      >
        {trend.label}
      </h2>
      {selected && (
        <span className="bg-ink px-2 py-1 text-center text-xs font-black uppercase tracking-[0.05em] text-lime">
          Selected
        </span>
      )}
    </>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(trend)} aria-label={trend.label} aria-pressed={selected} className={className}>
        {content}
      </button>
    );
  }

  return <Link href={hrefBuilder(trend)} aria-label={trend.label} className={className}>{content}</Link>;
}
