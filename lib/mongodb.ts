import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not configured");
}

const globalWithMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

const client = new MongoClient(uri);

const clientPromise =
  globalWithMongo.mongoClientPromise ?? client.connect();

if (process.env.NODE_ENV !== "production") {
  globalWithMongo.mongoClientPromise = clientPromise;
}

export default clientPromise;
