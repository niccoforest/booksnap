import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { normalizeLocation } from '@/lib/locationUtils'
import { callLLM } from '@/lib/llm'

function buildPrompt(rawLocation: string, existingLocations: string[]): string {
  const existingList = existingLocations.length > 0 ? existingLocations.join(', ') : '(nessuna)'
  return (
    `L'utente ha digitato "${rawLocation}". ` +
    `Le sue location esistenti sono: ${existingList}. ` +
    `Se l'input contiene errori di battitura o è semanticamente identico a una location esistente ` +
    `(es. "sx" e "sinistra", "comodino del leto" e "Comodino Del Letto"), ` +
    `restituisci ESATTAMENTE la stringa esistente. ` +
    `Se è una location veramente nuova, restituisci l'input corretto grammaticalmente ` +
    `con la prima lettera di ogni parola maiuscola. ` +
    `Rispondi SOLO con la stringa normalizzata, senza virgolette né spiegazioni.`
  )
}

function cleanLLMOutput(raw: string, fallback: string): string {
  const cleaned = raw.replace(/^["'`]|["'`]$/g, '').split('\n')[0].trim()
  return cleaned || fallback
}

async function llmNormalize(rawLocation: string, existingLocations: string[]): Promise<string> {
  const prompt = buildPrompt(rawLocation, existingLocations)
  const apiKey = process.env.OPENROUTER_API_KEY

  if (apiKey) {
    // Prod: OpenRouter with a small, cheap model dedicated to normalization
    const model = process.env.OPENROUTER_NORMALIZE_MODEL || 'google/gemma-2-9b-it:free'
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'BookSnap',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
        temperature: 0,
      }),
    })
    if (!res.ok) throw new Error(`OpenRouter error: ${res.status} ${await res.text()}`)
    const data = await res.json()
    const raw: string = data.choices?.[0]?.message?.content?.trim() ?? ''
    return cleanLLMOutput(raw, normalizeLocation(rawLocation))
  }

  // Dev: fallback to Ollama via the shared callLLM abstraction
  const response = await callLLM(prompt)
  return cleanLLMOutput(response.content, normalizeLocation(rawLocation))
}

// POST /api/locations/normalize
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { rawLocation, existingLocations = [] } = await request.json()

    if (!rawLocation || typeof rawLocation !== 'string' || !rawLocation.trim()) {
      return NextResponse.json({ normalized: '' })
    }

    try {
      const normalized = await llmNormalize(rawLocation.trim(), existingLocations)
      return NextResponse.json({ normalized })
    } catch (err) {
      console.error('[locations/normalize] LLM error, using local fallback:', err)
      return NextResponse.json({ normalized: normalizeLocation(rawLocation) })
    }
  } catch (error) {
    console.error('[locations/normalize]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
