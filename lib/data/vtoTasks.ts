import type { Collection } from "mongodb";
import { getDb } from "@/lib/data/mongodb";

export interface VtoTaskDocument {
  taskId: string;
  userId: string;
  status: "pending" | "success" | "error";
  errorCode?: string;
  srcUrl: string;
  refUrl: string;
  style: string;
  gender: "female" | "male";
  resultUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

let indexedCollection: object | undefined;
let indexPromise: Promise<unknown> | undefined;

async function collection() {
  const db = await getDb();
  const value = db.collection<VtoTaskDocument>("vto_tasks");
  await ensureIndex(value);
  return value;
}

async function ensureIndex(value: Collection<VtoTaskDocument>) {
  if (indexedCollection !== value || !indexPromise) {
    indexedCollection = value;
    indexPromise = value.createIndex({ taskId: 1 }, { unique: true }).catch((error) => {
      indexedCollection = undefined;
      indexPromise = undefined;
      throw error;
    });
  }
  await indexPromise;
}

export async function createTask(doc: VtoTaskDocument): Promise<void> {
  await (await collection()).insertOne(doc);
}

export async function findTaskById(taskId: string): Promise<VtoTaskDocument | null> {
  return (await collection()).findOne({ taskId });
}

export async function updateTaskStatus(
  taskId: string,
  fields: Partial<Pick<VtoTaskDocument, "status" | "errorCode" | "resultUrl">>,
): Promise<boolean> {
  const result = await (await collection()).updateOne(
    { taskId, status: "pending" },
    { $set: { ...fields, updatedAt: new Date() } },
  );
  return result.modifiedCount === 1;
}
