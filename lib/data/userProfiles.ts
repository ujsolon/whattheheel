import type { Collection, Filter } from "mongodb";
import { getDb } from "@/lib/data/mongodb";
import type { ImageFormat } from "@/lib/services/imageValidation";

export interface UserProfileDocument { userId: string; selfieUrl: string; selfiePublicId: string; assetVersion: number; width: number; height: number; format: ImageFormat; bytes: number; pendingCleanupPublicIds: string[]; gender?: "female" | "male"; createdAt: Date; updatedAt: Date }
let indexedCollection: object | undefined; let indexPromise: Promise<unknown> | undefined;
async function collection() { const db = await getDb(); const value = db.collection<UserProfileDocument>("user_profiles"); await ensureIndex(value); return value; }
async function ensureIndex(value: Collection<UserProfileDocument>) { if (indexedCollection !== value || !indexPromise) { indexedCollection = value; indexPromise = value.createIndex({ userId: 1 }, { unique: true }).catch((error) => { indexedCollection = undefined; indexPromise = undefined; throw error; }); } await indexPromise; }
export async function findProfile(userId: string) { return (await collection()).findOne({ userId }); }
export async function replaceProfile(userId: string, prior: UserProfileDocument | null, next: Omit<UserProfileDocument, "createdAt" | "updatedAt" | "assetVersion" | "pendingCleanupPublicIds">): Promise<UserProfileDocument | null> {
  const now = new Date(); const c = await collection();
  const filter: Filter<UserProfileDocument> = prior ? { userId, selfiePublicId: prior.selfiePublicId, assetVersion: prior.assetVersion } : { userId, selfiePublicId: { $exists: false } };
  const doc: UserProfileDocument = { ...next, userId, assetVersion: (prior?.assetVersion ?? 0) + 1, pendingCleanupPublicIds: prior ? [...prior.pendingCleanupPublicIds, prior.selfiePublicId] : [], createdAt: prior?.createdAt ?? now, updatedAt: now };
  try {
    return await c.findOneAndUpdate(filter, { $set: doc }, { upsert: !prior, returnDocument: "after", includeResultMetadata: false });
  } catch (error) {
    // Two first uploads can both observe no profile. The unique userId index
    // turns the losing upsert into the same CAS miss as an existing-profile race.
    if (!prior && typeof error === "object" && error !== null && "code" in error && error.code === 11000) return null;
    throw error;
  }
}
export async function removePendingCleanup(userId: string, publicId: string) { await (await collection()).updateOne({ userId }, { $pull: { pendingCleanupPublicIds: publicId } }); }
export async function setGenderPreference(userId: string, gender: "female" | "male"): Promise<void> { await (await collection()).updateOne({ userId }, { $set: { gender } }); }
