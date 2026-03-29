import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callLLM, SCAN_PROMPT } from '@/lib/llm'
import { connectDB } from '@/lib/mongodb'
import { Book } from '@/models/Book'
import { ScanHistory } from '@/models/ScanHistory'
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
    console.log('[scan] Calling LLM for book recognition...')
    const llmResult = await callLLM(SCAN_PROMPT, imageBase64)
    console.log('[scan] LLM raw response:', llmResult.content.substring(0, 800))

    let scanResult: ScanResult
    try {
      let clean = llmResult.content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      if (jsonMatch) clean = jsonMatch[0]
      scanResult = JSON.parse(clean)
      console.log('[scan] Parsed result:', JSON.stringify(scanResult).substring(0, 500))
    } catch (parseErr) {
      console.error('[scan] JSON parse error:', parseErr, 'Raw:', llmResult.content)
      return NextResponse.json({ error: 'LLM ha restituito un formato non valido', raw: llmResult.content }, { status: 422 })
    }

    if (!scanResult.books || scanResult.books.length === 0) {
      return NextResponse.json({ type: 'unknown', books: [] })
    }

    const confident = scanResult.books.filter((b) => b.confidence >= 0.3)
    if (confident.length === 0) {
      return NextResponse.json({ type: 'unknown', books: [] })
    }
    scanResult.books = confident

    await connectDB()
    const enrichedBooks = await Promise.all(
      scanResult.books.map(async (recognized) => {
        const metadata = await fetchBookMetadata(recognized)

        let book = metadata.isbn ? await Book.findOne({ isbn: metadata.isbn }) : null
        if (!book) {
          book = await Book.findOne({
            title: { $regex: new RegExp(metadata.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
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

    // Save scan to history — fire-and-forget, doesn't block the response
    const scanType = (['cover', 'spine', 'multiple', 'unknown'].includes(scanResult.type)
      ? scanResult.type
      : 'cover') as 'cover' | 'spine' | 'multiple' | 'unknown'

    ScanHistory.create({
      userId: user.userId,
      scanType,
      books: enrichedBooks.map((b) => ({
        bookId: b._id,
        title: b.title,
        authors: b.authors,
        coverUrl: b.coverUrl,
        confidence: b.confidence,
        addedToLibrary: false,
      })),
      imageThumbnail: imageBase64,
      scannedAt: new Date(),
    }).catch((err: unknown) => console.error('[scan] Failed to save history:', err))

    return NextResponse.json({ type: scanResult.type, books: enrichedBooks })
  } catch (error) {
    console.error('[scan]', error)
    return NextResponse.json({ error: 'Errore durante la scansione' }, { status: 500 })
  }
}
