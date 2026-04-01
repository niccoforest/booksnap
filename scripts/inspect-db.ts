/**
 * Script di ispezione DB
 * Uso: npx tsx scripts/inspect-db.ts [opzione]
 *
 * Opzioni:
 *   summary    — Conteggio documenti per ogni collection
 *   users      — Lista utenti (senza passwordHash)
 *   libraries  — Tutte le library con numero di libri
 *   books      — Lista libri nel DB
 *   locations  — Valori di location usati nei BookEntry
 */

import { connectDB } from '../lib/mongodb'
import mongoose from 'mongoose'

async function run() {
  const option = process.argv[2]

  if (!option || !['summary', 'users', 'libraries', 'books', 'locations'].includes(option)) {
    console.log('Uso: npx tsx scripts/inspect-db.ts [summary|users|libraries|books|locations]')
    console.log()
    console.log('  summary    Conteggio documenti per ogni collection')
    console.log('  users      Lista utenti (senza passwordHash)')
    console.log('  libraries  Tutte le library con numero di libri')
    console.log('  books      Lista libri nel DB')
    console.log('  locations  Valori di location usati nei BookEntry')
    process.exit(0)
  }

  await connectDB()
  const db = mongoose.connection.db!

  if (option === 'summary') {
    const collections = ['users', 'books', 'libraries', 'conversations', 'activities', 'challenges', 'notifications', 'bookshelves', 'scanhistories']
    console.log('\n=== RIEPILOGO COLLECTION ===\n')
    for (const name of collections) {
      const count = await db.collection(name).countDocuments()
      console.log(`  ${name.padEnd(20)} ${count} documenti`)
    }
  }

  if (option === 'users') {
    const users = await db.collection('users').find({}, {
      projection: { passwordHash: 0 }
    }).toArray()
    console.log(`\n=== UTENTI (${users.length}) ===\n`)
    for (const u of users) {
      console.log(`  id:       ${u._id}`)
      console.log(`  username: ${u.username}`)
      console.log(`  email:    ${u.email}`)
      console.log(`  slug:     ${u.profileSlug ?? '-'}`)
      console.log(`  creato:   ${u.createdAt?.toLocaleDateString('it-IT') ?? '-'}`)
      console.log()
    }
  }

  if (option === 'libraries') {
    const libraries = await db.collection('libraries').find({}).toArray()
    const users = await db.collection('users').find({}, { projection: { _id: 1, username: 1 } }).toArray()
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u.username]))

    console.log(`\n=== LIBRARY (${libraries.length}) ===\n`)
    for (const lib of libraries) {
      const owner = userMap[lib.userId?.toString()] ?? 'sconosciuto'
      console.log(`  [${owner}] ${lib.emoji ?? '📚'} ${lib.name}${lib.isDefault ? ' (default)' : ''}`)
      console.log(`    id:    ${lib._id}`)
      console.log(`    libri: ${lib.books?.length ?? 0}`)
      console.log()
    }
  }

  if (option === 'books') {
    const books = await db.collection('books').find({}).toArray()
    console.log(`\n=== LIBRI NEL DB (${books.length}) ===\n`)
    for (const b of books) {
      console.log(`  ${b.title}`)
      console.log(`    autori: ${(b.authors ?? []).join(', ') || '-'}`)
      console.log(`    isbn:   ${b.isbn ?? '-'}`)
      console.log(`    id:     ${b._id}`)
      console.log()
    }
  }

  if (option === 'locations') {
    const libraries = await db.collection('libraries').find({}).toArray()
    const locationSet = new Set<string>()
    let total = 0

    for (const lib of libraries) {
      for (const entry of lib.books ?? []) {
        if (entry.location) {
          locationSet.add(entry.location)
          total++
        }
      }
    }

    console.log(`\n=== LOCATION USATE (${locationSet.size} uniche, ${total} totali) ===\n`)
    for (const loc of [...locationSet].sort()) {
      console.log(`  • ${loc}`)
    }
    if (locationSet.size === 0) console.log('  Nessuna location trovata.')
  }

  console.log()
}

run()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1) })
