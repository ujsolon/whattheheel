import { ObjectId, type Collection } from "mongodb";

import { getDb } from "@/lib/data/mongodb";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

interface UserDocument {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("A user with this email already exists");
    this.name = "DuplicateEmailError";
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toUser(doc: UserDocument): User {
  return {
    id: doc._id.toHexString(),
    email: doc.email,
    passwordHash: doc.passwordHash,
    createdAt: doc.createdAt,
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

async function getUsersCollection() {
  const db = await getDb();
  const collection = db.collection<UserDocument>("users");
  await ensureUsersIndex(collection);
  return collection;
}

let indexedCollection: object | undefined;
let usersIndexPromise: Promise<unknown> | undefined;

async function ensureUsersIndex(collection: Collection<UserDocument>) {
  if (indexedCollection !== collection || !usersIndexPromise) {
    indexedCollection = collection;
    usersIndexPromise = collection.createIndex({ email: 1 }, { unique: true }).catch((error) => {
      indexedCollection = undefined;
      usersIndexPromise = undefined;
      throw error;
    });
  }
  await usersIndexPromise;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const collection = await getUsersCollection();
  const doc = await collection.findOne({ email: normalizeEmail(email) });
  return doc ? toUser(doc) : null;
}

export async function createUser(email: string, passwordHash: string): Promise<User> {
  const collection = await getUsersCollection();
  const normalizedEmail = normalizeEmail(email);

  const existing = await collection.findOne({ email: normalizedEmail });
  if (existing) {
    throw new DuplicateEmailError();
  }

  const _id = new ObjectId();
  const createdAt = new Date();

  try {
    await collection.insertOne({ _id, email: normalizedEmail, passwordHash, createdAt });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new DuplicateEmailError();
    }
    throw error;
  }

  return { id: _id.toHexString(), email: normalizedEmail, passwordHash, createdAt };
}
