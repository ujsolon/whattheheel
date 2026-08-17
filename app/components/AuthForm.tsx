"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Mode = "sign-up" | "sign-in";

const SIGN_IN_MISMATCH_COPY = "Email or password didn't match — try again.";
const GENERIC_ERROR_COPY = "Something went wrong. Please try again.";
const ACCOUNT_CREATED_COPY = "Your account was created, but we couldn't sign you in. Please sign in now.";

export function AuthForm({ callbackUrl = "/profile" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === "sign-up";

  function toggleMode() {
    setMode(isSignUp ? "sign-in" : "sign-up");
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    let accountCreated = false;

    try {
      if (isSignUp) {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const body: { error?: { message?: string } } | null = await response
            .json()
            .catch(() => null);
          setError(body?.error?.message ?? GENERIC_ERROR_COPY);
          return;
        }
        accountCreated = true;
      }

      const result = await signIn("credentials", { redirect: false, email, password });

      if (!result?.ok || result.error) {
        if (accountCreated) {
          setMode("sign-in");
          setError(ACCOUNT_CREATED_COPY);
        } else {
          setError(SIGN_IN_MISMATCH_COPY);
        }
        return;
      }

      router.push(callbackUrl);
    } catch (submissionError) {
      console.error("Authentication submission failed", submissionError);
      setError(GENERIC_ERROR_COPY);
    } finally {
      setIsSubmitting(false);
    }
  }

  const inProgressCopy = isSignUp ? "Creating your account…" : "Signing you in…";
  const submitCopy = isSignUp ? "Sign Up" : "Sign In";

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={isSignUp ? "Sign up" : "Sign in"}
      className="flex w-full flex-col gap-4 border-[3px] border-ink bg-surface-muted p-6 shadow-[4px_4px_0_var(--color-ink)]"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="auth-email" className="text-sm font-bold text-white">
          Email
        </label>
        <input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-11 border-[3px] border-ink bg-surface-muted px-3 text-white focus-visible:border-lime focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="auth-password"
          className="text-sm font-bold text-white"
        >
          Password
        </label>
        <input
          id="auth-password"
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          maxLength={72}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-11 border-[3px] border-ink bg-surface-muted px-3 text-white focus-visible:border-lime focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime"
        />
      </div>

      {error ? (
        <p role="alert" className="border-[3px] border-error bg-surface-muted p-3 text-sm text-white">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 bg-lime px-4 py-2 text-sm font-black text-ink focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:opacity-60"
      >
        {isSubmitting ? inProgressCopy : submitCopy}
      </button>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={toggleMode}
        className="min-h-11 text-sm text-white underline underline-offset-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:opacity-60"
      >
        {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
      </button>
    </form>
  );
}
