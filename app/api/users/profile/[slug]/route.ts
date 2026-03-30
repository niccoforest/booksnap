import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { Library } from '@/models/Library'
import { getAuthUser } from '@/lib/auth'
import mongoose from 'mongoose'

type RouteContext<T> = { params: Promise<Record<string, string>> }

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/users/profile/[slug]'>
) {
  try {
    const { slug } = await ctx.params
    await connectDB()

    const user = await User.findOne({ profileSlug: slug })
    if (!user || (!user.isPublic && (await getAuthUser(request))?.userId !== user._id.toString())) {
      return NextResponse.json({ error: 'Profilo non trovato o privato' }, { status: 404 })
    }

    // Get current auth user to check follow status
    const authUser = await getAuthUser(request)
    const isFollowing = authUser 
      ? user.followers.some((f: any) => f.toString() === authUser.userId) 
      : false

    // Fetch stats and recent books from all libraries
    const libraries = await Library.find({ userId: user._id }).populate({
      path: 'books.bookId',
      model: mongoose.models.Book
    })
    const allBooks = libraries.flatMap(l => l.books)
    
    const ratedBooks = allBooks.filter((b: any) => b.rating)
    const stats = {
      totalBooks: allBooks.length,
      completedBooks: allBooks.filter((b: any) => b.status === 'completed').length,
      avgRating: ratedBooks.length > 0 
        ? parseFloat((ratedBooks.reduce((acc: number, b: any) => acc + b.rating, 0) / ratedBooks.length).toFixed(1))
        : 0
    }

    const recentBooks = allBooks
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .slice(0, 6)
      .map((b: any) => ({
        title: b.bookId.title,
        author: b.bookId.authors[0] || 'Sconosciuto',
        coverUrl: b.bookId.coverUrl,
        status: b.status
      }))

    return NextResponse.json({
      profile: {
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        followerCount: user.followers.length,
        followingCount: user.following.length,
        isFollowing,
        stats,
        recentBooks
      }
    })
  } catch (error) {
    console.error('[profile api]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
