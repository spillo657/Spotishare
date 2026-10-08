import './globals.css'
import type { Metadata } from 'next'
import { ToastProvider } from '@/components/ToastContext'
import OneSignalInitializer from '@/components/OneSignalInitializer'

export const metadata: Metadata = {
  title: 'SpotiShare',
  description: 'Gestisci il tuo abbonamento Spotify',
  icons: {
    icon: [
      { url: '/favicon.ico?v=3', sizes: 'any' },
      { url: '/icon.svg?v=3', type: 'image/svg+xml' },
      { url: '/favicon-32.png?v=3', type: 'image/png', sizes: '32x32' },
    ],
    shortcut: '/favicon.ico?v=3',
    apple: '/apple-touch-icon.png?v=3',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#121212' }}>
        <ToastProvider>
          <OneSignalInitializer />
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
