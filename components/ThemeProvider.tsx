'use client'

import { useEffect } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function syncTheme() {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) return
        const data = await res.json()
        const theme: string = data.user?.preferences?.theme || 'light'
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('booksnap-theme', theme)
      } catch {}
    }
    syncTheme()
  }, [])

  return <>{children}</>
}
