import { connectDB } from './mongodb'
import { Activity } from '@/models/Activity'
import mongoose from 'mongoose'

export async function logActivity(
  userId: string, 
  type: 'book_added' | 'book_finished' | 'book_rated' | 'goal_achieved',
  bookId?: string,
  payload?: any
) {
  try {
    await connectDB()
    await Activity.create({
      userId: new mongoose.Types.ObjectId(userId),
      type,
      bookId: bookId ? new mongoose.Types.ObjectId(bookId) : undefined,
      payload
    })
  } catch (err) {
    console.error('[activities] Log failed:', err)
  }
}
