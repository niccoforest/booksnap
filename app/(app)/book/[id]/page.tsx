'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

type ReadingStatus = 'to_read' | 'reading' | 'completed' | 'abandoned' | 'lent'

const STATUS_CONFIG: Record<ReadingStatus, { label: string; color: string }> = {
  to_read: { label: 'Da leggere', color: '#f59e0b' },
  reading: { label: 'In lettura', color: '#3b82f6' },
  completed: { label: 'Completato', color: '#22c55e' },
  abandoned: { label: 'Abbandonato', color: '#ef4444' },
  lent: { label: 'Prestato', color: '#a855f7' },
}

const STATUS_OPTIONS: ReadingStatus[] = ['to_read', 'reading', 'completed', 'abandoned', 'lent']

interface BookDetail {
  _id: string
  title: string
  authors: string[]
  coverUrl?: string
  publisher?: string
  publishedYear?: number
  genres: string[]
  description?: string
  pageCount?: number
  isbn?: string
}

interface LibraryEntry {
  libraryId: string
  bookId: string
  status: ReadingStatus
  rating?: number
  review?: string
  tags: string[]
}

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [book, setBook] = useState<BookDetail | null>(null)
  const [entry, setEntry] = useState<LibraryEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [review, setReview] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { id } = await params
    try {
      // Fetch book
      const bookRes = await fetch(`/api/books/${id}`)
      if (bookRes.status === 404) { router.push('/library'); return }
      const bookData = await bookRes.json()
      setBook(bookData.book)

      // Check if in library
      const libRes = await fetch('/api/libraries')
      if (libRes.status === 401) { router.push('/login'); return }
      const libData = await libRes.json()

      for (const lib of libData.libraries || []) {
        const found = lib.books?.find((b: any) => {
          const bId = b.bookId?._id?.toString() || b.bookId?.toString()
          return bId === id
        })
        if (found) {
          setEntry({ libraryId: lib._id, bookId: id, ...found })
          setReview(found.review || '')
          break
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const updateEntry = async (updates: Partial<LibraryEntry>) => {
    if (!entry) return
    setSaving(true)
    try {
      await fetch(`/api/libraries/${entry.libraryId}/books`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: entry.bookId, ...updates }),
      })
      setEntry((prev) => prev ? { ...prev, ...updates } : null)
    } finally {
      setSaving(false)
    }
  }

  const saveReview = () => {
    updateEntry({ review })
    setShowReview(false)
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton}>
          <div className="skeleton" style={{ width: '100%', height: 350 }} />
        </div>
      </div>
    )
  }

  if (!book) return null

  return (
    <div className={styles.page}>
      {/* Back button */}
      <button className={styles.backBtn} onClick={() => router.back()} aria-label="Indietro">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Hero cover */}
      <div className={styles.hero}>
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={book.title} className={styles.cover} />
        ) : (
          <div className={styles.coverPlaceholder}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
        )}
        <div className={styles.heroGlow} />
      </div>

      {/* Info */}
      <div className={styles.content}>
        <div className={styles.mainInfo}>
          <h1 className={styles.title}>{book.title}</h1>
          <p className={styles.authors}>{book.authors.join(', ')}</p>

          {book.genres.length > 0 && (
            <div className={styles.genres}>
              {book.genres.map((g) => (
                <span key={g} className={styles.genre}>{g}</span>
              ))}
            </div>
          )}

          <div className={styles.metaRow}>
            {book.publishedYear && <span>{book.publishedYear}</span>}
            {book.publisher && <span>· {book.publisher}</span>}
            {book.pageCount && <span>· {book.pageCount} pag</span>}
          </div>
        </div>

        {/* Status selector */}
        {entry && (
          <div className={styles.statusSection}>
            <p className={styles.sectionLabel}>Stato lettura</p>
            <div className={styles.statusOptions}>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  className={`${styles.statusOption} ${entry.status === s ? styles.active : ''}`}
                  onClick={() => updateEntry({ status: s })}
                  disabled={saving}
                  style={entry.status === s ? { borderColor: STATUS_CONFIG[s].color, color: STATUS_CONFIG[s].color } : undefined}
                >
                  <span
                    style={{
                      display: 'inline-block', width: 8, height: 8,
                      borderRadius: '50%', background: STATUS_CONFIG[s].color, flexShrink: 0
                    }}
                  />
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rating */}
        {entry && (
          <div className={styles.ratingSection}>
            <p className={styles.sectionLabel}>Valutazione</p>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`${styles.star} ${entry.rating && entry.rating >= star ? styles.filled : ''}`}
                  onClick={() => updateEntry({ rating: star })}
                  aria-label={`${star} stelle`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Review */}
        {entry && (
          <div className={styles.reviewSection}>
            <div className={styles.reviewHeader}>
              <p className={styles.sectionLabel}>La mia recensione</p>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowReview(!showReview)}>
                {showReview ? 'Chiudi' : entry.review ? 'Modifica' : 'Aggiungi'}
              </button>
            </div>
            {showReview ? (
              <div className={styles.reviewEdit}>
                <textarea
                  className={`input ${styles.textarea}`}
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Scrivi le tue impressioni su questo libro..."
                  rows={4}
                />
                <button className="btn btn-primary btn-sm" onClick={saveReview}>Salva</button>
              </div>
            ) : entry.review ? (
              <p className={styles.reviewText}>{entry.review}</p>
            ) : null}
          </div>
        )}

        {/* Description */}
        {book.description && (
          <div className={styles.description}>
            <p className={styles.sectionLabel}>Descrizione</p>
            <p className={styles.descText}>{book.description}</p>
          </div>
        )}

        {/* Meta details */}
        <div className={styles.details}>
          {book.isbn && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>ISBN</span>
              <span>{book.isbn}</span>
            </div>
          )}
          {book.publisher && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Editore</span>
              <span>{book.publisher}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
