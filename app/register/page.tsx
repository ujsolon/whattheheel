import type { Metadata } from "next";

import { AuthForm } from "@/app/components/AuthForm";

export const metadata: Metadata = {
  title: "Sign up or sign in — What the Heel",
};

import { safeCallbackUrl } from "@/lib/services/auth";

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const params = await searchParams;
  const trend = typeof params.trend === "string" ? params.trend : undefined;
  const fallback = trend ? `/profile?trend=${encodeURIComponent(trend)}` : "/profile";
  const callbackUrl = safeCallbackUrl(
    typeof params.callbackUrl === "string" ? params.callbackUrl : undefined,
    fallback,
  );
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col justify-center px-4 py-16">
      <h1 className="mb-6 text-2xl font-black text-white">
        Unlock the AI Stylist
      </h1>
      <AuthForm callbackUrl={callbackUrl} />
    </main>
  );
}
