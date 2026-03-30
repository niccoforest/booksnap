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
  matchReason?: string
}

interface Message {
  role: 'user' | 'assistant'
  content?: string
  books?: BookRec[]
  query?: string
  loading?: boolean
  createdAt?: string
}

interface ConversationItem {
  _id: string
  title: string
  updatedAt: string
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
  const [libraryBookIds, setLibraryBookIds] = useState<Set<string>>(new Set())
  
  // Persistence & Archive
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [currentConvId, setCurrentConvId] = useState<string | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [fetchingArchive, setFetchingArchive] = useState(false)
  const [toDeleteId, setToDeleteId] = useState<string | null>(null)

  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    fetchConversations()
    const fetchLib = async () => {
      try {
        const res = await fetch('/api/libraries')
        if (!res.ok) return
        const data = await res.json()
        const def = data.libraries?.find((l: any) => l.isDefault) || data.libraries?.[0]
        if (def) {
          setLibraryBookIds(new Set(def.books.map((b: any) => b.bookId._id || b.bookId)))
        }
      } catch (e) {}
    }
    fetchLib()
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/assistant/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch (e) {}
  }

  const loadConversation = async (id: string) => {
    setLoading(true)
    setArchiveOpen(false)
    try {
      const res = await fetch(`/api/assistant/conversations/${id}`)
      const data = await res.json()
      if (res.ok) {
        setMessages(data.messages || [])
        setCurrentConvId(id)
      } else {
        showToast(data.error || 'Errore', 'error')
      }
    } catch (e) {
      showToast('Errore di caricamento', 'error')
    } finally {
      setLoading(false)
    }
  }

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/assistant/conversations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConversations(prev => prev.filter(c => c._id !== id))
        if (currentConvId === id) startNewChat()
        showToast('Chat eliminata')
        setToDeleteId(null)
      } else {
        const err = await res.json().catch(() => ({ error: 'Errore' }))
        showToast(err.error || 'Impossibile eliminare la chat', 'error')
      }
    } catch (err: any) {
      showToast('Errore di connessione', 'error')
    }
  }

  const startNewChat = () => {
    setMessages([])
    setCurrentConvId(null)
    setArchiveOpen(false)
    setInput('')
  }

  const sendMessage = async (text?: string) => {
    const query = (text || input).trim()
    if (!query || loading) return
    setInput('')
    setLoading(true)

    // Build conversation history for the API (FIX 3: memoria conversazionale)
    const historyForApi = messages
      .filter((m) => !m.loading)
      .map((m) => {
        if (m.role === 'user') return { role: 'user', content: m.content || '' }
        if (m.books?.length) return { role: 'assistant', content: `Ho consigliato: ${m.books.map((b) => b.title).join(', ')}` }
        return { role: 'assistant', content: m.content || '' }
      })
      .slice(-10) // ultimi 10 messaggi

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: query },
      { role: 'assistant', loading: true },
    ])

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          history: historyForApi,
          conversationId: currentConvId 
        }),
      })

      if (res.status === 401) { router.push('/login'); return }
      const data = await res.json()

      if (data.conversationId && !currentConvId) {
        setCurrentConvId(data.conversationId)
        fetchConversations()
      }

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
      setLibraryBookIds(prev => new Set(prev).add(book._id))
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
            <p className={styles.subtitle}>Consigli personalizzati</p>
          </div>
        </div>
        
        <div className={styles.headerRight}>
          <button 
            className={styles.headerIconBtn} 
            onClick={() => setArchiveOpen(true)}
            aria-label="Cronologia chat"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </button>
          
          <button 
            className={styles.newChatBtn} 
            onClick={startNewChat}
            aria-label="Nuova chat"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Nuova</span>
          </button>
        </div>
      </div>

      <div className={styles.contentArea}>
        {/* Main Chat Area */}
        <div className={styles.chatArea}>
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
                    ? `Ho trovato ${msg.books.length} ${msg.books.length === 1 ? 'consiglio' : 'consigli'} per te`
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
                      
                      {book.matchReason && (
                        <div className={styles.matchReason}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                            <path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1.55.9 2.97 2.5 3.5.76.76 1.23 1.52 1.41 2.5"/>
                          </svg>
                          <span>{book.matchReason}</span>
                        </div>
                      )}

                      <button
                        className={`${styles.addBtn} ${libraryBookIds.has(book._id) ? styles.addedBtn : ''}`}
                        onClick={() => {
                          if (!libraryBookIds.has(book._id)) addToLibrary(book)
                        }}
                        disabled={addingBook === book._id || libraryBookIds.has(book._id)}
                      >
                        {addingBook === book._id ? (
                          <span className={styles.addBtnLoading} />
                        ) : libraryBookIds.has(book._id) ? (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="14" height="14">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Già in libreria
                          </>
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
      </div>

        {/* Archive drawer (Side-by-side) */}
        {archiveOpen && (
          <div className={`${styles.archiveDrawer} ${archiveOpen ? styles.open : ''}`}>
            <div className={styles.archiveHeader}>
              <h3>Le tue chat</h3>
              <button 
                className={styles.closeArchiveBtn} 
                onClick={() => setArchiveOpen(false)}
                aria-label="Chiudi archivio"
              >✕</button>
            </div>
            
            <div className={styles.archiveList}>
              {conversations.length === 0 ? (
                <p className={styles.noArchive}>Nessuna chat salvata</p>
              ) : (
                conversations.map(c => (
                  <div 
                    key={c._id} 
                    className={`${styles.archiveItem} ${currentConvId === c._id ? styles.activeConv : ''}`}
                    onClick={() => loadConversation(c._id)}
                  >
                    <div className={styles.archiveInfo}>
                      <span className={styles.archiveTitle}>{c.title}</span>
                      <span className={styles.archiveDate}>
                        {new Date(c.updatedAt).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                    {toDeleteId === c._id ? (
                      <div className={styles.deleteConfirm}>
                        <button 
                          className={styles.deleteCancelBtn} 
                          onClick={(e) => { e.stopPropagation(); setToDeleteId(null) }}
                        >✕</button>
                        <button 
                          className={styles.deleteConfirmBtn} 
                          onClick={(e) => deleteConversation(e, c._id)}
                        >Elimina</button>
                      </div>
                    ) : (
                      <button 
                        className={styles.deleteConv} 
                        onClick={(e) => { e.stopPropagation(); setToDeleteId(c._id); }}
                        aria-label="Elimina chat"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
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
