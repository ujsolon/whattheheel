import { redirect } from "next/navigation";
import { AppNavigation } from "@/app/components/AppNavigation";
import { SelfieUploadForm } from "@/app/components/SelfieUploadForm";
import { SignOutButton } from "@/app/components/SignOutButton";
import { UnauthorizedError } from "@/lib/services/auth";
import { getMyProfile } from "@/lib/services/profile";

export const dynamic = "force-dynamic";
export default async function ProfilePage() {
  let profile;
  try { profile = await getMyProfile(); } catch (error) { if (error instanceof UnauthorizedError) redirect("/register?callbackUrl=%2Fprofile"); return <main className="mx-auto w-full max-w-[480px] p-4"><p role="alert">We could not load your profile — please try again.</p></main>; }
  return <div className="flex min-h-screen flex-col bg-ink text-white"><main className="mx-auto w-full max-w-[480px] px-4 pb-28 pt-10 lg:pb-16"><h1 className="text-3xl font-black">Profile</h1><p className="mt-2">{profile.email}</p><div className="mt-6"><SelfieUploadForm initialProfile={profile} /></div><div className="mt-6"><SignOutButton /></div></main><AppNavigation current="Profile" /></div>;
}
