'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { isFuzzyMatch } from '@/lib/fuzzy'
import styles from './page.module.css'

interface BookRec {
  _id: string
  title: string
  authors: string[]
  publishedYear?: number
  genres: string[]
  description: string
  coverUrl?: string
  pageCount?: number
  language?: string
}

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<BookRec[]>([])
  const [loading, setLoading] = useState(false)
  const [searchContext, setSearchContext] = useState<'all' | 'library'>('all')
  const [libraryIds, setLibraryIds] = useState<Set<string>>(new Set())
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [genre, setGenre] = useState('')
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')
  const [lang, setLang] = useState('')
  const [pagesMin, setPagesMin] = useState('')
  const [pagesMax, setPagesMax] = useState('')

  useEffect(() => {
    fetchLibrary()
    if (initialQuery) {
      performSearch(initialQuery)
    }
  }, [])

  // Autocomplete logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2 && searchContext === 'all') {
        fetchSuggestions(query)
      } else {
        setSuggestions([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, searchContext])

  const fetchSuggestions = async (q: string) => {
    try {
      const res = await fetch(`/api/books/autocomplete?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSuggestions(data.suggestions || [])
      setShowSuggestions(true)
    } catch {}
  }

  const fetchLibrary = async () => {
    try {
      const res = await fetch('/api/libraries')
      const data = await res.json()
      const def = data.libraries?.find((l: any) => l.isDefault) || data.libraries?.[0]
      if (def) {
        setLibraryIds(new Set(def.books.map((b: any) => b.bookId._id || b.bookId)))
      }
    } catch {}
  }

  const performSearch = async (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : query
    
    setLoading(true)
    try {
      if (searchContext === 'all') {
        const params = new URLSearchParams()
        if (q) params.set('q', q)
        if (genre) params.set('genre', genre)
        if (yearFrom) params.set('yearFrom', yearFrom)
        if (yearTo) params.set('yearTo', yearTo)
        if (lang) params.set('lang', lang)
        if (pagesMin) params.set('pagesMin', pagesMin)
        if (pagesMax) params.set('pagesMax', pagesMax)
        
        const res = await fetch(`/api/books?${params.toString()}`)
        const data = await res.json()
        setResults(data.books || [])
      } else {
        // Library search falls back to simple filter over a fresh DB fetch of library books
        // For simplicity, we just fetch the libraries again or rely on the populated data.
        const res = await fetch(`/api/libraries`)
        const data = await res.json()
        const def = data.libraries?.find((l: any) => l.isDefault) || data.libraries?.[0]
        
        if (def) {
          const books = def.books.map((b: any) => b.bookId)
          let filtered = books
          if (q) {
            filtered = books.filter((b: any) => 
               isFuzzyMatch(b.title, q) || 
               b.authors?.some((a: string) => isFuzzyMatch(a, q))
            )
          }
          if (genre) filtered = filtered.filter((b: any) => b.genres?.includes(genre))
          if (lang) filtered = filtered.filter((b: any) => b.language === lang)
          setResults(filtered)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Ricerca Libri</h1>
      </div>

      <div className={styles.searchBlock}>
        <div className={styles.searchRow}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Cerca per titolo, autore..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                performSearch()
                setShowSuggestions(false)
              }
            }}
            onFocus={() => query.length >= 2 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className={styles.suggestions}>
              {suggestions.map((s) => (
                <Link key={s._id} href={`/book/${s._id}`} className={styles.suggestionItem}>
                  <div className={styles.suggestionCover}>
                    {s.coverUrl ? (
                      <img src={s.coverUrl} alt={s.title} />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                      </svg>
                    )}
                  </div>
                  <div className={styles.suggestionInfo}>
                    <p className={styles.suggestionTitle}>{s.title}</p>
                    <p className={styles.suggestionAuthor}>{s.authors?.[0]}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <button className={styles.searchBtn} onClick={() => performSearch()} disabled={loading}>
            {loading ? '...' : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            )}
          </button>
        </div>

        <div className={styles.toggles}>
          <button 
            className={`${styles.toggle} ${searchContext === 'all' ? styles.active : ''}`}
            onClick={() => setSearchContext('all')}
          >
            Tutti i libri
          </button>
          <button 
            className={`${styles.toggle} ${searchContext === 'library' ? styles.active : ''}`}
            onClick={() => setSearchContext('library')}
          >
            I miei libri
          </button>
          
          <button className={`${styles.filterToggle} ${showFilters ? styles.active : ''}`} onClick={() => setShowFilters(!showFilters)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filtri
          </button>
        </div>

        {showFilters && (
          <div className={styles.filtersBlock}>
            <input className={styles.filterInput} placeholder="Genere" value={genre} onChange={e => setGenre(e.target.value)} />
            <input className={styles.filterInput} placeholder="Lingua (it, en)" value={lang} onChange={e => setLang(e.target.value)} />
            <div className={styles.filterRow}>
              <input className={styles.filterInput} placeholder="Anno da" value={yearFrom} onChange={e => setYearFrom(e.target.value)} />
              <input className={styles.filterInput} placeholder="Anno a" value={yearTo} onChange={e => setYearTo(e.target.value)} />
            </div>
            <div className={styles.filterRow}>
              <input className={styles.filterInput} placeholder="Pagine Min" value={pagesMin} onChange={e => setPagesMin(e.target.value)} />
              <input className={styles.filterInput} placeholder="Pagine Max" value={pagesMax} onChange={e => setPagesMax(e.target.value)} />
            </div>
            <button className={styles.applyFilterBtn} onClick={() => performSearch()}>Applica filtri</button>
          </div>
        )}
      </div>

      <div className={styles.resultsArea}>
        {results.map((book) => (
          <div key={book._id} className={styles.bookCard}>
            <div className={styles.coverWrap}>
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} className={styles.cover} />
              ) : (
                <div className={styles.coverPlaceholder}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </div>
              )}
            </div>
            <div className={styles.bookInfo}>
              <h3 className={styles.bookTitle}>{book.title}</h3>
              <p className={styles.bookAuthor}>{book.authors?.[0]}</p>
              <div className={styles.bookGenres}>
                {book.genres?.slice(0, 3).map(g => (
                  <span key={g} className={styles.genre}>{g}</span>
                ))}
              </div>
              <div className={styles.actions}>
                 <Link href={`/book/${book._id}`} className={styles.btnPrimary}>
                   Dettagli
                 </Link>
                 {libraryIds.has(book._id) && (
                   <span className={styles.inLibraryBadge}>✓ In Libreria</span>
                 )}
              </div>
            </div>
          </div>
        ))}
        {!loading && results.length === 0 && (
          <div className={styles.empty}>
            <p>Nessun libro trovato.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Caricamento ricerca...</div>}>
      <SearchContent />
    </Suspense>
  )
}
