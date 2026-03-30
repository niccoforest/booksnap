import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { getAuthUser } from '@/lib/auth'
import mongoose from 'mongoose'

type RouteContext<T> = { params: Promise<Record<string, string>> }

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/users/profile/[slug]/follow'>
) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { slug } = await ctx.params
    await connectDB()

    const targetUser = await User.findOne({ profileSlug: slug })
    if (!targetUser) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

    const targetId = targetUser._id.toString()
    if (targetId === authUser.userId) {
      return NextResponse.json({ error: 'Non puoi seguire te stesso' }, { status: 400 })
    }

    const currentUserId = new mongoose.Types.ObjectId(authUser.userId)
    const isFollowing = targetUser.followers.some((f: any) => f.toString() === authUser.userId)

    if (isFollowing) {
      // Unfollow
      targetUser.followers = targetUser.followers.filter((f: any) => f.toString() !== authUser.userId)
      await User.findByIdAndUpdate(authUser.userId, { 
        $pull: { following: targetUser._id } 
      })
    } else {
      // Follow
      targetUser.followers.push(currentUserId)
      await User.findByIdAndUpdate(authUser.userId, { 
        $addToSet: { following: targetUser._id } 
      })
    }

    await targetUser.save()

    return NextResponse.json({ 
      isFollowing: !isFollowing,
      followerCount: targetUser.followers.length 
    })
  } catch (error) {
    console.error('[follow api]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
