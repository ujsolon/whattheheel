const marqueeCopy = "NEW DROPS DAILY ★ Y2K IS BACK ★ COP BEFORE IT'S GONE";

export function Marquee() {
  return (
    <div className="marquee border-y-2 border-[#d4ff3f] bg-[#0a0a0a] py-2 text-[#d4ff3f]" tabIndex={0}>
      <div className="marquee-track flex w-max gap-12 whitespace-nowrap text-xs font-black uppercase tracking-[0.15em] sm:text-sm">
        <span>{marqueeCopy}</span>
        <span data-testid="marquee-copy" aria-hidden="true">
          ★ {marqueeCopy}
        </span>
      </div>
    </div>
  );
}
