import { redirect } from "next/navigation";
import { AppNavigation } from "@/app/components/AppNavigation";
import { VtoStylist } from "@/app/components/VtoStylist";
import { getTrendById, getTrends } from "@/lib/data/trends";
import { UnauthorizedError } from "@/lib/services/auth";
import { getMyProfile } from "@/lib/services/profile";

export const dynamic = "force-dynamic";

export default async function StylistPage({ searchParams }: PageProps<"/stylist">) {
  const params = await searchParams;
  const requestedTrendId = typeof params.trend === "string" ? params.trend : undefined;
  const trend = requestedTrendId ? getTrendById(requestedTrendId) : undefined;

  let profile;
  try {
    profile = await getMyProfile();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      const callback = trend ? `/stylist?trend=${encodeURIComponent(trend.id)}` : "/stylist";
      const trendParam = trend ? `&trend=${encodeURIComponent(trend.id)}` : "";
      redirect(`/register?callbackUrl=${encodeURIComponent(callback)}${trendParam}`);
    }
    return (
      <main className="mx-auto w-full max-w-[480px] p-4">
        <p role="alert">We could not load your profile — please try again.</p>
      </main>
    );
  }

  if (!profile.selfieUrl) {
    redirect(trend ? `/profile?trend=${encodeURIComponent(trend.id)}` : "/profile");
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink text-white">
      <main className="mx-auto w-full max-w-[480px] px-4 pb-28 pt-10 lg:pb-16">
        <h1 className="text-3xl font-black">AI Stylist</h1>
        <div className="mt-6">
          <VtoStylist initialTrend={trend} initialGender={profile.gender} trends={getTrends()} initialProfile={profile} />
        </div>
      </main>
      <AppNavigation current="AI Stylist" />
    </div>
  );
}
