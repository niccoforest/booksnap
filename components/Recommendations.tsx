import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './Recommendations.module.css'

interface Recommendation {
  _id: string
  title: string
  author: string
  matchReason: string
  coverUrl?: string
}

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // To optimistically hide/show 'added' status
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set())
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchRecommendations()
    fetchLibraryIds()
  }, [])

  const fetchLibraryIds = async () => {
    try {
      const res = await fetch('/api/libraries')
      const data = await res.json()
      const def = data.libraries?.find((l: any) => l.isDefault) || data.libraries?.[0]
      if (def) {
        setAddedIds(new Set(def.books.map((b: any) => b.bookId._id || b.bookId)))
      }
    } catch (e) {}
  }

  const fetchRecommendations = async (refresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/recommendations${refresh ? '?refresh=true' : ''}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setRecommendations(data.recommendations || [])
    } catch (err) {
      console.error(err)
      setError('Impossibile caricare i suggerimenti.')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.MouseEvent, bookId: string) => {
    e.preventDefault()
    e.stopPropagation() // prevent navigating to /book/[id]
    if (addedIds.has(bookId)) return
    
    setAddingIds(prev => new Set(prev).add(bookId))
    try {
      const libRes = await fetch('/api/libraries')
      const libData = await libRes.json()
      const defaultLib = libData.libraries?.find((l: any) => l.isDefault) || libData.libraries?.[0]
      if (!defaultLib) throw new Error('No library found')

      const res = await fetch(`/api/libraries/${defaultLib._id}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, status: 'to_read' }),
      })

      if (res.ok) {
        setAddedIds(prev => new Set(prev).add(bookId))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAddingIds(prev => { const next = new Set(prev); next.delete(bookId); return next })
    }
  }

  if (loading && recommendations.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
           <h2 className={styles.title}>Consigliati per te</h2>
        </div>
        <div className={styles.scrollArea}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.cardSkeleton}>
              <div className="skeleton" style={{ width: '100%', aspectRatio: '2/3', borderRadius: 8 }} />
              <div className={styles.bookMeta}>
                <div className="skeleton" style={{ width: '80%', height: 12, marginBottom: 4 }} />
                <div className="skeleton" style={{ width: '60%', height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!loading && recommendations.length === 0 && !error) return null

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Consigliati per te</h2>
      </div>
      
      {error && <p className={styles.error}>{error}</p>}
      
      <div className={styles.scrollArea}>
        {recommendations.map((rec) => {
          const isAdded = addedIds.has(rec._id)
          const isAdding = addingIds.has(rec._id)
          
          return (
            <Link key={rec._id} href={`/book/${rec._id}`} className={styles.bookCard} title={rec.matchReason}>
              <div className={styles.coverWrap}>
                {rec.coverUrl ? (
                  <img src={rec.coverUrl} alt={rec.title} className={styles.cover} />
                ) : (
                  <div className={styles.coverPlaceholder}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                  </div>
                )}
                
                <button 
                  className={`${styles.addBtn} ${isAdded ? styles.addBtnLight : ''}`}
                  onClick={(e) => handleAdd(e, rec._id)}
                  aria-label={isAdded ? "Aggiunto" : "Aggiungi"}
                >
                  {isAdding ? (
                    <span className={styles.spinner} />
                  ) : isAdded ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="14" height="14">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  )}
                </button>
              </div>
              
              <div className={styles.bookMeta}>
                <p className={styles.bookTitle}>{rec.title}</p>
                <p className={styles.bookAuthor}>{rec.author}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
