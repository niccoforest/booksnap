import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: 'BookSnap',
  description: 'Scansiona, cataloga e organizza la tua biblioteca personale',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f8f9fa',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Prevent FOUC: apply saved theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('booksnap-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}` }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
