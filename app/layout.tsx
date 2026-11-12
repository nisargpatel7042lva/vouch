import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vouch – Prove financial facts without sharing documents',
  description:
    'Share the proof, not the document. Vouch lets you prove financial facts to landlords, lenders or DAOs without revealing your bank statements.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  )
}
