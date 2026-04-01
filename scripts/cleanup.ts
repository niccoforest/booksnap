/**
 * Script di pulizia DB per testing
 * Uso: npx tsx scripts/cleanup.ts [opzione]
 *
 * Opzioni:
 *   all        — Elimina tutto tranne User, ricrea library di default
 *   books      — Svuota l'array books da tutte le Library (mantiene le library)
 *   locations  — Rimuove location e behindRow da tutti i libri
 *   extra      — Elimina conversations, activities, challenges, notifications, bookshelves, scanhistories
 */

import { connectDB } from '../lib/mongodb'
import mongoose from 'mongoose'

async function run() {
  const option = process.argv[2]

  if (!option || !['all', 'books', 'locations', 'extra'].includes(option)) {
    console.log('Uso: npx tsx scripts/cleanup.ts [all|books|locations|extra]')
    console.log()
    console.log('  all        Elimina tutto tranne User, ricrea library di default')
    console.log('  books      Svuota i libri da tutte le Library')
    console.log('  locations  Rimuove location e behindRow da tutti i libri')
    console.log('  extra      Elimina conversations, activities, challenges, notifications, bookshelves, scanhistories')
    process.exit(0)
  }

  await connectDB()
  const db = mongoose.connection.db!

  if (option === 'all') {
    const toDelete = ['books', 'libraries', 'conversations', 'activities', 'challenges', 'notifications', 'bookshelves', 'scanhistories']
    for (const name of toDelete) {
      const r = await db.collection(name).deleteMany({})
      console.log(`${name}: eliminati ${r.deletedCount} documenti`)
    }
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
  }

  if (option === 'books') {
    const r = await db.collection('libraries').updateMany({}, { $set: { books: [] } })
    console.log(`Library svuotate: ${r.modifiedCount}`)
  }

  if (option === 'locations') {
    const r = await db.collection('libraries').updateMany(
      {},
      { $unset: { 'books.$[].location': '', 'books.$[].behindRow': '' } }
    )
    console.log(`Library aggiornate: ${r.modifiedCount}`)
  }

  if (option === 'extra') {
    const toDelete = ['conversations', 'activities', 'challenges', 'notifications', 'bookshelves', 'scanhistories']
    for (const name of toDelete) {
      const r = await db.collection(name).deleteMany({})
      console.log(`${name}: eliminati ${r.deletedCount} documenti`)
    }
  }

  console.log('\nDone.')
}

run()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1) })
