'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './LocationInput.module.css'

interface LocationInputProps {
  value: string
  onChange: (value: string) => void
  behindRow: boolean
  onBehindRowChange: (value: boolean) => void
  locations: string[]
  placeholder?: string
  disabled?: boolean
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

  const suggestions = locations.filter(
    (l) => l.toLowerCase().startsWith(value.toLowerCase()) && l.toLowerCase() !== value.toLowerCase()
  )

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
