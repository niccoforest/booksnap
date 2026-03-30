import { connectDB } from '../lib/mongodb'
import { User } from '../models/User'
import mongoose from 'mongoose'

async function fixSlugs() {
  await connectDB()
  const users = await User.find({ profileSlug: { $exists: false } })
  console.log(`Found ${users.length} users without slug`)
  
  for (const user of users) {
    const slug = user.username.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 5)
    user.profileSlug = slug
    await user.save()
    console.log(`Updated ${user.username} -> ${slug}`)
  }
}

fixSlugs().then(() => process.exit(0))
