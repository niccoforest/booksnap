import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callLLM, SCAN_PROMPT } from '@/lib/llm'
import { connectDB } from '@/lib/mongodb'
import { Book } from '@/models/Book'
import { fetchBookMetadata } from '@/lib/bookMetadata'

interface RecognizedBook {
  title: string
  author: string
  isbn?: string
  confidence: number
}

interface ScanResult {
  type: string
  books: RecognizedBook[]
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const body = await request.json()
    const { imageBase64 } = body

    if (!imageBase64) {
      return NextResponse.json({ error: 'Immagine richiesta' }, { status: 400 })
    }

    // Call LLM for recognition
    const llmResult = await callLLM(SCAN_PROMPT, imageBase64)

    let scanResult: ScanResult
    try {
      const clean = llmResult.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      scanResult = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'LLM ha restituito un formato non valido', raw: llmResult.content }, { status: 422 })
    }

    if (!scanResult.books || scanResult.books.length === 0) {
      return NextResponse.json({ type: 'unknown', books: [] })
    }

    // Fetch metadata for recognized books (Google Books → Open Library → minimal)
    await connectDB()
    const enrichedBooks = await Promise.all(
      scanResult.books.map(async (recognized) => {
        const metadata = await fetchBookMetadata(recognized)

        // Find or create book in DB
        let book = metadata.isbn ? await Book.findOne({ isbn: metadata.isbn }) : null

        if (!book) {
          book = await Book.findOne({
            title: { $regex: new RegExp(metadata.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
          })
        }

        if (!book) {
          book = await Book.create(metadata)
        }

        return {
          ...metadata,
          _id: book._id,
          confidence: recognized.confidence,
        }
      })
    )

    return NextResponse.json({
      type: scanResult.type,
      books: enrichedBooks,
    })
  } catch (error) {
    console.error('[scan]', error)
    return NextResponse.json({ error: 'Errore durante la scansione' }, { status: 500 })
  }
}
