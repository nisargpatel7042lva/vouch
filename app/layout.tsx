import type { Metadata } from 'next'
import { Inter_Tight } from 'next/font/google'
import './globals.css'

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-inter-tight',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Vouch – Prove financial facts without sharing documents',
  description:
    'Share the proof, not the document. Vouch lets you prove income, balance, or runway to landlords, lenders or DAOs — verified by a hardware-secured TEE.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={interTight.variable}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
