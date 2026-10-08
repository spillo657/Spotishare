import './globals.css'
import type { Metadata, Viewport } from 'next'
import { ToastProvider } from '@/components/ToastContext'
import OneSignalInitializer from '@/components/OneSignalInitializer'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

export const viewport: Viewport = {
  themeColor: '#0B0B0F',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'SpotiShare • Spotify Family Management',
  description: 'Gestisci e condividi il tuo abbonamento Spotify Family con il tuo gruppo in totale semplicità',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SpotiShare',
  },
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
      <body className="bg-[#0B0B0F] text-zinc-100 antialiased min-h-dvh selection:bg-[#1DB954] selection:text-black">
        <ToastProvider>
          <ServiceWorkerRegister />
          <OneSignalInitializer />
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
