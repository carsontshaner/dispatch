import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dispatch — Newsletter Generator',
  description: 'Generate authentic newsletters for your local business in seconds.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0D0D0D' }}>
        {children}
      </body>
    </html>
  )
}
