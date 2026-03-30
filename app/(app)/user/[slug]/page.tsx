'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

interface PublicProfile {
  username: string
  avatar?: string
  bio?: string
  isFollowing: boolean
  followerCount: number
  followingCount: number
  stats: {
    totalBooks: number
    completedBooks: number
    avgRating: number
  }
  recentBooks: Array<{
    title: string
    author: string
    coverUrl?: string
    status: string
  }>
}

export default function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [followLoading, setFollowLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchProfile()
  }, [slug])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/users/profile/${slug}`)
      if (res.status === 404) { setError('Profilo non trovato o privato'); return }
      const data = await res.json()
      setProfile(data.profile)
    } catch (err) {
      setError('Errore di caricamento')
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!profile || followLoading) return
    setFollowLoading(true)
    try {
      const res = await fetch(`/api/users/profile/${slug}/follow`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setProfile(prev => prev ? { 
          ...prev, 
          isFollowing: data.isFollowing,
          followerCount: data.followerCount 
        } : null)
      }
    } catch (err) {
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) return <div className={styles.loading}>Caricamento profilo...</div>
  if (error) return <div className={styles.error}>{error}</div>
  if (!profile) return null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className={styles.headerTitle}>Profilo</h1>
      </header>

      <div className={styles.hero}>
        <div className={styles.avatar}>
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.username} />
          ) : (
            <span>{profile.username[0].toUpperCase()}</span>
          )}
        </div>
        <h2 className={styles.username}>{profile.username}</h2>
        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
        
        <div className={styles.followStats}>
          <div className={styles.stat}>
            <strong>{profile.followerCount}</strong>
            <span>follower</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <strong>{profile.followingCount}</strong>
            <span>following</span>
          </div>
        </div>

        <button 
          className={`${styles.followBtn} ${profile.isFollowing ? styles.following : ''}`}
          onClick={handleFollow}
          disabled={followLoading}
        >
          {profile.isFollowing ? 'Segui già' : 'Segui'}
        </button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <span className={styles.statVal}>{profile.stats.totalBooks}</span>
          <span className={styles.statLab}>Libri</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statVal}>{profile.stats.completedBooks}</span>
          <span className={styles.statLab}>Letti</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statVal}>{profile.stats.avgRating}</span>
          <span className={styles.statLab}>Media</span>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Letture Recenti</h3>
        <div className={styles.bookGrid}>
          {profile.recentBooks.map((book, i) => (
            <div key={i} className={styles.bookCard}>
               <div className={styles.coverWrap}>
                 {book.coverUrl ? (
                   <img src={book.coverUrl} alt={book.title} />
                 ) : (
                   <div className={styles.placeholder} />
                 )}
               </div>
               <p className={styles.bookTitle}>{book.title}</p>
               <p className={styles.bookAuthor}>{book.author}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
