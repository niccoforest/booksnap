interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>
}

interface LLMResponse {
  content: string
}

async function callOllama(prompt: string, imageBase64?: string): Promise<LLMResponse> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  const model = process.env.OLLAMA_MODEL || 'gemma3:4b-it-qat'

  // Use /api/chat endpoint — required for vision models like Gemma 3
  const message: any = {
    role: 'user',
    content: prompt,
  }

  if (imageBase64) {
    // Strip data URL prefix if present
    const base64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    message.images = [base64]
  }

  console.log(`[LLM] Calling Ollama model=${model} hasImage=${!!imageBase64} promptLength=${prompt.length}`)

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [message],
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 1024,
      },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error(`[LLM] Ollama error: ${response.status}`, errText)
    throw new Error(`Ollama error: ${response.status} ${errText}`)
  }

  const data = await response.json()
  const content = data.message?.content || ''
  console.log(`[LLM] Ollama response (first 500 chars):`, content.substring(0, 500))
  return { content }
}

async function callOpenRouter(prompt: string, imageBase64?: string): Promise<LLMResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-flash-1.5'

  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

  const messages: LLMMessage[] = []

  if (imageBase64) {
    const base64 = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`

    messages.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: base64 } },
        { type: 'text', text: prompt },
      ],
    })
  } else {
    messages.push({ role: 'user', content: prompt })
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'BookSnap',
    },
    body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.1 }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status} ${await response.text()}`)
  }

  const data = await response.json()
  return { content: data.choices[0].message.content }
}

export async function callLLM(prompt: string, imageBase64?: string): Promise<LLMResponse> {
  const useOpenRouter = !!process.env.OPENROUTER_API_KEY
  return useOpenRouter
    ? callOpenRouter(prompt, imageBase64)
    : callOllama(prompt, imageBase64)
}

export const SCAN_PROMPT = `Analyze this image of books. Identify EVERY book visible — front covers, spines, or stacked.

For spines: read the vertical text carefully, character by character. Spines typically show TITLE and AUTHOR. Count all spines visible and report each one.

CRITICAL: The TITLE is the LARGEST, most prominent text — NOT small logos, series names, or publisher badges.

Respond with ONLY valid JSON, no other text:
{"type":"spine","books":[{"title":"Title","author":"Author","isbn":null,"confidence":0.9}]}

type: "cover" (single front), "spine" (spines visible), "multiple" (mixed views), "unknown" (no books)
- Include ALL books, even if text is partially visible
- confidence: 0.9 clear, 0.7 partial, 0.5 hard to read
- If author not visible, use ""
- If no books: {"type":"unknown","books":[]}`
