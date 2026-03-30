import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Book } from '@/models/Book'
import { searchExternalBooks } from '@/lib/bookMetadata'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')

    if (!q || q.length < 2) {
      return NextResponse.json({ suggestions: [] })
    }

    await connectDB()

    // Prefix match or basic regex for autocomplete
    const query = {
      $or: [
        { title: { $regex: `^${q}`, $options: 'i' } },
        { title: { $regex: q.split(/\s+/).join('.*'), $options: 'i' } }, // Simple fuzzy-like regex
        { authors: { $regex: q, $options: 'i' } }
      ]
    }

    const suggestions = await Book.find(query)
      .select('_id title authors coverUrl')
      .limit(6)
      .lean()

    // 🏆 Fallback to External Search for global autocomplete
    if (suggestions.length < 3) {
       const external = await searchExternalBooks(q, 5)
       const externalUpserted = []
       for (const eb of external) {
         // Skip if we already have it in current suggestions
         if (suggestions.some(s => s.title === eb.title && s.authors[0] === eb.authors?.[0])) continue

         // Upsert to Book model
         const existing = await Book.findOne({ 
            $or: [{ isbn: eb.isbn }, { title: eb.title, authors: eb.authors?.[0] }]
         })

         if (existing) {
           externalUpserted.push(existing)
         } else {
           try {
             const newBook = await Book.create({ ...eb })
             externalUpserted.push(newBook)
           } catch { }
         }
       }
       return NextResponse.json({ 
         suggestions: [...suggestions, ...externalUpserted].slice(0, 6) 
       })
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('[books/autocomplete GET]', error)
    return NextResponse.json({ suggestions: [] })
  }
}
