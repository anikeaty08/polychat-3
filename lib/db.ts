import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/polychat';

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in your .env');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };
if (process.env.NODE_ENV !== 'production') global.mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

/** Convert Mongoose doc to API shape with string id */
export function toApi<T extends { _id?: unknown; toObject?: () => Record<string, unknown> }>(doc: T | null): (T & { id: string }) | null {
  if (!doc) return null;
  const o = (doc as any).toObject ? (doc as any).toObject() : { ...doc };
  return { ...o, id: String(o._id ?? (doc as any)._id) } as T & { id: string };
}

export function toApiMany<T extends { _id?: unknown }>(docs: T[]): (T & { id: string })[] {
  return docs.map((d) => toApi(d as any)!).filter(Boolean) as (T & { id: string })[];
}
