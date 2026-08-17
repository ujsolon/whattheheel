"use client";
import { signOut } from "next-auth/react";
export function SignOutButton() { return <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="min-h-11 underline focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime">Sign out</button>; }
