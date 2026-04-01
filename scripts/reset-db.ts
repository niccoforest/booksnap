import { connectDB } from '../lib/mongodb'
import mongoose from 'mongoose'

async function resetDB() {
  await connectDB()
  const db = mongoose.connection.db!

  const collections = [
    'books',
    'libraries',
    'conversations',
    'activities',
    'challenges',
    'notifications',
    'bookshelves',
    'scanhistories',
  ]

  for (const name of collections) {
    const result = await db.collection(name).deleteMany({})
    console.log(`${name}: eliminati ${result.deletedCount} documenti`)
  }

  // Ricrea la library di default per ogni utente esistente
  const users = await db.collection('users').find({}).toArray()
  for (const user of users) {
    await db.collection('libraries').insertOne({
      userId: user._id,
      name: 'La mia libreria',
      emoji: '📚',
      isDefault: true,
      books: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    console.log(`Library di default ricreata per: ${user.username}`)
  }

  console.log('\nReset completato.')
}

resetDB()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1) })
