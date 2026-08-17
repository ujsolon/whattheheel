import Link from "next/link";

import { AppNavigation } from "@/app/components/AppNavigation";
import { OverlayCanvas } from "@/app/components/OverlayCanvas";
import { getTrendById } from "@/lib/data/trends";

interface PreviewPageProps {
  searchParams: Promise<{ trend?: string | string[] }>;
}

export default async function PreviewPage({ searchParams }: PreviewPageProps) {
  const query = await searchParams;
  const trend = typeof query.trend === "string" ? getTrendById(query.trend) : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-ink text-white">
      <main className="mx-auto box-border w-full max-w-6xl overflow-x-hidden px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-10 lg:pb-16">
        {trend ? (
          <>
            <header className="mx-auto mb-6 max-w-[61rem]">
              <p className="mb-2 text-sm font-black uppercase tracking-[0.15em] text-lime">
                Manual try-on
              </p>
              <h1 className="text-3xl font-black uppercase tracking-[-0.04em] sm:text-4xl">
                Preview {trend.label}
              </h1>
            </header>
            <OverlayCanvas trend={trend} />
          </>
        ) : (
          <section className="mx-auto max-w-lg border-[3px] border-lime bg-surface-muted p-6 shadow-[4px_4px_0_var(--color-pink)]">
            <h1 className="text-3xl font-black uppercase">Choose a shoe first</h1>
            <p className="mt-3">That trend is unavailable. Return to the feed and choose another style.</p>
            <Link
              href="/"
              className="mt-6 inline-flex min-h-11 items-center border-[3px] border-ink bg-lime px-4 font-black uppercase text-ink shadow-[3px_3px_0_var(--color-pink)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
            >
              Choose a trend
            </Link>
          </section>
        )}
      </main>
      <AppNavigation />
    </div>
  );
}
