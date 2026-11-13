import type { Metadata } from 'next'
import AboutClient from './AboutClient'

export const metadata: Metadata = {
  title: 'About — Vouch',
  description: 'Privacy-first financial verification powered by NEAR AI and hardware-sealed Trusted Execution Environments.',
}

export default function AboutPage() {
  return <AboutClient />
}
