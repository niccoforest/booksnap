import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { normalizeLocation } from '@/lib/locationUtils'
import { callLLM } from '@/lib/llm'

function buildPrompt(rawLocation: string, existingLocations: string[]): string {
  const existingList = existingLocations.length > 0 ? existingLocations.join(', ') : '(nessuna)'
  return (
    `Sei un correttore di location per un database di libri. Esegui questi due passi in ordine:\n` +
    `1. CORREGGI eventuali errori ortografici nell'input (lettere ripetute, omesse o invertite). ` +
    `Es: "Scrivaniiia" → "Scrivania", "comodino del leto" → "Comodino Del Letto".\n` +
    `2. Se la stringa corretta è semanticamente identica a una delle location esistenti ` +
    `(es. "sx"/"sinistra", varianti minuscole/maiuscole), usa ESATTAMENTE quella esistente.\n\n` +
    `Input: "${rawLocation}"\n` +
    `Location esistenti: ${existingList}\n\n` +
    `Rispondi SOLO con la stringa risultante (prima lettera di ogni parola maiuscola), ` +
    `senza virgolette né spiegazioni.`
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
