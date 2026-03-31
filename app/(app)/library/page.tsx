'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Recommendations from '@/components/Recommendations'
import { isFuzzyMatch } from '@/lib/fuzzy'
import styles from './page.module.css'

type ReadingStatus = 'to_read' | 'reading' | 'completed' | 'abandoned' | 'lent'

type SortOption = 'addedAt' | 'title' | 'author' | 'rating' | 'status'

const STATUS_CONFIG: Record<ReadingStatus, { label: string; className: string }> = {
  to_read: { label: 'Da leggere', className: 'status-to-read' },
  reading: { label: 'In lettura', className: 'status-reading' },
  completed: { label: 'Completato', className: 'status-completed' },
  abandoned: { label: 'Abbandonato', className: 'status-abandoned' },
  lent: { label: 'Prestato', className: 'status-lent' },
}

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'addedAt', label: 'Recenti' },
  { value: 'title', label: 'Titolo A-Z' },
  { value: 'author', label: 'Autore A-Z' },
  { value: 'rating', label: 'Valutazione' },
]

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
  const [sortBy, setSortBy] = useState<SortOption>('addedAt')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isAiSearching, setIsAiSearching] = useState(false)
  const [aiSearchResults, setAiSearchResults] = useState<any[] | null>(null)

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

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) return
    setIsAiSearching(true)
    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      })
      const data = await res.json()
      if (data.books) {
        setAiSearchResults(data.books)
      }
    } catch {
      console.error('AI Search failed')
    } finally {
      setIsAiSearching(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setAiSearchResults(null)
  }

  const filteredBooks = aiSearchResults ? 
    aiSearchResults : 
    (currentLib?.books || [])
    .filter((b) => {
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter
      const q = searchQuery.trim()
      if (!q) return matchesStatus

      const titleMatch = isFuzzyMatch(b.bookId.title, q)
      const authorMatch = b.bookId.authors?.some((a) => isFuzzyMatch(a, q))

      return matchesStatus && (titleMatch || authorMatch)
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.bookId.title.localeCompare(b.bookId.title, 'it')
        case 'author':
          return (a.bookId.authors?.[0] || '').localeCompare(b.bookId.authors?.[0] || '', 'it')
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'addedAt':
        default:
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      }
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
        
        {aiSearchResults && !searchOpen && (
          <div className={styles.aiSearchIndicator}>
            <span>Risultati Smart Search per "{searchQuery}"</span>
            <button className={styles.clearAiBtn} onClick={clearSearch}>X</button>
          </div>
        )}

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
                  onChange={(e) => { setSearchQuery(e.target.value); setAiSearchResults(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                />
                {searchQuery && (
                  <button className={styles.searchClear} onClick={clearSearch} aria-label="Cancella">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
              <button
                className={`${styles.aiSearchBtn} ${isAiSearching ? styles.spinning : ''}`}
                onClick={handleAiSearch}
                disabled={isAiSearching || !searchQuery.trim()}
                aria-label="Cerca con intelligenza artificiale"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                  <path d="M12 2l2 6h6l-5 3.6L17 18l-5-3.6L7 18l2-6.4L4 8h6z"/>
                </svg>
                {isAiSearching ? 'Cerco...' : 'Cerca con AI'}
              </button>
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
              <span className={`${styles.suggestionStatus} ${STATUS_CONFIG[entry.status].className}`} />
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

      {/* Status filters + sort/view controls */}
      <div className={styles.controlsRow}>
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
        <div className={styles.sortRow}>
          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="Ordina per"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            className={styles.viewToggle}
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            aria-label={viewMode === 'grid' ? 'Vista lista' : 'Vista griglia'}
          >
            {viewMode === 'grid' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
            )}
          </button>
        </div>
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
        viewMode === 'grid' ? (
          <div className={`${styles.grid} stagger-children`}>
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
                    className={`${styles.statusOverlay} ${STATUS_CONFIG[entry.status as ReadingStatus].className}`}
                    title={STATUS_CONFIG[entry.status as ReadingStatus].label}
                  />
                  {entry.status === 'reading' && (
                    <div className={styles.readingBar}>
                      <div className={styles.readingBarFill} />
                    </div>
                  )}
                  <div className={styles.coverGradient} />
                </div>
                <div className={styles.bookMeta}>
                  <p className={styles.bookTitle}>{entry.bookId.title}</p>
                  <p className={styles.bookAuthor}>{entry.bookId.authors?.[0] || '—'}</p>
                  {entry.rating && (
                    <p className={styles.bookRating}>
                      {'★'.repeat(entry.rating)}<span>{'★'.repeat(5 - entry.rating)}</span>
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={`${styles.listView} stagger-children`}>
            {filteredBooks.map((entry) => (
              <Link key={entry.bookId._id} href={`/book/${entry.bookId._id}`} className={styles.listItem}>
                <div className={styles.listCoverWrap}>
                  {entry.bookId.coverUrl ? (
                    <img src={entry.bookId.coverUrl} alt={entry.bookId.title} className={styles.listCover} />
                  ) : (
                    <div className={styles.listCoverPlaceholder}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className={styles.listInfo}>
                  <p className={styles.listTitle}>{entry.bookId.title}</p>
                  <p className={styles.listAuthor}>{entry.bookId.authors?.[0] || '—'}</p>
                  {entry.rating && (
                    <p className={styles.bookRating}>
                      {'★'.repeat(entry.rating)}<span>{'★'.repeat(5 - entry.rating)}</span>
                    </p>
                  )}
                </div>
                <span className={`${styles.listStatus} ${STATUS_CONFIG[entry.status as ReadingStatus].className}`} />
              </Link>
            ))}
          </div>
        )
      ) : (
        <div className={styles.empty}>
          <div className={styles.emptyIllustration}>
            {/* Elegant SVG illustration of a book shelf/stack */}
            <svg viewBox="0 0 200 160" fill="none" width="180" height="144">
              <rect x="40" y="100" width="120" height="8" rx="4" fill="var(--border)" />
              <rect x="50" y="40" width="24" height="60" rx="2" fill="var(--accent-dim)" stroke="var(--accent)" strokeWidth="1.5" />
              <rect x="78" y="30" width="20" height="70" rx="2" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5" />
              <rect x="102" y="50" width="22" height="50" rx="2" fill="var(--bg-secondary)" stroke="var(--border)" strokeWidth="1.5" />
              <rect x="128" y="45" width="20" height="55" rx="2" fill="var(--accent-dim)" opacity="0.5" stroke="var(--accent)" strokeWidth="1.5" />
              <circle cx="160" cy="40" r="15" fill="var(--accent-dim)" />
              <path d="M152 40h16M160 32v16" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className={styles.emptyTitle}>
            {searchQuery ? 'Nessun risultato' : 'La tua libreria è vuota'}
          </h3>
          <p className={styles.emptyText}>
            {searchQuery
              ? `Non abbiamo trovato nulla per "${searchQuery}". Prova con un'altra ricerca.`
              : statusFilter === 'all'
                ? 'Inizia a costruire la tua collezione scansionando i codici a barre o le copertine dei tuoi libri.'
                : `Non hai ancora libri contrassegnati come "${STATUS_CONFIG[statusFilter as ReadingStatus]?.label}".`}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <div className={styles.emptyActions}>
              <Link href="/scan" className="btn btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  <rect x="8" y="8" width="8" height="8" rx="1" />
                </svg>
                Scansiona un libro
              </Link>
              <Link href="/search" className="btn btn-secondary">
                Cerca nel catalogo
              </Link>
            </div>
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
