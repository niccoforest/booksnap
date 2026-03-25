'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  const [view, setView] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    fetchLibraries()
  }, [])

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
  const filteredBooks = currentLib?.books.filter((b) =>
    statusFilter === 'all' ? true : b.status === statusFilter
  ) || []

  const totalBooks = currentLib?.books.length || 0
  const readCount = currentLib?.books.filter((b) => b.status === 'completed').length || 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>La mia Libreria</h1>
          {currentLib && (
            <p className={styles.subtitle}>
              {totalBooks} libro{totalBooks !== 1 ? 'i' : ''} · {readCount} letti
            </p>
          )}
        </div>
        <button
          className={styles.viewToggle}
          onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
          aria-label="Cambia vista"
        >
          {view === 'grid' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          )}
        </button>
      </div>

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

      {/* Books grid/list */}
      {loading ? (
        <div className={`${styles.grid} ${view === 'list' ? styles.listView : ''}`}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className="skeleton" style={{ aspectRatio: '2/3', borderRadius: '8px' }} />
              <div className="skeleton" style={{ height: '12px', marginTop: '8px', width: '80%' }} />
              <div className="skeleton" style={{ height: '10px', marginTop: '4px', width: '60%' }} />
            </div>
          ))}
        </div>
      ) : filteredBooks.length > 0 ? (
        <div className={`${styles.grid} ${view === 'list' ? styles.listView : ''}`}>
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
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <h3>Nessun libro qui</h3>
          <p className={styles.emptyText}>
            {statusFilter === 'all'
              ? 'Aggiungi il tuo primo libro scansionando la copertina!'
              : `Nessun libro con stato "${STATUS_CONFIG[statusFilter as ReadingStatus]?.label}"`}
          </p>
          {statusFilter === 'all' && (
            <Link href="/scan" className="btn btn-primary">
              Scansiona un libro
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
