'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

interface User {
  _id: string
  email: string
  username: string
  avatar?: string
  bio?: string
  preferences?: { theme: 'dark' | 'light' }
  isPublic?: boolean
  profileSlug?: string
}

interface TasteProfile {
  genreAffinities: Array<{ genre: string; score: number; bookCount: number; avgRating: number }>
  favoriteAuthors: Array<{ name: string; bookCount: number; avgRating: number }>
  recentlyCompleted: Array<{ title: string; author: string; rating?: number }>
  stats: {
    totalBooks: number
    completedBooks: number
    readingBooks?: number
    toReadBooks?: number
    avgRating: number
    preferredPageRange: string
    topGenres: string[]
    avgPace?: number
    streak?: number
  }
  likedCount?: number
  favoriteCount?: number
}

interface AIInsight {
  type: string
  title: string
  text: string
  icon: string
  value?: number | string
  unit?: string
}

interface AIGoal {
  id: string
  title: string
  description: string
  target: number
  current: number
  unit: string
  difficulty: string
  category: string
  deadline?: string
  tip?: string
}

function DonutChart({ completed, reading, toRead, total }: { completed: number; reading: number; toRead: number; total: number }) {
  const r = 40
  const cx = 60
  const cy = 60
  const circ = 2 * Math.PI * r
  const gap = 3
  const completedLen = total > 0 ? Math.max(0, (completed / total) * circ - gap) : 0
  const readingLen = total > 0 ? Math.max(0, (reading / total) * circ - gap) : 0
  const toReadLen = total > 0 ? Math.max(0, (toRead / total) * circ - gap) : 0
  const completedOffset = 0
  const readingOffset = -(completedLen + gap)
  const toReadOffset = -(completedLen + gap + readingLen + gap)

  return (
    <svg viewBox="0 0 120 120" width="110" height="110" aria-label="Distribuzione libri">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth="13" />
      {total > 0 && (
        <>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth="13"
            strokeDasharray={`${completedLen} ${circ}`} strokeDashoffset={completedOffset}
            transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--status-reading, #3b82f6)" strokeWidth="13"
            strokeDasharray={`${readingLen} ${circ}`} strokeDashoffset={readingOffset}
            transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth="13"
            strokeDasharray={`${toReadLen} ${circ}`} strokeDashoffset={toReadOffset}
            transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />
        </>
      )}
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle"
        fontSize="18" fontWeight="800" fill="var(--text-primary)">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="middle"
        fontSize="9" fontWeight="600" fill="var(--text-muted)">libri</text>
    </svg>
  )
}

function RadarChart({ genres }: { genres: Array<{ genre: string; score: number }> }) {
  const top = genres.slice(0, 6)
  if (top.length < 3) return null
  const cx = 100, cy = 100, maxR = 72
  const n = top.length
  const getPoint = (i: number, r: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }
  const gridLevels = [0.33, 0.66, 1.0]
  const dataPoints = top.map((g, i) => {
    const p = getPoint(i, maxR * (g.score / 100))
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: 200, margin: '0 auto', display: 'block' }} aria-label="Radar generi">
      {gridLevels.map((lvl, li) => (
        <polygon key={li}
          points={Array.from({ length: n }, (_, i) => { const p = getPoint(i, maxR * lvl); return `${p.x},${p.y}` }).join(' ')}
          fill="none" stroke="var(--border)" strokeWidth={li === 2 ? 1.5 : 1} />
      ))}
      {top.map((_, i) => {
        const end = getPoint(i, maxR)
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="var(--border)" strokeWidth="1" />
      })}
      <polygon points={dataPoints} fill="var(--accent)" fillOpacity="0.2" stroke="var(--accent)" strokeWidth="2" />
      {top.map((g, i) => {
        const p = getPoint(i, maxR * (g.score / 100))
        return <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--accent)" />
      })}
      {top.map((g, i) => {
        const lp = getPoint(i, maxR + 16)
        const truncated = g.genre.length > 12 ? g.genre.slice(0, 11) + '…' : g.genre
        return (
          <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="8.5" fill="var(--text-secondary)" fontWeight="600">{truncated}</text>
        )
      })}
    </svg>
  )
}

function getBarColor(score: number): string {
  if (score >= 70) return '#22c55e'
  if (score >= 50) return 'var(--accent)'
  if (score >= 30) return '#f59e0b'
  return '#ef4444'
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(null)
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [goals, setGoals] = useState<AIGoal[]>([])
  const [readingStats, setReadingStats] = useState({ total: 0, completed: 0, reading: 0, to_read: 0 })
  const [theme, setTheme] = useState<'dark' | 'light'>('light')
  const [editGenres, setEditGenres] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    Promise.all([fetchUser(), fetchStats(), fetchTasteProfile(), fetchAIContent()])
    checkNotificationStatus()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.status === 401) { router.push('/login'); return }
      const data = await res.json()
      setUser(data.user)
      setTheme(data.user?.preferences?.theme || 'light')
      setIsPublic(data.user?.isPublic !== false)
    } finally {
      setLoading(false)
    }
  }

  const fetchTasteProfile = async () => {
    try {
      const res = await fetch('/api/profile/taste')
      const data = await res.json()
      if (data.profile) {
        setTasteProfile(data.profile)
      }
    } catch {}
  }

  const fetchAIContent = async () => {
    setAiLoading(true)
    try {
      const [insRes, goalsRes] = await Promise.all([
        fetch('/api/ai/insights'),
        fetch('/api/ai/goals')
      ])
      const insData = await insRes.json()
      const goalsData = await goalsRes.json()
      if (insData.insights) setInsights(insData.insights)
      if (goalsData.goals) setGoals(goalsData.goals)
    } catch {
    } finally {
      setAiLoading(false)
    }
  }

  const checkNotificationStatus = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        const subscription = await registration.pushManager.getSubscription()
        setNotificationsEnabled(!!subscription)
      }
    }
  }

  const toggleNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Le notifiche non sono supportate da questo browser.')
      return
    }

    try {
      if (notificationsEnabled) {
        // Unsubscribe
        const registration = await navigator.serviceWorker.getRegistration()
        const subscription = await registration?.pushManager.getSubscription()
        if (subscription) {
          await subscription.unsubscribe()
          await fetch('/api/notifications/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          })
        }
        setNotificationsEnabled(false)
      } else {
        // Subscribe
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          alert('Permesso notifiche negato.')
          return
        }

        let registration = await navigator.serviceWorker.getRegistration()
        if (!registration) {
          registration = await navigator.serviceWorker.register('/sw.js')
        }
        
        // Wait for registration to be active
        await navigator.serviceWorker.ready

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BPa39...' // TODO: Replace with real public VAPID key
        })
        setNotificationsEnabled(true)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('booksnap-theme', next)
    await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: next }),
    })
  }

  const togglePrivacy = async () => {
    const next = !isPublic
    setIsPublic(next)
    await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: next }),
    })
  }

  const handleOverride = async (genre: string, type: 'boost' | 'suppress' | null) => {
    try {
      await fetch('/api/profile/taste/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre, type }),
      })
      // Refresh taste profile
      fetchTasteProfile()
    } catch {}
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/libraries')
      const data = await res.json()
      const allBooks = data.libraries?.flatMap((l: any) => l.books) || []
      setReadingStats({
        total: allBooks.length,
        completed: allBooks.filter((b: any) => b.status === 'completed').length,
        reading: allBooks.filter((b: any) => b.status === 'reading').length,
        to_read: allBooks.filter((b: any) => b.status === 'to_read').length,
      })
    } catch {}
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const getIcon = (name: string) => {
    switch (name) {
      case 'clock': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      case 'star': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      case 'chart': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      case 'book': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      case 'fire': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.5 3.5 6.5 1 1.5 1.14 3 1.14 3.5a4.3 4.3 0 0 1-4.14 4.5c-2.43 0-2-4-2-4z"/></svg>
      case 'trophy': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
      case 'compass': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
      case 'heart': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      default: return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton}>
          <div className="skeleton" style={{ width: 80, height: 80, borderRadius: '50%' }} />
          <div className="skeleton" style={{ height: 20, width: 140, marginTop: 12 }} />
          <div className="skeleton" style={{ height: 14, width: 100, marginTop: 6 }} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Profile hero */}
      <div className={styles.hero}>
        <div className={styles.avatar}>
          {user?.avatar ? (
            <img src={user.avatar} alt={user.username} />
          ) : (
            <span>{user?.username?.[0]?.toUpperCase() || '?'}</span>
          )}
        </div>
        <h1 className={styles.username}>{user?.username}</h1>
        <p className={styles.email}>{user?.email}</p>
        {user?.bio && <p className={styles.bio}>{user.bio}</p>}
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        {tasteProfile?.stats.avgPace && (
          <div className={styles.statCard}>
            <span className={styles.statValue}>{tasteProfile.stats.avgPace}</span>
            <span className={styles.statLabel}>Giorni/Libro</span>
          </div>
        )}
        {tasteProfile?.stats.streak !== undefined && (
          <div className={styles.statCard}>
            <span className={styles.statValue}>{tasteProfile.stats.streak}</span>
            <span className={styles.statLabel}>Giorni attivi</span>
          </div>
        )}
        {tasteProfile?.stats.avgRating ? (
          <div className={styles.statCard}>
            <span className={styles.statValue}>{tasteProfile.stats.avgRating.toFixed(1)}</span>
            <span className={styles.statLabel}>Voto medio</span>
          </div>
        ) : null}
      </div>

      {/* AI Insights & Goals */}
      <div className={styles.aiDashboard}>
        {/* Reading Insights hidden — feature sospesa, da riprendere */}

        {/* Obiettivi di Lettura hidden — feature sospesa, da riprendere in Fase 7 */}
      </div>

      {/* Taste Profile */}
      {tasteProfile && tasteProfile.stats.totalBooks > 0 && (
        <div className={styles.tasteProfile}>
          <h2 className={styles.sectionTitle}>Il tuo DNA da lettore</h2>

          {/* Donut — distribuzione stati */}
          <div className={styles.donutSection}>
            <DonutChart
              completed={readingStats.completed}
              reading={readingStats.reading}
              toRead={readingStats.to_read}
              total={readingStats.total}
            />
            <div className={styles.donutLegend}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#22c55e' }} />
                <span className={styles.legendLabel}>Letti</span>
                <span className={styles.legendPct}>
                  {readingStats.total > 0 ? Math.round((readingStats.completed / readingStats.total) * 100) : 0}%
                </span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: 'var(--status-reading, #3b82f6)' }} />
                <span className={styles.legendLabel}>In lettura</span>
                <span className={styles.legendPct}>
                  {readingStats.total > 0 ? Math.round((readingStats.reading / readingStats.total) * 100) : 0}%
                </span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#f59e0b' }} />
                <span className={styles.legendLabel}>Da leggere</span>
                <span className={styles.legendPct}>
                  {readingStats.total > 0 ? Math.round((readingStats.to_read / readingStats.total) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Generi */}
          {tasteProfile.genreAffinities.length > 0 && (
            <div className={styles.tasteSection}>
              <div className={styles.subTitleRow}>
                <p className={styles.subTitle}>I tuoi generi</p>
                <button
                  className={`${styles.editToggle} ${editGenres ? styles.editToggleActive : ''}`}
                  onClick={() => setEditGenres(v => !v)}
                  title="Personalizza i pesi dei generi"
                  aria-label="Modifica preferenze generi"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  {editGenres ? 'Fatto' : 'Modifica'}
                </button>
              </div>

              {tasteProfile.genreAffinities.length >= 3 && (
                <div className={styles.radarWrap}>
                  <RadarChart genres={tasteProfile.genreAffinities} />
                </div>
              )}

              <div className={styles.genreBars}>
                {tasteProfile.genreAffinities.slice(0, 6).map(g => (
                  <div key={g.genre} className={styles.genreRow}>
                    <div className={styles.genreLabels}>
                      <span className={styles.genreName}>{g.genre}</span>
                      {editGenres ? (
                        <div className={styles.genreActions}>
                          <button
                            className={styles.gActionText}
                            onClick={() => handleOverride(g.genre, 'suppress')}
                            title="Ricevi meno consigli di questo genere"
                          >
                            − Meno
                          </button>
                          <button
                            className={`${styles.gActionText} ${styles.gActionBoost}`}
                            onClick={() => handleOverride(g.genre, 'boost')}
                            title="Ricevi più consigli di questo genere"
                          >
                            + Di più
                          </button>
                        </div>
                      ) : (
                        <span className={styles.barPct}>{g.score}%</span>
                      )}
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${g.score}%`, background: getBarColor(g.score) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {editGenres && (
                <p className={styles.tasteHint}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  I pulsanti guidano i consigli del Bibliotecario AI
                </p>
              )}
            </div>
          )}

          {/* Autori */}
          {tasteProfile.favoriteAuthors.length > 0 && (
            <div className={styles.tasteSection}>
              <p className={styles.subTitle}>I tuoi autori preferiti</p>
              <ul className={styles.authorList}>
                {tasteProfile.favoriteAuthors.slice(0, 5).map(a => (
                  <li key={a.name} className={styles.authorItem}>
                    <span className={styles.authorName}>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" className={styles.starIcon} aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      {a.name}
                    </span>
                    <span className={styles.authorMeta}>{a.bookCount} {a.bookCount === 1 ? 'libro' : 'libri'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reazioni liked/favorite */}
          {((tasteProfile.likedCount ?? 0) > 0 || (tasteProfile.favoriteCount ?? 0) > 0) && (
            <div className={styles.tasteSection}>
              <p className={styles.subTitle}>Le tue reazioni</p>
              <div className={styles.reactionChips}>
                {(tasteProfile.likedCount ?? 0) > 0 && (
                  <div className={styles.reactionChip}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" className={styles.heartIcon} aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    <span>{tasteProfile.likedCount} piaciuti</span>
                  </div>
                )}
                {(tasteProfile.favoriteCount ?? 0) > 0 && (
                  <div className={`${styles.reactionChip} ${styles.reactionChipStar}`}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" className={styles.starIconYellow} aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span>{tasteProfile.favoriteCount} preferiti</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Menu */}
      <div className={styles.menu}>
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Libreria</p>
          <a href="/library" className={styles.menuItem}>
            <span className={styles.menuItemLeft}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              Le mie librerie
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
          <a href="/scan" className={styles.menuItem}>
            <span className={styles.menuItemLeft}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
                <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
                <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
                <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                <rect x="8" y="8" width="8" height="8" rx="1"/>
              </svg>
              Scansiona libro
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Privacy e Community</p>
          <button className={styles.menuItem} onClick={togglePrivacy}>
            <span className={styles.menuItemLeft}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Profilo pubblico
            </span>
            <div className={`${styles.toggle} ${isPublic ? styles.toggleOn : ''}`}>
              <div className={styles.toggleCircle} />
            </div>
          </button>
          {isPublic && user?.profileSlug && (
             <div className={styles.slugInfo}>
               <span>Il tuo link pubblico:</span>
               <code>booksnap.it/user/{user.profileSlug}</code>
             </div>
          )}
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Account</p>
          <button className={styles.menuItem} onClick={toggleTheme}>
            <span className={styles.menuItemLeft}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
                {theme === 'dark' ? (
                  <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"/>
                ) : (
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                )}
              </svg>
              {theme === 'dark' ? 'Modalità chiara' : 'Modalità scura'}
            </span>
          </button>
          
          {/* Notifiche Smart hidden — feature incompleta, da riprendere */}
          <button className={`${styles.menuItem} ${styles.danger}`} onClick={handleLogout}>
            <span className={styles.menuItemLeft}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="18" height="18">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Esci
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
