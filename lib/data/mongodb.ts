import { MongoClient, type Db } from "mongodb";

declare global {
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI environment variable is not set. Add it to .env.local (see .env.example).",
    );
  }

  return uri;
}

function getDbName(): string {
  const dbName = process.env.MONGODB_DB_NAME;

  if (!dbName) {
    throw new Error(
      "MONGODB_DB_NAME environment variable is not set. Add it to .env.local (see .env.example).",
    );
  }

  return dbName;
}

function createClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(getMongoUri());
  return client.connect();
}

let clientPromise: Promise<MongoClient> | undefined;

function getClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    // Cache on globalThis so Next.js hot-reload does not spawn a fresh
    // MongoClient (and connection pool) on every module reload.
    if (!global.__mongoClientPromise) {
      global.__mongoClientPromise = createClientPromise();
    }

    return global.__mongoClientPromise;
  }

  if (!clientPromise) {
    clientPromise = createClientPromise();
  }

  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const dbName = getDbName();
  const client = await getClientPromise();
  return client.db(dbName);
}
