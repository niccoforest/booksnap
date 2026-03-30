'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Activity {
  _id: string
  userId: { _id: string; username: string; avatar?: string; profileSlug: string }
  type: 'book_added' | 'book_finished' | 'book_rated' | 'goal_achieved'
  bookId?: { _id: string; title: string; authors: string[]; coverUrl?: string }
  payload?: any
  createdAt: string
}

interface TrendingBook {
  bookId: string
  count: number
  title: string
  authors: string[]
  coverUrl?: string
}

interface Bookshelf {
  _id: string
  userId: { username: string; profileSlug: string }
  title: string
  description?: string
  books: Array<{ _id: string; title: string; coverUrl?: string }>
  createdAt: string
}

interface Challenge {
  _id: string
  createdBy: { username: string; profileSlug: string }
  title: string
  description?: string
  type: 'book_count' | 'genre' | 'pages'
  goal: number
  genre?: string
  endDate: string
  participantCount: number
  isJoined: boolean
  ownProgress: number
}

type Tab = 'feed' | 'trending' | 'shelves' | 'challenges'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHALLENGE_TYPE_LABEL: Record<string, string> = {
  book_count: 'libri',
  pages: 'pagine',
  genre: 'libri',
}

function daysLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ActivityCard({ act }: { act: Activity }) {
  const userLink = `/user/${act.userId.profileSlug}`
  const bookLink = act.bookId ? `/book/${act.bookId._id}` : '#'

  const ACTION: Record<string, string> = {
    book_added: 'ha aggiunto alla libreria',
    book_finished: 'ha finito di leggere',
    book_rated: `ha valutato ${act.payload?.rating || 0} stelle`,
    goal_achieved: 'ha raggiunto un obiettivo',
  }

  return (
    <div className={styles.activityCard}>
      <div className={styles.activityHeader}>
        <Link href={userLink} className={styles.userAvatar}>
          {act.userId.avatar
            ? <img src={act.userId.avatar} alt={act.userId.username} />
            : <span>{act.userId.username[0].toUpperCase()}</span>}
        </Link>
        <div className={styles.activityMeta}>
          <Link href={userLink} className={styles.actUsername}>{act.userId.username}</Link>
          <span className={styles.actAction}>{ACTION[act.type]}</span>
        </div>
        <span className={styles.actTime}>
          {new Date(act.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {act.bookId && (
        <Link href={bookLink} className={styles.actBook}>
          <div className={styles.actCover}>
            {act.bookId.coverUrl
              ? <img src={act.bookId.coverUrl} alt={act.bookId.title} />
              : <div className={styles.coverPlaceholder} />}
          </div>
          <div className={styles.actBookInfo}>
            <p className={styles.actBookTitle}>{act.bookId.title}</p>
            <p className={styles.actBookAuthor}>{act.bookId.authors?.[0]}</p>
          </div>
        </Link>
      )}
    </div>
  )
}

function TrendingCard({ book }: { book: TrendingBook }) {
  return (
    <Link href={`/book/${book.bookId}`} className={styles.trendingCard}>
      <div className={styles.trendingCover}>
        {book.coverUrl
          ? <img src={book.coverUrl} alt={book.title} />
          : <div className={styles.coverPlaceholder} />}
      </div>
      <div className={styles.trendingInfo}>
        <p className={styles.trendingTitle}>{book.title}</p>
        <p className={styles.trendingAuthor}>{book.authors?.[0]}</p>
        <span className={styles.trendingCount}>{book.count} aggiunte</span>
      </div>
    </Link>
  )
}

function ShelfCard({ shelf }: { shelf: Bookshelf }) {
  const covers = shelf.books.slice(0, 4)
  return (
    <div className={styles.shelfCard}>
      <div className={styles.shelfCovers}>
        {covers.map((b, i) => (
          <div key={b._id} className={styles.shelfCoverItem}>
            {b.coverUrl
              ? <img src={b.coverUrl} alt={b.title} />
              : <div className={styles.coverPlaceholder} />}
          </div>
        ))}
        {Array.from({ length: Math.max(0, 4 - covers.length) }).map((_, idx) => (
          <div key={`empty-${idx}`} className={`${styles.shelfCoverItem} ${styles.shelfCoverEmpty}`} />
        ))}
      </div>
      <div className={styles.shelfInfo}>
        <p className={styles.shelfTitle}>{shelf.title}</p>
        {shelf.description && <p className={styles.shelfDesc}>{shelf.description}</p>}
        <p className={styles.shelfMeta}>
          <Link href={`/user/${shelf.userId.profileSlug}`} className={styles.shelfAuthor}>
            {shelf.userId.username}
          </Link>
          {' · '}{shelf.books.length} libri · {formatDate(shelf.createdAt)}
        </p>
      </div>
    </div>
  )
}

function ChallengeCard({ challenge, onToggle }: { challenge: Challenge; onToggle: (id: string) => void }) {
  const progress = Math.min(100, (challenge.ownProgress / challenge.goal) * 100)
  const days = daysLeft(challenge.endDate)
  const typeLabel = CHALLENGE_TYPE_LABEL[challenge.type] || 'libri'

  return (
    <div className={styles.challengeCard}>
      <div className={styles.challengeHeader}>
        <div>
          <p className={styles.challengeTitle}>{challenge.title}</p>
          {challenge.description && <p className={styles.challengeDesc}>{challenge.description}</p>}
        </div>
        <button
          className={`${styles.joinBtn} ${challenge.isJoined ? styles.joinedBtn : ''}`}
          onClick={() => onToggle(challenge._id)}
        >
          {challenge.isJoined ? 'Partecipo' : 'Unisciti'}
        </button>
      </div>

      <div className={styles.challengeMeta}>
        <span className={styles.challengeGoal}>
          Obiettivo: {challenge.goal} {challenge.genre ? `"${challenge.genre}"` : typeLabel}
        </span>
        <span className={styles.challengeEnd}>{days > 0 ? `${days} giorni rimasti` : 'Scaduta'}</span>
      </div>

      {challenge.isJoined && (
        <div className={styles.progressWrap}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }} />
          <span className={styles.progressText}>{challenge.ownProgress}/{challenge.goal}</span>
        </div>
      )}

      <div className={styles.challengeFooter}>
        <span className={styles.challengeParticipants}>{challenge.participantCount} partecipanti</span>
        <Link href={`/user/${challenge.createdBy.profileSlug}`} className={styles.challengeCreator}>
          di {challenge.createdBy.username}
        </Link>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('feed')

  const [activities, setActivities] = useState<Activity[]>([])
  const [trending, setTrending] = useState<TrendingBook[]>([])
  const [shelves, setShelves] = useState<Bookshelf[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])

  const [loading, setLoading] = useState(true)
  const [showNewChallenge, setShowNewChallenge] = useState(false)
  const [newChallenge, setNewChallenge] = useState({ title: '', description: '', type: 'book_count', goal: 10, genre: '', startDate: '', endDate: '' })
  const [showNewShelf, setShowNewShelf] = useState(false)
  const [newShelf, setNewShelf] = useState({ title: '', description: '' })

  const fetchTab = useCallback(async (t: Tab) => {
    setLoading(true)
    try {
      if (t === 'feed') {
        const r = await fetch('/api/activities')
        if (r.ok) setActivities((await r.json()).activities || [])
      } else if (t === 'trending') {
        const r = await fetch('/api/trending')
        if (r.ok) setTrending((await r.json()).trending || [])
      } else if (t === 'shelves') {
        const r = await fetch('/api/bookshelves')
        if (r.ok) setShelves((await r.json()).bookshelves || [])
      } else if (t === 'challenges') {
        const r = await fetch('/api/challenges')
        if (r.ok) setChallenges((await r.json()).challenges || [])
      }
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTab(tab) }, [tab, fetchTab])

  const handleToggleChallenge = async (id: string) => {
    const res = await fetch(`/api/challenges/${id}/join`, { method: 'POST' })
    if (res.status === 401) { router.push('/login'); return }
    if (res.ok) {
      const data = await res.json()
      setChallenges(prev => prev.map(c => c._id === id
        ? { ...c, isJoined: data.isJoined, participantCount: data.participantCount }
        : c
      ))
    }
  }

  const handleCreateShelf = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const res = await fetch('/api/bookshelves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newShelf, isPublic: true }),
    })
    if (res.ok) {
      setShowNewShelf(false)
      setNewShelf({ title: '', description: '' })
      fetchTab('shelves')
    }
  }

  const handleCreateChallenge = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const res = await fetch('/api/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newChallenge, goal: Number(newChallenge.goal) }),
    })
    if (res.ok) {
      setShowNewChallenge(false)
      setNewChallenge({ title: '', description: '', type: 'book_count', goal: 10, genre: '', startDate: '', endDate: '' })
      fetchTab('challenges')
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'feed', label: 'Feed' },
    { id: 'trending', label: 'Trending' },
    { id: 'shelves', label: 'Liste' },
    { id: 'challenges', label: 'Sfide' },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Community</h1>
        <button className={styles.refreshBtn} onClick={() => fetchTab(tab)} disabled={loading} aria-label="Aggiorna">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <path d="M23 4v6h-6m-7 10a10 10 0 1110-10"/>
          </svg>
        </button>
      </header>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {/* FEED */}
        {tab === 'feed' && (
          loading && activities.length === 0 ? (
            <div className={styles.skeletons}>
              {[1, 2, 3].map(i => (
                <div key={i} className={styles.skeletonCard}>
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 60, width: '100%', borderRadius: 8 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className={styles.empty}>
              <p>Nessuna attività recente. Inizia a seguire qualcuno!</p>
            </div>
          ) : (
            activities.map(act => <ActivityCard key={act._id} act={act} />)
          )
        )}

        {/* TRENDING */}
        {tab === 'trending' && (
          loading ? (
            <div className={styles.skeletons}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={styles.skeletonCard}>
                  <div className="skeleton" style={{ width: 54, height: 80, borderRadius: 6 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 12, width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : trending.length === 0 ? (
            <div className={styles.empty}>
              <p>Nessun libro in tendenza questa settimana.</p>
            </div>
          ) : (
            trending.map(book => <TrendingCard key={book.bookId} book={book} />)
          )
        )}

        {/* SHELVES */}
        {tab === 'shelves' && (
          <>
            <button className={styles.newChallengeBtn} onClick={() => setShowNewShelf(v => !v)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nuova lista
            </button>

            {showNewShelf && (
              <form className={styles.newChallengeForm} onSubmit={handleCreateShelf}>
                <input
                  className={styles.formInput}
                  placeholder="Titolo della lista"
                  value={newShelf.title}
                  onChange={e => setNewShelf(p => ({ ...p, title: e.target.value }))}
                  required
                />
                <input
                  className={styles.formInput}
                  placeholder="Descrizione (opzionale)"
                  value={newShelf.description}
                  onChange={e => setNewShelf(p => ({ ...p, description: e.target.value }))}
                />
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Crea lista</button>
              </form>
            )}

            {loading ? (
              <div className={styles.skeletons}>
                {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12, marginBottom: 12 }} />)}
              </div>
            ) : shelves.length === 0 ? (
              <div className={styles.empty}>
                <p>Nessuna lista pubblica ancora. Sii il primo a crearne una!</p>
              </div>
            ) : (
              shelves.map(shelf => <ShelfCard key={shelf._id} shelf={shelf} />)
            )}
          </>
        )}

        {/* CHALLENGES */}
        {tab === 'challenges' && (
          <>
            <button className={styles.newChallengeBtn} onClick={() => setShowNewChallenge(v => !v)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nuova sfida
            </button>

            {showNewChallenge && (
              <form className={styles.newChallengeForm} onSubmit={handleCreateChallenge}>
                <input
                  className={styles.formInput}
                  placeholder="Titolo della sfida"
                  value={newChallenge.title}
                  onChange={e => setNewChallenge(p => ({ ...p, title: e.target.value }))}
                  required
                />
                <input
                  className={styles.formInput}
                  placeholder="Descrizione (opzionale)"
                  value={newChallenge.description}
                  onChange={e => setNewChallenge(p => ({ ...p, description: e.target.value }))}
                />
                <div className={styles.formRow}>
                  <select
                    className={styles.formSelect}
                    value={newChallenge.type}
                    onChange={e => setNewChallenge(p => ({ ...p, type: e.target.value as any }))}
                  >
                    <option value="book_count">Numero libri</option>
                    <option value="genre">Libri per genere</option>
                    <option value="pages">Pagine totali</option>
                  </select>
                  <input
                    className={styles.formInput}
                    type="number"
                    placeholder="Obiettivo"
                    min={1}
                    value={newChallenge.goal}
                    onChange={e => setNewChallenge(p => ({ ...p, goal: Number(e.target.value) }))}
                    required
                  />
                </div>
                {newChallenge.type === 'genre' && (
                  <input
                    className={styles.formInput}
                    placeholder="Genere (es. Fantasy)"
                    value={newChallenge.genre}
                    onChange={e => setNewChallenge(p => ({ ...p, genre: e.target.value }))}
                    required
                  />
                )}
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Inizio</label>
                    <input
                      className={styles.formInput}
                      type="date"
                      value={newChallenge.startDate}
                      onChange={e => setNewChallenge(p => ({ ...p, startDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Fine</label>
                    <input
                      className={styles.formInput}
                      type="date"
                      value={newChallenge.endDate}
                      onChange={e => setNewChallenge(p => ({ ...p, endDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Crea sfida</button>
              </form>
            )}

            {loading ? (
              <div className={styles.skeletons}>
                {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 12, marginBottom: 12 }} />)}
              </div>
            ) : challenges.length === 0 ? (
              <div className={styles.empty}>
                <p>Nessuna sfida attiva. Creane una!</p>
              </div>
            ) : (
              challenges.map(c => <ChallengeCard key={c._id} challenge={c} onToggle={handleToggleChallenge} />)
            )}
          </>
        )}
      </div>
    </div>
  )
}
