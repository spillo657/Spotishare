import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SpotiShare',
  description: 'Gestisci il tuo abbonamento Spotify',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#121212' }}>
        {children}
      </body>
    </html>
  )
}