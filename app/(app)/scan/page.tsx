'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

interface ScannedBook {
  _id: string
  title: string
  authors: string[]
  coverUrl?: string
  isbn?: string
  publisher?: string
  publishedYear?: number
  confidence: number
}

interface ScanResult {
  type: string
  books: ScannedBook[]
}

interface HistoryEntry {
  _id: string
  scanType: string
  books: {
    bookId: string
    title: string
    authors: string[]
    coverUrl?: string
    confidence: number
    addedToLibrary: boolean
  }[]
  imageThumbnail?: string
  scannedAt: string
}

type Tab = 'scan' | 'history'

export default function ScanPage() {
  const [tab, setTab] = useState<Tab>('scan')
  const [mode, setMode] = useState<'camera' | 'upload'>('camera')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [addingBook, setAddingBook] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [libraryBookIds, setLibraryBookIds] = useState<Set<string>>(new Set())

  // Fetch library on mount to check which books are already added
  useEffect(() => {
    const fetchLib = async () => {
      try {
        const res = await fetch('/api/libraries')
        if (!res.ok) return
        const data = await res.json()
        const def = data.libraries?.find((l: any) => l.isDefault) || data.libraries?.[0]
        if (def) {
          setLibraryBookIds(new Set(def.books.map((b: any) => b.bookId._id || b.bookId)))
        }
      } catch (e) {}
    }
    fetchLib()
  }, [])

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [clearingHistory, setClearingHistory] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const router = useRouter()

  // ── Camera ──────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      setError('Camera non disponibile. Usa il caricamento immagine.')
      setMode('upload')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    if (tab === 'scan' && mode === 'camera') {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [tab, mode, startCamera, stopCamera])

  // Immersive camera: hide BottomNav when camera is active
  useEffect(() => {
    const isImmersive = tab === 'scan' && mode === 'camera' && !result
    document.body.classList.toggle('camera-active', isImmersive)
    return () => document.body.classList.remove('camera-active')
  }, [tab, mode, result])

  // ── Image helpers ────────────────────────────────────────
  const resizeImage = useCallback((dataUrl: string, maxDim = 1920): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image()
      img.onload = () => {
        const { width, height } = img
        if (width <= maxDim && height <= maxDim) { resolve(dataUrl); return }
        const scale = maxDim / Math.max(width, height)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(width * scale)
        canvas.height = Math.round(height * scale)
        const ctx = canvas.getContext('2d')!
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.92))
      }
      img.src = dataUrl
    })
  }, [])

  const captureFromCamera = useCallback(() => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setPreview(dataUrl)
    performScan(dataUrl)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      const resized = await resizeImage(dataUrl, 1920)
      setPreview(resized)
      performScan(resized)
    }
    reader.readAsDataURL(file)
  }, [resizeImage]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scan ─────────────────────────────────────────────────
  const performScan = async (imageBase64: string) => {
    setScanning(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      })
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return }
        const err = await res.json()
        throw new Error(err.error || 'Errore durante la scansione')
      }
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setScanning(false)
    }
  }

  const resetScan = () => {
    setResult(null)
    setPreview(null)
    setError(null)
    if (mode === 'camera') startCamera()
  }

  // ── Add to library ───────────────────────────────────────
  const addToLibrary = async (bookId: string, title: string) => {
    setAddingBook(bookId)
    try {
      const libRes = await fetch('/api/libraries')
      const libData = await libRes.json()
      const defaultLib = libData.libraries?.find((l: any) => l.isDefault) || libData.libraries?.[0]
      if (!defaultLib) throw new Error('Nessuna libreria trovata')

      const res = await fetch(`/api/libraries/${defaultLib._id}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, status: 'to_read' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Errore')
      }
      setSuccessMsg(`"${title}" aggiunto alla libreria!`)
      setLibraryBookIds(prev => new Set(prev).add(bookId))
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAddingBook(null)
    }
  }

  // ── History ───────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/scan/history')
      if (!res.ok) { if (res.status === 401) { router.push('/login'); return } throw new Error() }
      const data = await res.json()
      setHistory(data.history || [])
    } catch {
      setError('Errore nel caricamento della cronologia')
    } finally {
      setHistoryLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab, loadHistory])

  const loadFromHistory = (entry: HistoryEntry) => {
    // Map history book data back to the active scan result format
    setResult({
      type: entry.scanType,
      books: entry.books.map((b) => ({
        _id: b.bookId,
        title: b.title,
        authors: b.authors,
        coverUrl: b.coverUrl,
        confidence: b.confidence,
      })) as ScannedBook[],
    })
    
    // Switch to upload mode if we have a preview, to avoid camera turning on
    if (entry.imageThumbnail) {
      setPreview(entry.imageThumbnail)
      setMode('upload')
    }
    
    setTab('scan')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearHistory = async () => {
    if (!confirm('Cancellare tutta la cronologia delle scansioni?')) return
    setClearingHistory(true)
    try {
      await fetch('/api/scan/history', { method: 'DELETE' })
      setHistory([])
    } catch {
      setError('Errore nella cancellazione')
    } finally {
      setClearingHistory(false)
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const scanTypeLabel = (type: string) => {
    const map: Record<string, string> = { cover: 'Copertina', spine: 'Costa', multiple: 'Multiplo', unknown: 'Sconosciuto' }
    return map[type] || type
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Scansiona</h1>
        {tab === 'scan' && !result && (
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeBtn} ${mode === 'camera' ? styles.active : ''}`}
              onClick={() => { setMode('camera'); resetScan() }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Camera
            </button>
            <button
              className={`${styles.modeBtn} ${mode === 'upload' ? styles.active : ''}`}
              onClick={() => { setMode('upload'); resetScan() }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              Galleria
            </button>
          </div>
        )}
      </div>

      {/* Tab switcher - hidden when result is active */}
      {!result && (
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${tab === 'scan' ? styles.tabActive : ''}`}
            onClick={() => setTab('scan')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Scansiona
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'history' ? styles.tabActive : ''}`}
            onClick={() => setTab('history')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Cronologia
            {history.length > 0 && tab !== 'history' && (
              <span className={styles.tabBadge}>{history.length}</span>
            )}
          </button>
        </div>
      )}

      {/* ── TAB SCAN ── */}
      {tab === 'scan' && (
        <>
          <div className={styles.viewfinder}>
            {preview ? (
              <img src={preview} alt="Preview" className={styles.previewImg} />
            ) : mode === 'camera' ? (
              <video ref={videoRef} autoPlay playsInline muted className={styles.video} />
            ) : (
              <div className={styles.uploadArea}>
                <div className={styles.uploadIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <p>Seleziona un&apos;immagine dalla galleria</p>
                <label className="btn btn-secondary btn-sm">
                  Scegli immagine
                  <input type="file" accept="image/*" onChange={handleFileUpload} hidden />
                </label>
              </div>
            )}
            {scanning && (
              <div className={styles.scanningOverlay}>
                <div className={styles.scanLine} />
                <p className={styles.scanningText}>Analisi in corso...</p>
              </div>
            )}
            {!preview && mode === 'camera' && (
              <div className={styles.corners}>
                <div className={`${styles.corner} ${styles.tl}`} />
                <div className={`${styles.corner} ${styles.tr}`} />
                <div className={`${styles.corner} ${styles.bl}`} />
                <div className={`${styles.corner} ${styles.br}`} />
              </div>
            )}
          </div>

          {!preview && mode === 'camera' && !scanning && (
            <div className={styles.captureArea}>
              <p className={styles.hint}>Inquadra la copertina, la costa o il codice ISBN</p>
              <button className={styles.captureBtn} onClick={captureFromCamera} aria-label="Scatta foto" />
            </div>
          )}

          {result && (
            <div className={styles.results}>
              <div className={styles.resultsHeader}>
                <h2>{result.books.length > 0
                  ? `${result.books.length} ${result.books.length === 1 ? 'libro trovato' : 'libri trovati'}`
                  : 'Nessun libro riconosciuto'}
                </h2>
                <button className="btn btn-ghost btn-sm" onClick={resetScan}>Chiudi</button>
              </div>

              {result.books.map((book) => (
                <div key={book._id} className={styles.bookResult}>
                  <div className={styles.bookCoverWrap}>
                    {book.coverUrl ? (
                      <img src={book.coverUrl} alt={book.title} className={styles.bookCover} />
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
                    <p className={styles.bookTitle}>{book.title}</p>
                    <p className={styles.bookAuthor}>{book.authors.join(', ')}</p>
                    {book.isbn && <p className={styles.bookIsbn}>ISBN: {book.isbn}</p>}
                    <div className={styles.confidence}>
                      <div className={styles.confidenceBar} style={{ '--c-width': `${Math.round(book.confidence * 100)}%` } as any} />
                      <span className={styles.confidenceText}>{Math.round(book.confidence * 100)}%</span>
                    </div>
                  </div>
                  <button
                    className={`btn btn-primary btn-sm ${styles.addBtn} ${libraryBookIds.has(book._id) ? styles.addedBtn : ''}`}
                    onClick={() => {
                      if (!libraryBookIds.has(book._id)) addToLibrary(book._id, book.title)
                    }}
                    disabled={addingBook === book._id || libraryBookIds.has(book._id)}
                    aria-label={`Aggiungi ${book.title} alla libreria`}
                  >
                    {addingBook === book._id ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className={styles.spinning}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                    ) : libraryBookIds.has(book._id) ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="14" height="14">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : '+'}
                  </button>
                </div>
              ))}

              {result.books.length === 0 && (
                <div className={styles.noResult}>
                  <p>Prova con un&apos;altra angolazione o carica un&apos;immagine più nitida.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── TAB HISTORY ── */}
      {tab === 'history' && (
        <div className={styles.historyTab}>
          <div className={styles.historyHeader}>
            <span className={styles.historyCount}>
              {history.length === 0 ? 'Nessuna scansione' : `${history.length} ${history.length === 1 ? 'scansione' : 'scansioni'}`}
            </span>
            {history.length > 0 && (
              <button
                className={`btn btn-ghost btn-sm ${styles.clearBtn}`}
                onClick={clearHistory}
                disabled={clearingHistory}
              >
                {clearingHistory ? 'Cancellazione…' : 'Cancella tutto'}
              </button>
            )}
          </div>

          {historyLoading ? (
            <div className={styles.historyLoading}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`${styles.historySkeleton} skeleton`} />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className={styles.historyEmpty}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <p>Nessuna scansione effettuata</p>
              <button className="btn btn-primary btn-sm" onClick={() => setTab('scan')}>
                Inizia a scansionare
              </button>
            </div>
          ) : (
            <div className={styles.historyList}>
              {history.map((entry) => (
                <div 
                  key={entry._id} 
                  className={styles.historyEntry} 
                  onClick={() => loadFromHistory(entry)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && loadFromHistory(entry)}
                >
                  {/* Thumbnail */}
                  <div className={styles.historyThumb}>
                    {entry.imageThumbnail ? (
                      <img src={entry.imageThumbnail} alt="Scansione" className={styles.historyThumbImg} />
                    ) : (
                      <div className={styles.historyThumbPlaceholder}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className={styles.historyInfo}>
                    <div className={styles.historyMeta}>
                      <span className={styles.historyType}>{scanTypeLabel(entry.scanType)}</span>
                      <span className={styles.historyDate}>{formatDate(entry.scannedAt)}</span>
                    </div>
                    <div className={styles.historyBooks}>
                      {entry.books.slice(0, 3).map((b, i) => (
                        <div key={i} className={styles.historyBookRow}>
                          {b.coverUrl && (
                            <img src={b.coverUrl} alt={b.title} className={styles.historyBookCover} />
                          )}
                          <div className={styles.historyBookInfo}>
                            <span className={styles.historyBookTitle}>{b.title}</span>
                            {b.authors.length > 0 && (
                              <span className={styles.historyBookAuthor}>{b.authors[0]}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {entry.books.length > 3 && (
                        <p className={styles.historyMore}>+{entry.books.length - 3} altri</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className={styles.errorBanner}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Success toast */}
      {successMsg && (
        <div className="toast-container">
          <div className="toast toast-success">{successMsg}</div>
        </div>
      )}
    </div>
  )
}
