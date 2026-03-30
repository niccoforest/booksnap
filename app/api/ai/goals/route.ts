import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callLLM } from '@/lib/llm'
import { buildTasteProfile } from '@/lib/tasteProfile'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const profile = await buildTasteProfile(user.userId)

    if (profile.stats.totalBooks < 2) {
      return NextResponse.json({
        goals: [{
          id: 'first_book',
          title: 'Primo libro completato',
          description: 'Completa il tuo primo libro per sbloccare obiettivi personalizzati',
          target: 1,
          current: profile.stats.completedBooks,
          unit: 'libri',
          difficulty: 'facile',
          category: 'milestone'
        }]
      })
    }

    const pace = profile.stats.avgPace
    const completed = profile.stats.completedBooks
    const topGenre = profile.genreAffinities[0]?.genre || 'Fiction'

    const prompt = `Sei un coach di lettura motivante. Genera 3 obiettivi di lettura personalizzati per questo lettore.

PROFILO:
- Libri completati: ${completed}
- Rating medio: ${profile.stats.avgRating}/5
- Ritmo: ${pace ? `${pace} giorni/libro` : 'non disponibile'}
- Genere preferito: ${topGenre}
- Lunghezza preferita: ${profile.stats.preferredPageRange}
- Libri attualmente in lettura: ${profile.currentlyReading.map(b => b.title).join(', ') || 'nessuno'}
- Obiettivi totali libri: ${profile.stats.totalBooks}

Gli obiettivi devono essere:
1. RAGGIUNGIBILI (non troppo ambiziosi)
2. SPECIFICI (basati sui dati reali)
3. MOTIVANTI (mostrare progressi)
4. DIVERSI (ritmo, genere, quantità)

Rispondi SOLO con JSON:
[
  {
    "id": "string univoco",
    "title": "Titolo obiettivo (max 6 parole)",
    "description": "Spiegazione personalizzata (max 100 caratteri)",
    "target": 10,
    "current": 7,
    "unit": "libri",
    "difficulty": "facile|medio|sfidante",
    "category": "quantita|ritmo|genere|milestone",
    "deadline": "es. Fine anno",
    "tip": "Consiglio pratico per raggiungerlo (max 80 car)"
  }
]`

    const result = await callLLM(prompt)

    let goals: any[]
    try {
      const clean = result.content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()
      const match = clean.match(/\[[\s\S]*\]/)
      goals = JSON.parse(match ? match[0] : clean)
      if (!Array.isArray(goals)) throw new Error()
    } catch {
      // Fallback goals basati sui dati reali
      goals = generateFallbackGoals(profile)
    }

    return NextResponse.json({ goals })
  } catch (error) {
    console.error('[ai/goals]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

function generateFallbackGoals(profile: any): any[] {
  const completed = profile.stats.completedBooks
  const goals = []

  // Obiettivo annuale
  const yearTarget = Math.max(12, Math.ceil(completed * 1.3))
  goals.push({
    id: 'annual_goal',
    title: `${yearTarget} libri nel 2026`,
    description: `Superare il tuo record personale di ${completed} libri`,
    target: yearTarget,
    current: completed,
    unit: 'libri',
    difficulty: 'medio',
    category: 'quantita',
    deadline: 'Fine 2026',
    tip: 'Leggi almeno 20 minuti al giorno per restare in carreggiata'
  })

  // Obiettivo ritmo (se disponibile)
  if (profile.stats.avgPace && profile.stats.avgPace > 7) {
    const newPace = Math.max(7, profile.stats.avgPace - 5)
    goals.push({
      id: 'pace_goal',
      title: `Finisci un libro in ${newPace} giorni`,
      description: `Migliora il tuo ritmo attuale di ${profile.stats.avgPace} giorni/libro`,
      target: newPace,
      current: profile.stats.avgPace,
      unit: 'giorni/libro',
      difficulty: 'medio',
      category: 'ritmo',
      deadline: 'Prossimo libro',
      tip: 'Dedica 30 minuti di lettura ogni sera prima di dormire'
    })
  }

  // Obiettivo genere scoperta
  if (profile.genreAffinities.length > 1) {
    const secondGenre = profile.genreAffinities[1]?.genre
    goals.push({
      id: 'genre_goal',
      title: `Esplora il ${secondGenre}`,
      description: `Leggi 2 libri di ${secondGenre}, il tuo secondo genere preferito`,
      target: 2,
      current: Math.min(2, profile.genreAffinities[1]?.bookCount || 0),
      unit: 'libri',
      difficulty: 'facile',
      category: 'genere',
      deadline: 'Prossimi 2 mesi',
      tip: `Chiedi al Bibliotecario AI consigli top per il ${secondGenre}`
    })
  }

  return goals
}
