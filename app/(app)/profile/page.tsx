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
}

interface Stats {
  total: number
  completed: number
  reading: number
  to_read: number
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, reading: 0, to_read: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    Promise.all([fetchUser(), fetchStats()])
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.status === 401) { router.push('/login'); return }
      const data = await res.json()
      setUser(data.user)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/libraries')
      const data = await res.json()
      const allBooks = data.libraries?.flatMap((l: any) => l.books) || []
      setStats({
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
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statLabel}>Totale</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.completed}</span>
          <span className={styles.statLabel}>Letti</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.reading}</span>
          <span className={styles.statLabel}>In lettura</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.to_read}</span>
          <span className={styles.statLabel}>Da leggere</span>
        </div>
      </div>

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
          <p className={styles.sectionTitle}>Account</p>
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
