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
            <span>📚 Le mie librerie</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
          <a href="/scan" className={styles.menuItem}>
            <span>📷 Scansiona libro</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Account</p>
          <button className={`${styles.menuItem} ${styles.danger}`} onClick={handleLogout}>
            <span>🚪 Esci</span>
          </button>
        </div>
      </div>
    </div>
  )
}
