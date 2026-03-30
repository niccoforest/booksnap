import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callLLM } from '@/lib/llm'
import { connectDB } from '@/lib/mongodb'
import { Book } from '@/models/Book'
import mongoose from 'mongoose'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
    }

    await connectDB()
    const book = await Book.findById(id).lean() as any
    if (!book) return NextResponse.json({ error: 'Libro non trovato' }, { status: 404 })

    const prompt = `Sei un moderatore esperto di club del libro. Genera domande di discussione per il libro indicato.

LIBRO: "${book.title}" di ${book.authors?.join(', ') || 'Autore sconosciuto'}
${book.publishedYear ? `Anno: ${book.publishedYear}` : ''}
${book.genres?.length ? `Generi: ${book.genres.join(', ')}` : ''}
${book.description ? `Trama: ${book.description}` : ''}

Genera 6 domande di discussione originali e stimolanti per un book club.

Le domande devono:
- Stimolare riflessione profonda
- Essere specifiche per QUESTO libro (non generiche)
- Coprire temi diversi: personaggi, trame, temi sociali, stile, impatto personale
- Essere aperte (no sì/no)
- ZERO SPOILER nelle domande stesse (ok riferirsi a temi generali)

Rispondi SOLO con JSON:
[
  {
    "id": 1,
    "question": "La domanda qui...",
    "theme": "es. Personaggi",
    "depth": "superficiale|media|profonda"
  }
]`

    const result = await callLLM(prompt)

    let prompts: any[]
    try {
      const clean = result.content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()
      const match = clean.match(/\[[\s\S]*\]/)
      prompts = JSON.parse(match ? match[0] : clean)
      if (!Array.isArray(prompts)) throw new Error()
    } catch {
      prompts = [
        {
          id: 1,
          question: `Quale personaggio di "${book.title}" ti ha colpito di più e perché?`,
          theme: 'Personaggi',
          depth: 'media'
        },
        {
          id: 2,
          question: `Come ha influenzato la tua lettura il contesto storico/culturale del libro?`,
          theme: 'Contesto',
          depth: 'profonda'
        },
        {
          id: 3,
          question: `C'è un passaggio che ti ha particolarmente emozionato o fatto riflettere?`,
          theme: 'Impatto personale',
          depth: 'superficiale'
        }
      ]
    }

    return NextResponse.json({ 
      prompts, 
      bookTitle: book.title,
      bookId: id 
    })
  } catch (error) {
    console.error('[ai/book-club]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
