import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Activity } from '@/models/Activity'
import mongoose from 'mongoose'

// GET /api/trending — top books added in the last 7 days
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    mongoose.models.Book || require('@/models/Book')

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const results = await Activity.aggregate([
      {
        $match: {
          type: { $in: ['book_added', 'book_finished'] },
          createdAt: { $gte: since },
          bookId: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$bookId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'book',
        },
      },
      { $unwind: '$book' },
      {
        $project: {
          _id: 0,
          bookId: '$_id',
          count: 1,
          title: '$book.title',
          authors: '$book.authors',
          coverUrl: '$book.coverUrl',
          description: '$book.description',
        },
      },
    ])

    return NextResponse.json({ trending: results })
  } catch (error) {
    console.error('[trending]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
