"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

interface ProfileView { email: string; selfieUrl: string | null; updatedAt: string | null }
const guidance = "Use a clear, front-facing solo photo from the top of your head to your chest. JPG or PNG; at least 512 × 512px; under 10MB.";

export function SelfieUploadForm({ initialProfile }: { initialProfile: ProfileView }) {
  const [profile, setProfile] = useState(initialProfile); const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null); const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function select(next: File | null) {
    if (preview) URL.revokeObjectURL(preview); setPreview(null); setFile(next); setError(null); setMessage(null);
    if (!next) return;
    if (next.size >= 10_000_000) { setFile(null); setError("That image is too large (max 10MB) — please choose a smaller file."); return; }
    if (next.type && !["image/jpeg", "image/png"].includes(next.type)) { setFile(null); setError("Use a JPG or PNG image."); return; }
    try { const url = URL.createObjectURL(next); setPreview(url); }
    catch { setFile(null); setError("We couldn't read that image — please choose a different file."); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!file) { setError("Choose a selfie to upload."); return; }
    setPending(true); setError(null); setMessage(null);
    try { const body = new FormData(); body.append("selfie", file); const response = await fetch("/api/upload", { method: "POST", body }); const result = await response.json(); if (!response.ok) { setError(result?.error?.message ?? "We couldn't save your selfie — please try again."); return; } setProfile(result.data.profile); setMessage("Selfie saved."); setFile(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); if (inputRef.current) inputRef.current.value = ""; }
    catch { setError("We couldn't save your selfie — please try again."); } finally { setPending(false); }
  }
  return <form onSubmit={submit} className="flex flex-col gap-4">
    <p>{guidance}</p>
    {/* Signed URLs expire and local blob previews cannot use Next image optimization. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {(preview || profile.selfieUrl) ? <img src={preview ?? profile.selfieUrl ?? ""} alt={preview ? "Selected selfie preview" : "Your saved selfie"} className="aspect-square w-full border-[3px] border-ink object-cover" /> : <p>No selfie yet</p>}
    <label htmlFor="selfie" className="flex min-h-24 cursor-pointer items-center justify-center border-[3px] border-dashed border-lime bg-surface-muted p-4 font-bold shadow-[4px_4px_0_var(--color-ink)] focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-lime">Add/change photo</label>
    <input ref={inputRef} id="selfie" name="selfie" type="file" accept="image/jpeg,image/png" disabled={pending} onClick={(event) => { event.currentTarget.value = ""; }} onChange={(event) => select(event.target.files?.[0] ?? null)} className="sr-only" />
    {file ? <p>{file.name}</p> : null}
    {error ? <p role="alert" className="border-[3px] border-error bg-surface-muted p-3">{error}</p> : null}
    {message ? <p role="status">{message}</p> : null}
    <button type="submit" disabled={pending} className="min-h-11 bg-lime px-4 py-2 font-black text-ink focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:opacity-60">{pending ? "Uploading…" : "Save selfie"}</button>
  </form>;
}
