import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callLLM } from '@/lib/llm'
import { buildTasteProfile } from '@/lib/tasteProfile'
import { User } from '@/models/User'
import { connectDB } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    await connectDB()
    const userDoc = await User.findById(user.userId)

    // Check cache
    const now = new Date()
    if (userDoc?.aiCache?.insights?.data?.length > 0 && userDoc.aiCache.insights.expiresAt > now) {
      return NextResponse.json({ insights: userDoc.aiCache.insights.data })
    }

    const profile = await buildTasteProfile(user.userId)

    if (profile.stats.totalBooks < 3) {
      return NextResponse.json({
        insights: [{
          type: 'onboarding',
          title: 'Inizia la tua avventura letteraria',
          text: 'Aggiungi almeno 3 libri alla tua libreria per ricevere insight personalizzati sulla tua lettura.',
          icon: 'book'
        }]
      })
    }

    const prompt = `Sei un analista letterario esperto. Analizza questo profilo lettore e genera 4 insight personalizzati e interessanti.

PROFILO LETTORE:
- Totale libri: ${profile.stats.totalBooks}
- Completati: ${profile.stats.completedBooks}
- In lettura: ${profile.currentlyReading.length}
- Rating medio dato: ${profile.stats.avgRating}/5
- Generi preferiti: ${profile.genreAffinities.slice(0, 5).map(g => `${g.genre} (score ${g.scoreRanking}, rating medio ${g.avgRating.toFixed(1)})`).join(', ')}
- Autori preferiti: ${profile.favoriteAuthors.slice(0, 3).map(a => `${a.name} (${a.bookCount} libri, rating ${a.avgRating.toFixed(1)})`).join(', ')}
- Ritmo medio: ${profile.stats.avgPace ? `${profile.stats.avgPace} giorni per libro` : 'non calcolabile'}
- Lunghezza preferita: ${profile.stats.preferredPageRange}
- Letture recenti: ${profile.recentlyCompleted.slice(0, 3).map(b => `"${b.title}"`).join(', ')}

Genera 4 insight DIVERSI e SPECIFICI per questo utente. Sii preciso, usa i numeri reali, mostra pattern interessanti.

Tipi possibili:
- "reading_pace": analisi del ritmo di lettura
- "genre_pattern": pattern interessante nei generi
- "milestone": traguardo o obiettivo significativo
- "recommendation_hint": insight che suggerisce dove esplorare

Rispondi SOLO con JSON valido in questo formato:
[
  {
    "type": "reading_pace",
    "title": "Titolo breve (max 5 parole)",
    "text": "Insight in italiano, specifico e personale (2-3 frasi, max 150 caratteri)",
    "icon": "clock",
    "value": "valore numerico opzionale es. 14",
    "unit": "unità opzionale es. giorni"
  }
]

Icone disponibili: clock, star, chart, book, fire, trophy, compass, heart
I valori devono essere reali e basati sui dati forniti. Rispondi SOLO con l'array JSON.`

    const result = await callLLM(prompt)

    let insights: any[]
    try {
      const clean = result.content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()
      const match = clean.match(/\[[\s\S]*\]/)
      insights = JSON.parse(match ? match[0] : clean)
      if (!Array.isArray(insights)) throw new Error('Not array')
    } catch {
      insights = generateStaticInsights(profile)
    }

    // Save to cache (24 hours)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 1)
    await User.findByIdAndUpdate(user.userId, {
      $set: { 'aiCache.insights': { data: insights, expiresAt } }
    })

    return NextResponse.json({ insights })
  } catch (error) {
    console.error('[ai/insights]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

function generateStaticInsights(profile: any): any[] {
  const insights = []

  if (profile.stats.completedBooks > 0) {
    insights.push({
      type: 'milestone',
      title: `${profile.stats.completedBooks} libri completati`,
      text: `Hai letto ${profile.stats.completedBooks} libri con un rating medio di ${profile.stats.avgRating}/5. Ottimo risultato!`,
      icon: 'trophy',
      value: profile.stats.completedBooks,
      unit: 'libri'
    })
  }

  if (profile.stats.avgPace) {
    insights.push({
      type: 'reading_pace',
      title: `${profile.stats.avgPace} giorni per libro`,
      text: `Il tuo ritmo di lettura medio è di ${profile.stats.avgPace} giorni per libro. ${profile.stats.avgPace < 14 ? 'Sei un lettore veloce!' : 'Ti piace assaporare ogni lettura.'}`,
      icon: 'clock',
      value: profile.stats.avgPace,
      unit: 'giorni'
    })
  }

  if (profile.genreAffinities.length > 0) {
    const topGenre = profile.genreAffinities[0]
    insights.push({
      type: 'genre_pattern',
      title: `Amante del ${topGenre.genre}`,
      text: `Il tuo genere di punta è ${topGenre.genre} con ${topGenre.bookCount} libri e un rating medio di ${topGenre.avgRating.toFixed(1)}/5.`,
      icon: 'heart',
      value: topGenre.score,
      unit: 'score'
    })
  }

  return insights
}
