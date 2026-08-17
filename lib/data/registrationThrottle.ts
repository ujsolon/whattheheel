import { getDb } from "@/lib/data/mongodb";

interface RegistrationAttemptDocument {
  _id: string;
  count: number;
  windowStartedAt: Date;
  expiresAt: Date;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

let throttleIndexPromise: Promise<unknown> | undefined;

async function getThrottleCollection() {
  const db = await getDb();
  const collection = db.collection<RegistrationAttemptDocument>("registration_attempts");
  if (!throttleIndexPromise) {
    throttleIndexPromise = collection
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      .catch((error) => {
        throttleIndexPromise = undefined;
        throw error;
      });
  }
  await throttleIndexPromise;
  return collection;
}

export interface RegistrationThrottleResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function consumeRegistrationAttempt(
  key: string,
  now = new Date(),
): Promise<RegistrationThrottleResult> {
  const collection = await getThrottleCollection();
  const cutoff = new Date(now.getTime() - WINDOW_MS);
  const expiresAt = new Date(now.getTime() + WINDOW_MS);
  const windowIsExpired = {
    $or: [
      { $eq: [{ $type: "$windowStartedAt" }, "missing"] },
      { $lt: ["$windowStartedAt", cutoff] },
    ],
  };
  const attempt = await collection.findOneAndUpdate(
    { _id: key },
    [
      {
        $set: {
          count: { $cond: [windowIsExpired, 1, { $add: ["$count", 1] }] },
          windowStartedAt: { $cond: [windowIsExpired, now, "$windowStartedAt"] },
          expiresAt,
        },
      },
    ],
    { upsert: true, returnDocument: "after" },
  );

  if (!attempt) {
    throw new Error("Unable to record registration attempt");
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((attempt.windowStartedAt.getTime() + WINDOW_MS - now.getTime()) / 1000),
  );
  return { allowed: attempt.count <= MAX_ATTEMPTS, retryAfterSeconds };
}
