import type { Metadata } from "next";

import { AuthForm } from "@/app/components/AuthForm";

export const metadata: Metadata = {
  title: "Sign up or sign in — What the Heel",
};

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col justify-center px-4 py-16">
      <h1 className="mb-6 text-2xl font-black text-white">
        Unlock the AI Stylist
      </h1>
      <AuthForm />
    </main>
  );
}
