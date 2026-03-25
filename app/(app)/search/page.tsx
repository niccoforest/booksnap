'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface Book {
  _id: string
  title: string
  authors: string[]
  coverUrl?: string
  publishedYear?: number
  genres: string[]
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Book[]>([])
  const [loading, setLoading] = useState(false)
  const debouncedQuery = useDebounce(query, 400)

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }
    search(debouncedQuery)
  }, [debouncedQuery])

  const search = async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/books?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.books || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cerca</h1>
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="search-input"
            type="search"
            className={styles.searchInput}
            placeholder="Titolo, autore, ISBN..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => setQuery('')} aria-label="Cancella">✕</button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {loading && (
          <div className={styles.loadingList}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className="skeleton" style={{ width: 48, height: 72, borderRadius: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 11, width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className={styles.results}>
            {results.map((book) => (
              <Link key={book._id} href={`/book/${book._id}`} className={styles.resultRow}>
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} className={styles.cover} />
                ) : (
                  <div className={styles.coverPlaceholder}>📚</div>
                )}
                <div className={styles.bookInfo}>
                  <p className={styles.bookTitle}>{book.title}</p>
                  <p className={styles.bookAuthor}>{book.authors.join(', ')}</p>
                  {book.publishedYear && (
                    <p className={styles.bookMeta}>{book.publishedYear}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div className={styles.empty}>
            <span>🔍</span>
            <p>Nessun risultato per &ldquo;{query}&rdquo;</p>
            <p className={styles.emptyHint}>Prova a scansionare il libro per aggiungerlo al catalogo</p>
            <Link href="/scan" className="btn btn-primary btn-sm">📷 Scansiona</Link>
          </div>
        )}

        {!query && !loading && (
          <div className={styles.suggestions}>
            <p className={styles.suggestLabel}>Cerca libri nel tuo catalogo</p>
          </div>
        )}
      </div>
    </div>
  )
}
