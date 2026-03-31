import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Library } from '@/models/Library'

// GET /api/libraries/locations - Distinct locations used by the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    await connectDB()

    const results = await Library.aggregate([
      { $match: { userId: user.userId } },
      { $unwind: '$books' },
      { $match: { 'books.location': { $exists: true, $ne: '' } } },
      { $sort: { 'books.addedAt': -1 } },
      {
        $group: {
          _id: { $toLower: '$books.location' },
          location: { $first: '$books.location' },
        },
      },
      { $sort: { _id: 1 } },
    ])

    const locations = results.map((r) => r.location as string)

    return NextResponse.json({ locations })
  } catch (error) {
    console.error('[libraries locations]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
