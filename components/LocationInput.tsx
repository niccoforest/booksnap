'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './LocationInput.module.css'
import { normalizeLocation } from '@/lib/locationUtils'

interface LocationInputProps {
  value: string
  onChange: (value: string) => void
  behindRow: boolean
  onBehindRowChange: (value: boolean) => void
  locations: string[]
  placeholder?: string
  disabled?: boolean
}

/** Levenshtein edit distance between two strings. */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const prev = Array.from({ length: n + 1 }, (_, i) => i)
  const curr = new Array(n + 1).fill(0)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1])
    }
    prev.splice(0, prev.length, ...curr)
  }
  return curr[n]
}

/**
 * Returns true if `query` fuzzy-matches `candidate`.
 * Order of checks (most to least strict):
 *   1. Substring match (case-insensitive)
 *   2. Word-level Levenshtein ≤ tolerance (scales with query length)
 */
function fuzzyMatch(query: string, candidate: string): boolean {
  const q = query.toLowerCase().trim()
  const c = candidate.toLowerCase()
  if (!q) return true
  if (c.includes(q)) return true
  // Typo tolerance: 0 for ≤3 chars, 1 for 4–6, 2 for 7+
  const maxDist = q.length <= 3 ? 0 : q.length <= 6 ? 1 : 2
  if (maxDist > 0) {
    for (const word of c.split(/\s+/)) {
      if (levenshtein(q, word) <= maxDist) return true
    }
  }
  return false
}

/** Lower score = shown first in dropdown. */
function matchScore(query: string, candidate: string): number {
  const q = query.toLowerCase().trim()
  const c = candidate.toLowerCase()
  if (c.startsWith(q)) return 0
  if (c.includes(q)) return 1
  return 2
}

export default function LocationInput({
  value,
  onChange,
  behindRow,
  onBehindRowChange,
  locations,
  placeholder = 'Es. Soggiorno, Scaffale camera…',
  disabled = false,
}: LocationInputProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const suggestions = locations
    .filter((l) => l.toLowerCase() !== value.toLowerCase() && fuzzyMatch(value, l))
    .sort((a, b) => matchScore(value, a) - matchScore(value, b))

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value)
    setOpen(true)
  }

  function handleBlur() {
    const normalized = normalizeLocation(value)
    if (normalized !== value) onChange(normalized)
    // Close dropdown after a short delay so click on suggestion still registers
    setTimeout(() => setOpen(false), 150)
  }

  function handleSelect(loc: string) {
    onChange(loc)
    setOpen(false)
  }

  const showDropdown = open && suggestions.length > 0

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputWrapper} ref={containerRef}>
        <span className={styles.icon} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
        </span>
        <input
          type="text"
          className={styles.input}
          value={value}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-label="Posizione fisica del libro"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
        />
        {value && !disabled && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => { onChange(''); setOpen(false) }}
            aria-label="Cancella posizione"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
        {showDropdown && (
          <ul className={styles.dropdown} role="listbox" aria-label="Suggerimenti posizione">
            {suggestions.map((loc) => (
              <li
                key={loc}
                role="option"
                aria-selected={false}
                className={styles.dropdownItem}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(loc) }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                </svg>
                {loc}
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={behindRow}
          onChange={(e) => onBehindRowChange(e.target.checked)}
          disabled={disabled}
          className={styles.toggleCheckbox}
        />
        <span className={styles.toggleTrack} aria-hidden="true" />
        <span className={styles.toggleLabel}>Fila posteriore</span>
      </label>
    </div>
  )
}
