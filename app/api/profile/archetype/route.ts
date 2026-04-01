import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callLLM } from '@/lib/llm'
import { buildTasteProfile } from '@/lib/tasteProfile'
import { User } from '@/models/User'
import { connectDB } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    await connectDB()
    const userDoc = await User.findById(user.userId)

    // Cache: 7 days
    const now = new Date()
    if (userDoc?.aiCache?.archetype?.text && userDoc.aiCache.archetype.expiresAt > now) {
      return NextResponse.json({ archetype: userDoc.aiCache.archetype.text })
    }

    const profile = await buildTasteProfile(user.userId)

    if (profile.stats.totalBooks < 3) {
      return NextResponse.json({ archetype: null })
    }

    const topGenres = profile.genreAffinities.slice(0, 3).map(g => g.genre).join(', ')
    const topAuthors = profile.favoriteAuthors.slice(0, 2).map(a => a.name).join(', ')
    const pace = profile.stats.avgPace
    const avgRating = profile.stats.avgRating
    const completed = profile.stats.completedBooks
    const likedCount = profile.likedCount
    const favoriteCount = profile.favoriteCount

    const prompt = `Sei un critico letterario che scrive profili lettori evocativi. Analizza questi dati e scrivi UNA frase breve (max 2 righe, circa 100-130 caratteri) che descriva il tipo di lettore in modo personale, specifico e leggermente poetico. Usa la seconda persona ("Sei..."). NON elencare dati grezzi.

DATI:
- Generi dominanti: ${topGenres}
- Autori preferiti: ${topAuthors || 'non disponibili'}
- Libri completati: ${completed}
- Voto medio dato: ${avgRating}/5
- Ritmo: ${pace ? `${pace} giorni per libro` : 'variabile'}
- Reazioni (❤ piaciuti): ${likedCount}
- Reazioni (★ preferiti): ${favoriteCount}

Rispondi SOLO con la frase, senza virgolette, senza JSON, senza prefissi.`

    const result = await callLLM(prompt)
    const archetype = result.content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/^["']|["']$/g, '')
      .trim()

    // Cache for 7 days
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    await User.findByIdAndUpdate(user.userId, {
      $set: { 'aiCache.archetype': { text: archetype, expiresAt } }
    })

    await User.updateOne({ _id: user.userId }, { $inc: { 'usageStats.aiQueries': 1 } })

    return NextResponse.json({ archetype })
  } catch (error) {
    console.error('[profile/archetype]', error)
    return NextResponse.json({ archetype: null })
  }
}
