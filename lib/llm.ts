interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>
}

interface LLMResponse {
  content: string
}

async function callOllama(prompt: string, imageBase64?: string): Promise<LLMResponse> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  const model = process.env.OLLAMA_MODEL || 'llava'

  const body: any = {
    model,
    prompt,
    stream: false,
  }

  if (imageBase64) {
    // Strip data URL prefix if present
    const base64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    body.images = [base64]
  }

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${await response.text()}`)
  }

  const data = await response.json()
  return { content: data.response }
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
    body: JSON.stringify({ model, messages }),
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

export const SCAN_PROMPT = `You are a book recognition assistant. Analyze this image and identify the book(s) visible.

Return a JSON object with this exact structure:
{
  "type": "cover" | "spine" | "isbn" | "multiple" | "unknown",
  "books": [
    {
      "title": "...",
      "author": "...",
      "isbn": "..." or null,
      "confidence": 0.0-1.0
    }
  ]
}

Rules:
- Be precise with titles and authors
- If multiple books are visible, list all of them
- confidence is how sure you are (0.0 = not sure, 1.0 = certain)
- Return ONLY valid JSON, no markdown, no explanation
- If you cannot identify any book, return {"type":"unknown","books":[]}`
