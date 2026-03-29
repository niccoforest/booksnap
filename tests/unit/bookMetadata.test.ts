import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchBookMetadata, enrichBookMetadata } from '@/lib/bookMetadata'

describe('Book Metadata Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fallback to input data if fetch fails', async () => {
    // Mock fetch to return error
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not found')
    })

    const recognized = { title: 'Il Nome della Rosa', author: 'Umberto Eco' }
    const result = await fetchBookMetadata(recognized)

    expect(result.title).toBe(recognized.title)
    expect(result.authors).toContain(recognized.author)
  })

  it('should enrich metadata with external data', async () => {
    // Mock fetch to return some google data
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        items: [{
          id: '123',
          volumeInfo: {
            title: 'Il Nome della Rosa (Edizione Speciale)',
            authors: ['Umberto Eco'],
            description: 'Un romanzo storico...',
            imageLinks: { thumbnail: 'http://example.com/cover.jpg' }
          }
        }]
      })
    }))

    const book = { title: 'Il Nome della Rosa', author: 'Umberto Eco', description: 'User description' }
    const result = await enrichBookMetadata(book)

    expect(result.title).toBe('Il Nome della Rosa (Edizione Speciale)')
    expect(result.description).toBe('Un romanzo storico...') // External wins if present
    expect(result.coverUrl).toBe('https://example.com/cover.jpg') // Cleaned up
  })
})
