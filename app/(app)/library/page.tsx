'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Recommendations from '@/components/Recommendations'
import styles from './page.module.css'

type ReadingStatus = 'to_read' | 'reading' | 'completed' | 'abandoned' | 'lent'

const STATUS_CONFIG: Record<ReadingStatus, { label: string; dot: string; className: string }> = {
  to_read: { label: 'Da leggere', dot: '#f59e0b', className: 'status-to-read' },
  reading: { label: 'In lettura', dot: '#3b82f6', className: 'status-reading' },
  completed: { label: 'Completato', dot: '#22c55e', className: 'status-completed' },
  abandoned: { label: 'Abbandonato', dot: '#ef4444', className: 'status-abandoned' },
  lent: { label: 'Prestato', dot: '#a855f7', className: 'status-lent' },
}

interface BookEntry {
  bookId: {
    _id: string
    title: string
    authors: string[]
    coverUrl?: string
    publishedYear?: number
  }
  status: ReadingStatus
  rating?: number
  addedAt: string
}

interface Library {
  _id: string
  name: string
  emoji: string
  isDefault: boolean
  books: BookEntry[]
}

const STATUS_FILTERS: Array<ReadingStatus | 'all'> = ['all', 'reading', 'to_read', 'completed', 'abandoned', 'lent']

export default function LibraryPage() {
  const [libraries, setLibraries] = useState<Library[]>([])
  const [selectedLib, setSelectedLib] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchLibraries()
  }, [])

  // When search opens, focus input
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setSearchQuery('')
    }
  }, [searchOpen])

  const fetchLibraries = async () => {
    try {
      const res = await fetch('/api/libraries')
      if (res.status === 401) { window.location.href = '/login'; return }
      const data = await res.json()
      setLibraries(data.libraries || [])
      const def = data.libraries?.find((l: Library) => l.isDefault)
      if (def) setSelectedLib(def._id)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const currentLib = libraries.find((l) => l._id === selectedLib)

  const filteredBooks = (currentLib?.books || []).filter((b) => {
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter
    const q = searchQuery.trim().toLowerCase()
    const matchesQuery = !q ||
      b.bookId.title.toLowerCase().includes(q) ||
      b.bookId.authors?.some((a) => a.toLowerCase().includes(q))
    return matchesStatus && matchesQuery
  })

  // Predictive suggestions: top 5 titles matching current query
  const suggestions = searchQuery.trim().length > 0
    ? (currentLib?.books || [])
        .filter(b =>
          b.bookId.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.bookId.authors?.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 5)
    : []

  const totalBooks = currentLib?.books.length || 0
  const readCount = currentLib?.books.filter((b) => b.status === 'completed').length || 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={`${styles.headerTitle} ${searchOpen ? styles.hidden : ''}`}>
          <h1 className={styles.title}>La mia Libreria</h1>
          {currentLib && (
            <p className={styles.subtitle}>
              {totalBooks} libr{totalBooks !== 1 ? 'i' : 'o'} · {readCount} lett{readCount !== 1 ? 'i' : 'o'}
            </p>
          )}
        </div>

        <div className={`${styles.searchExpand} ${searchOpen ? styles.searchOpen : ''}`}>
          {searchOpen ? (
            <>
              <div className={styles.searchInputWrap}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className={styles.searchIcon}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.searchInput}
                  placeholder="Cerca titolo o autore..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
                />
                {searchQuery && (
                  <button className={styles.searchClear} onClick={() => setSearchQuery('')} aria-label="Cancella">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
              <button className={styles.searchCloseBtn} onClick={() => setSearchOpen(false)}>
                Chiudi
              </button>
            </>
          ) : (
            <button
              className={styles.searchIconBtn}
              onClick={() => setSearchOpen(true)}
              aria-label="Cerca"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Predictive suggestions dropdown */}
      {searchOpen && suggestions.length > 0 && (
        <div className={styles.suggestions}>
          {suggestions.map((entry) => (
            <Link
              key={entry.bookId._id}
              href={`/book/${entry.bookId._id}`}
              className={styles.suggestionItem}
              onClick={() => setSearchOpen(false)}
            >
              <div className={styles.suggestionCover}>
                {entry.bookId.coverUrl ? (
                  <img src={entry.bookId.coverUrl} alt={entry.bookId.title} />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                )}
              </div>
              <div className={styles.suggestionInfo}>
                <span className={styles.suggestionTitle}>{entry.bookId.title}</span>
                <span className={styles.suggestionAuthor}>{entry.bookId.authors?.[0]}</span>
              </div>
              <span className={styles.suggestionStatus} style={{ background: STATUS_CONFIG[entry.status].dot }} />
            </Link>
          ))}
        </div>
      )}

      {/* Recommendations — hidden when searching */}
      {!searchOpen && <Recommendations />}

      {/* Library tabs */}
      {libraries.length > 1 && (
        <div className={styles.libTabs}>
          {libraries.map((lib) => (
            <button
              key={lib._id}
              className={`${styles.libTab} ${selectedLib === lib._id ? styles.active : ''}`}
              onClick={() => setSelectedLib(lib._id)}
            >
              {lib.name}
            </button>
          ))}
        </div>
      )}

      {/* Status filters */}
      <div className={styles.filters}>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            className={`${styles.filterChip} ${statusFilter === s ? styles.active : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'Tutti' : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Books grid */}
      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className="skeleton" style={{ aspectRatio: '2/3', borderRadius: '8px' }} />
              <div className="skeleton" style={{ height: '12px', marginTop: '8px', width: '80%' }} />
              <div className="skeleton" style={{ height: '10px', marginTop: '4px', width: '60%' }} />
            </div>
          ))}
        </div>
      ) : filteredBooks.length > 0 ? (
        <div className={styles.grid}>
          {filteredBooks.map((entry) => (
            <Link key={entry.bookId._id} href={`/book/${entry.bookId._id}`} className={styles.bookCard}>
              <div className={styles.coverWrap}>
                {entry.bookId.coverUrl ? (
                  <img src={entry.bookId.coverUrl} alt={entry.bookId.title} className={styles.cover} />
                ) : (
                  <div className={styles.coverPlaceholder}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                  </div>
                )}
                <span
                  className={styles.statusOverlay}
                  style={{ background: STATUS_CONFIG[entry.status].dot }}
                  title={STATUS_CONFIG[entry.status].label}
                />
                {entry.rating && (
                  <div className={styles.ratingOverlay}>
                    {'★'.repeat(entry.rating)}
                  </div>
                )}
              </div>
              <div className={styles.bookMeta}>
                <p className={styles.bookTitle}>{entry.bookId.title}</p>
                <p className={styles.bookAuthor}>{entry.bookId.authors?.[0] || '—'}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
              {searchQuery ? (
                <>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </>
              ) : (
                <>
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </>
              )}
            </svg>
          </div>
          <h3>{searchQuery ? 'Nessun risultato' : 'Nessun libro qui'}</h3>
          <p className={styles.emptyText}>
            {searchQuery
              ? `Nessun libro corrisponde a "${searchQuery}"`
              : statusFilter === 'all'
                ? 'Aggiungi il tuo primo libro scansionando la copertina!'
                : `Nessun libro con stato "${STATUS_CONFIG[statusFilter as ReadingStatus]?.label}"`}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Link href="/scan" className="btn btn-primary">
              Scansiona un libro
            </Link>
          )}
          {searchQuery && (
            <button className="btn btn-ghost btn-sm" onClick={() => setSearchQuery('')}>
              Cancella ricerca
            </button>
          )}
        </div>
      )}
    </div>
  )
}
