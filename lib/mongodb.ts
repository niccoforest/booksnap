import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in .env.local')
}

const cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } = 
  (global as any).__mongoose ?? { conn: null, promise: null }

if (!(global as any).__mongoose) {
  (global as any).__mongoose = cached
}

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false })
  }

  cached.conn = await cached.promise
  return cached.conn
}
