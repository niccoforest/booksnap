'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

interface BookRec {
  _id: string
  title: string
  author: string
  year?: number
  genres: string[]
  description: string
  coverUrl?: string
  isbn?: string
  pageCount?: number
}

interface Message {
  role: 'user' | 'assistant'
  content?: string
  books?: BookRec[]
  query?: string
  loading?: boolean
}

const SUGGESTIONS = [
  'Un romanzo di fantascienza duro come Project Hail Mary',
  'Qualcosa di breve da leggere in treno',
  'Un saggio di psicologia comportamentale',
  'Un thriller nordico cupo e lento',
  'Il miglior libro di fisica per neofiti',
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [addingBook, setAddingBook] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const sendMessage = async (text?: string) => {
    const query = (text || input).trim()
    if (!query || loading) return
    setInput('')
    setLoading(true)

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: query },
      { role: 'assistant', loading: true },
    ])

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      if (res.status === 401) { router.push('/login'); return }
      const data = await res.json()

      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          books: data.books || [],
          query,
        }
        return updated
      })
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'Errore di connessione. Riprova.' }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  const addToLibrary = async (book: BookRec) => {
    setAddingBook(book._id)
    try {
      const libRes = await fetch('/api/libraries')
      const libData = await libRes.json()
      const defaultLib = libData.libraries?.find((l: any) => l.isDefault) || libData.libraries?.[0]
      if (!defaultLib) throw new Error('Nessuna libreria trovata')

      const res = await fetch(`/api/libraries/${defaultLib._id}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book._id, status: 'to_read' }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Errore')
      }
      showToast(`"${book.title}" aggiunto alla libreria`)
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setAddingBook(null)
    }
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.aiDot} />
          <div>
            <h1 className={styles.title}>Bibliotecario AI</h1>
            <p className={styles.subtitle}>Chiedi un consiglio, trovo il libro giusto per te</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <p className={styles.emptyTitle}>Come posso aiutarti?</p>
            <p className={styles.emptyText}>Descrivi il tipo di libro che cerchi, un mood, un tema o un autore che ami.</p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button key={s} className={styles.suggestion} onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
            {msg.role === 'user' ? (
              <div className={styles.userBubble}>{msg.content}</div>
            ) : msg.loading ? (
              <div className={styles.thinkingBubble}>
                <div className={styles.dot} />
                <div className={styles.dot} />
                <div className={styles.dot} />
              </div>
            ) : msg.books ? (
              <div className={styles.booksResponse}>
                <p className={styles.responseLabel}>
                  {msg.books.length > 0
                    ? `Ho trovato ${msg.books.length} consiglio${msg.books.length > 1 ? 'i' : ''} per te`
                    : 'Non ho trovato libri per questa ricerca. Prova a riformulare.'}
                </p>
                {msg.books.map((book) => (
                  <div key={book._id} className={styles.bookCard}>
                    <div className={styles.bookCoverCol}>
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className={styles.cover} />
                      ) : (
                        <div className={styles.coverPh}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className={styles.bookInfo}>
                      <p className={styles.bookTitle}>{book.title}</p>
                      <p className={styles.bookAuthor}>{book.author}</p>
                      <div className={styles.bookGenres}>
                        {book.genres.slice(0, 2).map((g) => (
                          <span key={g} className={styles.genre}>{g}</span>
                        ))}
                        {book.year && <span className={styles.year}>{book.year}</span>}
                      </div>
                      <p className={styles.bookDesc}>{book.description}</p>
                      <button
                        className={styles.addBtn}
                        onClick={() => addToLibrary(book)}
                        disabled={addingBook === book._id}
                      >
                        {addingBook === book._id ? (
                          <span className={styles.addBtnLoading} />
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Aggiungi alla libreria
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.assistantBubble}>{msg.content}</div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        <div className={styles.inputRow}>
          <input
            ref={inputRef}
            id="assistant-input"
            type="text"
            className={styles.input}
            placeholder="Es. un romanzo storico ambientato a Roma..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={loading}
          />
          <button
            id="assistant-send"
            className={styles.sendBtn}
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            aria-label="Invia"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  )
}
