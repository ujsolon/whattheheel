import { AppNavigation } from "@/app/components/AppNavigation";
import { Marquee } from "@/app/components/Marquee";
import { TrendFeed } from "@/app/components/TrendFeed";
import { getTrends } from "@/lib/data/trends";

export default function Home() {
  const trends = getTrends();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <AppNavigation />
      <Marquee />
      <main className="mx-auto w-full max-w-7xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-16 lg:pb-16">
        <header className="mb-8">
          <p className="mb-2 text-sm font-black uppercase tracking-[0.15em] text-[#d4ff3f]">
            What the Heel?!
          </p>
          <h1 className="text-4xl font-black uppercase tracking-[-0.04em] sm:text-5xl">
            Trending rn
          </h1>
        </header>
        <TrendFeed trends={trends} />
      </main>
    </div>
  );
}
