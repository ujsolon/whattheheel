import { randomUUID } from "node:crypto";
import { findProfile, removePendingCleanup, replaceProfile, type UserProfileDocument } from "@/lib/data/userProfiles";
import { deleteSelfie, getPrivateSelfieUrl, uploadSelfie } from "@/lib/external/cloudinary";
import { requireAuthenticatedUser } from "@/lib/services/auth";
import { validateImage } from "@/lib/services/imageValidation";

export interface ProfileView { email: string; selfieUrl: string | null; updatedAt: string | null; gender: "female" | "male" | null }
export class ProfileConflictError extends Error { constructor() { super("Profile changed during upload"); this.name = "ProfileConflictError"; } }

async function retryDelete(publicId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { await deleteSelfie(publicId); return true; } catch { if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 20 * 2 ** attempt)); }
  }
  console.error("selfie_compensation_exhausted", { correlationId: randomUUID(), errorClass: "ExternalDeleteError" });
  return false;
}
async function cleanupPending(profile: UserProfileDocument) {
  for (const publicId of profile.pendingCleanupPublicIds) if (await retryDelete(publicId)) await removePendingCleanup(profile.userId, publicId);
}
function view(email: string, profile: UserProfileDocument | null): ProfileView {
  return { email, selfieUrl: profile ? getPrivateSelfieUrl(profile.selfiePublicId, profile.format) : null, updatedAt: profile?.updatedAt.toISOString() ?? null, gender: profile?.gender ?? null };
}
export async function getMyProfile(): Promise<ProfileView> {
  const user = await requireAuthenticatedUser(); const profile = await findProfile(user.id);
  if (profile) await cleanupPending(profile);
  return view(user.email, profile);
}
export async function uploadMySelfie(file: File): Promise<ProfileView> {
  const user = await requireAuthenticatedUser();
  const image = await validateImage(file);
  const prior = await findProfile(user.id);
  const uploaded = await uploadSelfie(image.buffer);
  let saved: UserProfileDocument | null;
  try {
    saved = await replaceProfile(user.id, prior, { userId: user.id, selfieUrl: uploaded.secureUrl, selfiePublicId: uploaded.publicId, width: image.width, height: image.height, format: image.format, bytes: image.bytes });
  } catch (error) { await retryDelete(uploaded.publicId); throw error; }
  if (!saved) { await retryDelete(uploaded.publicId); throw new ProfileConflictError(); }
  await cleanupPending(saved);
  return view(user.email, saved);
}
