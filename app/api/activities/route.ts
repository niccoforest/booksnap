import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Activity } from '@/models/Activity'
import { User } from '@/models/User'
import { getAuthUser } from '@/lib/auth'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    await connectDB()

    let query: any = {}
    
    // For MVP Social Feed (SO-4):
    // 1. If user is logged in and following someone, prioritize their feed.
    // 2. If user is new, show recent public activities from the whole community to keep it alive.
    
    if (authUser) {
      const user = await User.findById(authUser.userId)
      if (user && user.following.length > 0) {
        // Show only activities of people the user follows + own
        query = { userId: { $in: [...user.following, user._id] } }
      }
    }

    // Ensure models are registered for populate
    mongoose.models.Book || require('@/models/Book')

    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('userId', 'username avatar profileSlug isPublic')
      .populate('bookId', 'title authors coverUrl')
      .lean()

    // FILTERING:
    // - Only show activities of public users
    // - Unless the user themselves is private, then show their own in their feed
    const filteredActivities = activities.filter((act: any) => {
      if (!act.userId) return false
      // Show if user is public
      if (act.userId.isPublic) return true
      // Show own activity in own feed even if private
      if (authUser && act.userId._id.toString() === authUser.userId) return true
      return false
    })

    return NextResponse.json({ activities: filteredActivities })
  } catch (error) {
    console.error('[activities api]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
