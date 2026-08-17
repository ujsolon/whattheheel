const navigationItems = ["Feed", "AI Stylist", "Profile"] as const;

export function AppNavigation() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t-[3px] border-black bg-[#0a0a0a] px-4 pb-[env(safe-area-inset-bottom)] lg:sticky lg:top-0 lg:border-b-[3px] lg:border-t-0 lg:py-3"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
        <span className="hidden text-xl font-black uppercase tracking-[-0.04em] text-white lg:block">
          What the Heel?!
        </span>
        <ul className="grid w-full grid-cols-3 gap-2 py-2 lg:w-auto lg:min-w-[28rem] lg:py-0">
          {navigationItems.map((item) => {
            const isCurrent = item === "Feed";

            return (
              <li key={item}>
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  aria-disabled={isCurrent ? undefined : true}
                  className={
                    isCurrent
                      ? "flex min-h-11 items-center justify-center border-[3px] border-black bg-[#d4ff3f] px-2 text-center text-xs font-black uppercase tracking-[0.05em] text-black shadow-[3px_3px_0_#ff3ec9] sm:text-sm"
                      : "flex min-h-11 items-center justify-center border-[3px] border-black bg-[#0a0a0a] px-2 text-center text-xs font-black uppercase tracking-[0.05em] text-[#d4ff3f] sm:text-sm"
                  }
                >
                  {item}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
