'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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

export default function ScanPage() {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [addingBook, setAddingBook] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const router = useRouter()

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
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
    if (mode === 'camera') {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [mode, startCamera, stopCamera])

  const captureFromCamera = useCallback(() => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setPreview(dataUrl)
    performScan(dataUrl)
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setPreview(dataUrl)
      performScan(dataUrl)
    }
    reader.readAsDataURL(file)
  }, [])

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

  const addToLibrary = async (bookId: string, title: string) => {
    setAddingBook(bookId)
    try {
      // Get default library first
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
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAddingBook(null)
    }
  }

  const resetScan = () => {
    setResult(null)
    setPreview(null)
    setError(null)
    if (mode === 'camera') startCamera()
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Scansiona</h1>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${mode === 'camera' ? styles.active : ''}`}
            onClick={() => { setMode('camera'); resetScan() }}
          >
            📷 Camera
          </button>
          <button
            className={`${styles.modeBtn} ${mode === 'upload' ? styles.active : ''}`}
            onClick={() => { setMode('upload'); resetScan() }}
          >
            🖼 Galleria
          </button>
        </div>
      </div>

      {/* Camera / Preview area */}
      <div className={styles.viewfinder}>
        {preview ? (
          <img src={preview} alt="Preview" className={styles.previewImg} />
        ) : mode === 'camera' ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={styles.video}
          />
        ) : (
          <div className={styles.uploadArea}>
            <span className={styles.uploadIcon}>📚</span>
            <p>Tocca per selezionare un&apos;immagine</p>
            <label className="btn btn-secondary btn-sm">
              Scegli immagine
              <input type="file" accept="image/*" onChange={handleFileUpload} hidden />
            </label>
          </div>
        )}

        {/* Scanning overlay */}
        {scanning && (
          <div className={styles.scanningOverlay}>
            <div className={styles.scanLine} />
            <p className={styles.scanningText}>Analisi in corso...</p>
          </div>
        )}

        {/* Corner guides */}
        {!preview && mode === 'camera' && (
          <div className={styles.corners}>
            <div className={`${styles.corner} ${styles.tl}`} />
            <div className={`${styles.corner} ${styles.tr}`} />
            <div className={`${styles.corner} ${styles.bl}`} />
            <div className={`${styles.corner} ${styles.br}`} />
          </div>
        )}
      </div>

      {/* Capture button */}
      {!preview && mode === 'camera' && !scanning && (
        <div className={styles.captureArea}>
          <p className={styles.hint}>Inquadra la copertina, la costa o il codice ISBN</p>
          <button className={styles.captureBtn} onClick={captureFromCamera} aria-label="Scatta foto" />
        </div>
      )}

      {/* Results */}
      {result && (
        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <h2>{result.books.length > 0 ? `${result.books.length} libro${result.books.length > 1 ? ' trovati' : ' trovato'}` : 'Nessun libro riconosciuto'}</h2>
            <button className="btn btn-ghost btn-sm" onClick={resetScan}>Riscannerizza</button>
          </div>

          {result.books.map((book) => (
            <div key={book._id} className={styles.bookResult}>
              <div className={styles.bookCoverWrap}>
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} className={styles.bookCover} />
                ) : (
                  <div className={styles.coverPlaceholder}>📖</div>
                )}
              </div>
              <div className={styles.bookInfo}>
                <p className={styles.bookTitle}>{book.title}</p>
                <p className={styles.bookAuthor}>{book.authors.join(', ')}</p>
                {book.isbn && <p className={styles.bookIsbn}>ISBN: {book.isbn}</p>}
                <div className={styles.confidence}>
                  <div className={styles.confidenceBar} style={{ width: `${Math.round(book.confidence * 100)}%` }} />
                  <span>{Math.round(book.confidence * 100)}% sicuro</span>
                </div>
              </div>
              <button
                className={`btn btn-primary btn-sm ${styles.addBtn}`}
                onClick={() => addToLibrary(book._id, book.title)}
                disabled={addingBook === book._id}
              >
                {addingBook === book._id ? '...' : '+'}
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

      {/* Error */}
      {error && (
        <div className={styles.errorBanner}>
          <span>⚠️ {error}</span>
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
