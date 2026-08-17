const marqueeCopy = "NEW DROPS DAILY ★ Y2K IS BACK ★ COP BEFORE IT'S GONE";

export function Marquee() {
  return (
    <div className="marquee border-y-2 border-lime bg-ink py-2 text-lime">
      <div className="marquee-track flex w-max whitespace-nowrap text-xs font-black uppercase tracking-[0.15em] sm:text-sm">
        <span className="pr-12">{marqueeCopy}</span>
        <span data-testid="marquee-copy" aria-hidden="true">
          {marqueeCopy}
        </span>
      </div>
    </div>
  );
}
