import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callLLM } from '@/lib/llm'

describe('LLM Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.OPENROUTER_API_KEY
  })

  it('should call Ollama if OpenRouter key is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'Ollama response' })
    })

    const result = await callLLM('test prompt')
    expect(result.content).toBe('Ollama response')
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('11434'), expect.anything())
  })

  it('should call OpenRouter if API key is present', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key'
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        choices: [{ message: { content: 'OpenRouter response' } }]
       })
    })

    const result = await callLLM('test prompt')
    expect(result.content).toBe('OpenRouter response')
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('openrouter.ai'), expect.anything())
  })
})
