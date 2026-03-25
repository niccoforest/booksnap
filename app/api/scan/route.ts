import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callLLM, SCAN_PROMPT } from '@/lib/llm'
import { connectDB } from '@/lib/mongodb'
import { Book } from '@/models/Book'

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

async function fetchBookMetadata(recognized: RecognizedBook) {
  try {
    // Try Open Library by ISBN first
    if (recognized.isbn) {
      const res = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${recognized.isbn}&format=json&jscmd=data`
      )
      const data = await res.json()
      const book = data[`ISBN:${recognized.isbn}`]
      if (book) {
        return {
          isbn: recognized.isbn,
          title: book.title,
          authors: book.authors?.map((a: any) => a.name) || [recognized.author],
          publisher: book.publishers?.[0]?.name,
          publishedYear: book.publish_date ? parseInt(book.publish_date) : undefined,
          coverUrl: book.cover?.large || book.cover?.medium || book.cover?.small,
          openLibraryKey: book.key,
          pageCount: book.number_of_pages,
        }
      }
    }

    // Fallback: Open Library search by title+author
    const query = encodeURIComponent(`${recognized.title} ${recognized.author}`)
    const res = await fetch(`https://openlibrary.org/search.json?q=${query}&limit=1&fields=key,title,author_name,isbn,cover_i,number_of_pages_median,publisher,first_publish_year`)
    const data = await res.json()
    
    if (data.docs?.[0]) {
      const doc = data.docs[0]
      const isbn = doc.isbn?.[0]
      const coverId = doc.cover_i
      return {
        isbn,
        title: doc.title,
        authors: doc.author_name || [recognized.author],
        publisher: doc.publisher?.[0],
        publishedYear: doc.first_publish_year,
        coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : undefined,
        openLibraryKey: doc.key,
        pageCount: doc.number_of_pages_median,
      }
    }
  } catch (err) {
    console.error('[fetchBookMetadata]', err)
  }

  return {
    title: recognized.title,
    authors: [recognized.author],
  }
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
      scanResult = JSON.parse(llmResult.content)
    } catch {
      return NextResponse.json({ error: 'LLM ha restituito un formato non valido', raw: llmResult.content }, { status: 422 })
    }

    if (!scanResult.books || scanResult.books.length === 0) {
      return NextResponse.json({ type: 'unknown', books: [] })
    }

    // Fetch metadata for recognized books
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
