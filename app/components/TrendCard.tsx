import Image from "next/image";
import Link from "next/link";

import { BuyNowLink } from "@/app/components/BuyNowLink";
import type { Trend } from "@/lib/data/trends";

interface TrendCardProps {
  trend: Trend;
  priority?: boolean;
  hrefBuilder?: (trend: Trend) => string;
  compact?: boolean;
  selected?: boolean;
  onSelect?: (trend: Trend) => void;
  /**
   * Opt-in. The Feed enables it so a shopper can reach a retailer without
   * spending a generation; the AI Stylist picker deliberately does not, since a
   * competing outbound link mid-flow would derail the trigger (Story 2.8, AC5).
   */
  showBuyLink?: boolean;
}

const defaultHrefBuilder = (trend: Trend) => `/preview?trend=${encodeURIComponent(trend.id)}`;

export function TrendCard({
  trend,
  priority = false,
  hrefBuilder = defaultHrefBuilder,
  compact = false,
  selected = false,
  onSelect,
  showBuyLink = false,
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

  // A Buy Now action cannot live inside the card's primary target: nesting an
  // <a> inside an <a> (or a <button>) is invalid HTML and browsers re-parent
  // it. So when the card carries one, the chrome moves to a plain container and
  // the two actions become siblings (Story 2.8, AC4).
  if (showBuyLink && trend.buyUrl) {
    return (
      <div className={`${className} overflow-hidden`}>
        <Link
          href={hrefBuilder(trend)}
          aria-label={trend.label}
          className="flex flex-1 flex-col focus-visible:outline focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-lime"
        >
          {content}
        </Link>
        <div className="border-t-[3px] border-ink">
          <BuyNowLink buyUrl={trend.buyUrl} label={trend.label} />
        </div>
      </div>
    );
  }

  return <Link href={hrefBuilder(trend)} aria-label={trend.label} className={className}>{content}</Link>;
}
