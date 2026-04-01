import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'

// Limits per user per day
export const RATE_LIMITS = {
  scan: 15,
  assistant: 25,
}

// Lightweight schema — no separate model file needed
const rateLimitSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  action: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  count: { type: Number, default: 0 },
})
rateLimitSchema.index({ userId: 1, action: 1, date: 1 }, { unique: true })

function getRateLimitModel() {
  return mongoose.models.RateLimit || mongoose.model('RateLimit', rateLimitSchema)
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Increments the counter for (userId, action) today.
 * Returns { allowed: boolean, count: number, limit: number }.
 */
export async function checkRateLimit(
  userId: string,
  action: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; count: number; limit: number }> {
  await connectDB()
  const RateLimit = getRateLimitModel()
  const limit = RATE_LIMITS[action]
  const date = todayUTC()

  const doc = await RateLimit.findOneAndUpdate(
    { userId, action, date },
    { $inc: { count: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  return { allowed: doc.count <= limit, count: doc.count, limit }
}
