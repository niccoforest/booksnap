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

    const prompt = `Sei un esperto letterario. Scrivi un riassunto spoiler-free del libro indicato.

LIBRO: "${book.title}" di ${book.authors?.join(', ') || 'Autore sconosciuto'}
${book.publishedYear ? `Anno: ${book.publishedYear}` : ''}
${book.genres?.length ? `Generi: ${book.genres.join(', ')}` : ''}
${book.description ? `Descrizione esistente: ${book.description}` : ''}

Produci un riassunto spoiler-free in italiano con questa struttura:
- Di cosa parla (senza rivelare la trama completa)
- Perché vale la pena leggerlo
- A chi è consigliato
- L'atmosfera/tono del libro

REGOLE:
- Massimo 300 parole
- ZERO spoiler: non rivelare colpi di scena, finali o momenti chiave
- Tono entusiasmante ma onesto
- Tutto in italiano

Rispondi SOLO con JSON:
{
  "summary": "Il riassunto qui...",
  "mood": "es. Riflessivo e malinconico",
  "readingTime": "es. 6-8 ore",
  "perfectFor": ["es. Letture serali", "es. Amanti del fantasy"]
}`

    const result = await callLLM(prompt)

    let summary: any
    try {
      const clean = result.content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()
      const match = clean.match(/\{[\s\S]*\}/)
      summary = JSON.parse(match ? match[0] : clean)
    } catch {
      summary = {
        summary: result.content.substring(0, 600),
        mood: null,
        readingTime: null,
        perfectFor: []
      }
    }

    return NextResponse.json({ summary, bookId: id })
  } catch (error) {
    console.error('[ai/summary]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
