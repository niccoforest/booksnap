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
  const [libraryIds, setLibraryIds] = useState<Set<string>>(new Set())
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [genre, setGenre] = useState('')
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')
  const [lang, setLang] = useState('')
  const [pagesMin, setPagesMin] = useState('')
  const [pagesMax, setPagesMax] = useState('')
  const [sortBy, setSortBy] = useState('relevance')

  // AI Search state
  const [isAiSearch, setIsAiSearch] = useState(false)
  const [aiParsedParams, setAiParsedParams] = useState<Record<string, unknown> | null>(null)

  // Discovery data
  const [discoveryData, setDiscoveryData] = useState<any[]>([])
  const [discoveryLoading, setDiscoveryLoading] = useState(false)

  useEffect(() => {
    fetchLibrary()
    if (initialQuery) {
      performSearch(initialQuery)
    } else {
      fetchDiscovery()
    }
  }, [])

  const fetchDiscovery = async () => {
    setDiscoveryLoading(true)
    try {
      const res = await fetch('/api/books/discovery')
      const data = await res.json()
      setDiscoveryData(data.discovery || [])
    } catch (e) {
      console.error(e)
    } finally {
      setDiscoveryLoading(false)
    }
  }

  // Rileva se la query è in linguaggio naturale (>3 parole o contiene termini descrittivi)
  const isNaturalLanguageQuery = (q: string): boolean => {
    const words = q.trim().split(/\s+/)
    if (words.length > 3) return true
    const descriptiveTerms = ['ambientato', 'come', 'simile', 'tipo', 'scritto', 'ispirato', 'stile', 'atmosfera', 'genere', 'racconta', 'storia', 'anni', 'recente', 'antico', 'breve', 'lungo', 'leggero', 'pesante', 'dark', 'romantico', 'distopico', 'storico', 'fantasy', 'thriller', 'giallo', 'horror']
    return descriptiveTerms.some(t => q.toLowerCase().includes(t))
  }

  // Autocomplete logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        fetchSuggestions(query)
      } else {
        setSuggestions([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

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
    if (page === 1) setResults([])

    // Filtri manuali attivi → forza ricerca classica
    const hasManualFilters = genre || yearFrom || yearTo || lang || pagesMin || pagesMax
    const useAI = !hasManualFilters && page === 1 && isNaturalLanguageQuery(q)
    setIsAiSearch(useAI)

    try {
      if (useAI) {
        const res = await fetch('/api/search/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q }),
        })
        const data = await res.json()
        setResults(data.books || [])
        setAiParsedParams(data.parsedParams || null)
        setHasMore(false) // AI search non ha paginazione
      } else {
        setAiParsedParams(null)
        const params = new URLSearchParams()
        if (q) params.set('q', q)
        if (genre) params.set('genre', genre)
        if (yearFrom) params.set('yearFrom', yearFrom)
        if (yearTo) params.set('yearTo', yearTo)
        if (lang) params.set('lang', lang)
        if (pagesMin) params.set('pagesMin', pagesMin)
        if (pagesMax) params.set('pagesMax', pagesMax)
        params.set('sortBy', sortBy)
        params.set('page', page.toString())
        params.set('limit', '20')

        const res = await fetch(`/api/books?${params.toString()}`)
        const data = await res.json()

        if (page === 1) {
          setResults(data.books || [])
        } else {
          setResults(prev => [...prev, ...(data.books || [])])
        }

        if (!data.books || data.books.length < 20) setHasMore(false)
        else setHasMore(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Effect to perform search when page changes
  useEffect(() => {
    if (page > 1) performSearch()
  }, [page])

  const handleSearchClick = () => {
    setPage(1)
    performSearch()
    setShowSuggestions(false)
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

        {isAiSearch && !loading && results.length > 0 && (
          <div className={styles.aiSearchBadge}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            Ricerca AI
          </div>
        )}
        {loading && isAiSearch && (
          <div className={styles.aiSearchBadge}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            Ricerca AI in corso...
          </div>
        )}

        <div className={styles.toggles}>
          <button className={`${styles.filterToggle} ${showFilters ? styles.active : ''}`} onClick={() => setShowFilters(!showFilters)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filtri
          </button>
          
          <div className={styles.sortCol}>
            <select 
              className={styles.sortSelect} 
              value={sortBy} 
              onChange={(e) => {
                setSortBy(e.target.value)
                setTimeout(() => performSearch(), 50)
              }}
            >
              <option value="relevance">Rilevanza</option>
              <option value="title">Titolo A-Z</option>
              <option value="author">Autore A-Z</option>
              <option value="year">Anno</option>
              <option value="pages">N. pagine</option>
            </select>
          </div>
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
        {query.trim().length === 0 && !loading && (
          <div className={styles.discovery}>
            {discoveryLoading ? (
              <div className={styles.discoverySkeleton}>
                {[1, 2].map(i => (
                  <div key={i} className={styles.categorySkeleton}>
                    <div className="skeleton" style={{ height: '20px', width: '120px', marginBottom: '12px' }} />
                    <div className={styles.carouselSkeleton}>
                      {[1, 2, 3].map(j => (
                        <div key={j} className="skeleton" style={{ width: '120px', height: '180px', borderRadius: '8px' }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              discoveryData.map((section) => (
                <div key={section.genre} className={section.books.length > 0 ? styles.discoverySection : styles.hidden}>
                  <h2 className={styles.sectionTitle}>In voga: {section.genre}</h2>
                  <div className={styles.carousel}>
                    {section.books.map((book: any) => (
                      <Link key={book._id} href={`/book/${book._id}`} className={styles.discoveryCard}>
                        <div className={styles.discoveryCover}>
                          {book.coverUrl ? (
                            <img src={book.coverUrl} alt={book.title} />
                          ) : (
                            <div className={styles.discoveryPlaceholder}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                              </svg>
                            </div>
                          )}
                          {libraryIds.has(book._id) && (
                            <div className={styles.cardBadge}>✓</div>
                          )}
                        </div>
                        <p className={styles.cardTitle}>{book.title}</p>
                        <p className={styles.cardAuthor}>{book.authors?.[0]}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {query.trim().length > 0 && results.map((book) => (
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
              <div className={styles.bookHeader}>
                <h3 className={styles.bookTitle}>{book.title}</h3>
                {libraryIds.has(book._id) && (
                  <span className={styles.ownedCompactBadge} title="In libreria">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="10" height="10">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                )}
              </div>
              <p className={styles.bookAuthor}>{book.authors?.[0]}</p>
              <div className={styles.bookMeta}>
                {book.publishedYear && <span className={styles.metaItem}>{book.publishedYear}</span>}
                {book.pageCount && <span className={styles.metaItem}>{book.pageCount} pag.</span>}
                {book.language && <span className={styles.metaItem} style={{ textTransform: 'uppercase' }}>{book.language}</span>}
              </div>
              
              <div className={styles.actions}>
                  <Link href={`/book/${book._id}`} className={styles.btnPrimary}>
                    Vedi dettagli
                  </Link>
                  {libraryIds.has(book._id) && (
                    <span className={styles.ownedText}>In libreria</span>
                  )}
              </div>
            </div>
          </div>
        ))}
        
        {query.trim().length > 0 && hasMore && results.length > 0 && (
          <button 
            className={styles.loadMoreBtn} 
            onClick={() => setPage(prev => prev + 1)}
            disabled={loading}
          >
            {loading ? 'Caricamento...' : 'Carica altri'}
          </button>
        )}
        {query.trim().length > 0 && !loading && results.length === 0 && (
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
