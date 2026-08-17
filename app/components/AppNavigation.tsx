import Link from "next/link";
const navigationItems = ["Feed", "AI Stylist", "Profile"] as const;

export function AppNavigation({ current = "Feed" }: { current?: (typeof navigationItems)[number] }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 overflow-hidden border-t-[3px] border-ink bg-ink px-4 pb-[env(safe-area-inset-bottom)] lg:order-first lg:sticky lg:top-0 lg:bottom-auto lg:border-b-[3px] lg:border-t-0 lg:py-3"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
        <span className="hidden text-xl font-black uppercase tracking-[-0.04em] text-white lg:block">
          What the Heel?!
        </span>
        <ul className="grid min-w-0 w-full grid-cols-3 gap-2 py-2 lg:w-auto lg:min-w-[28rem] lg:py-0">
          {navigationItems.map((item) => {
            const isCurrent = item === current;

            return (
              <li key={item} className="min-w-0">
                {isCurrent ? (
                  <span
                    aria-current="page"
                    className="flex min-h-11 items-center justify-center border-[3px] border-ink bg-lime px-2 text-center text-xs font-black uppercase tracking-[0.05em] text-ink shadow-[3px_3px_0_var(--color-pink)] sm:text-sm"
                  >
                    {item}
                  </span>
                ) : item === "Profile" ? (
                  <Link href="/profile" className="flex min-h-11 items-center justify-center border-[3px] border-ink bg-ink px-2 text-center text-xs font-black uppercase text-lime focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime sm:text-sm">Profile</Link>
                ) : item === "Feed" ? (
                  <Link href="/" className="flex min-h-11 items-center justify-center border-[3px] border-ink bg-ink px-2 text-center text-xs font-black uppercase text-lime focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime sm:text-sm">Feed</Link>
                ) : (
                  <Link href="/stylist" className="flex min-h-11 items-center justify-center border-[3px] border-ink bg-ink px-2 text-center text-xs font-black uppercase text-lime focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime sm:text-sm">AI Stylist</Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
