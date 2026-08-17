import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNavigation } from "@/app/components/AppNavigation";
import { SelfieUploadForm } from "@/app/components/SelfieUploadForm";
import { SignOutButton } from "@/app/components/SignOutButton";
import { getTrendById } from "@/lib/data/trends";
import { UnauthorizedError } from "@/lib/services/auth";
import { getMyProfile } from "@/lib/services/profile";

export const dynamic = "force-dynamic";
export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const params = await searchParams;
  const requestedTrend = typeof params.trend === "string" ? getTrendById(params.trend) : undefined;
  const profileCallback = requestedTrend
    ? `/profile?trend=${encodeURIComponent(requestedTrend.id)}`
    : "/profile";
  const registerUrl = requestedTrend
    ? `/register?callbackUrl=${encodeURIComponent(profileCallback)}&trend=${encodeURIComponent(requestedTrend.id)}`
    : "/register?callbackUrl=%2Fprofile";
  let profile;
  try { profile = await getMyProfile(); } catch (error) { if (error instanceof UnauthorizedError) redirect(registerUrl); return <main className="mx-auto w-full max-w-[480px] p-4"><p role="alert">We could not load your profile — please try again.</p></main>; }
  return <div className="flex min-h-screen flex-col bg-ink text-white"><main className="mx-auto w-full max-w-[480px] px-4 pb-28 pt-10 lg:pb-16"><h1 className="text-3xl font-black">Profile</h1><p className="mt-2">{profile.email}</p><div className="mt-6"><SelfieUploadForm initialProfile={profile} /></div>{requestedTrend && profile.selfieUrl ? <div className="mt-6"><Link href={`/stylist?trend=${encodeURIComponent(requestedTrend.id)}`} className="grid min-h-11 w-full place-items-center border-[3px] border-ink bg-lime px-4 font-black uppercase focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime">Continue to AI Stylist</Link></div> : null}<div className="mt-6"><SignOutButton /></div></main><AppNavigation current="Profile" /></div>;
}
