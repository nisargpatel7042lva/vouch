import { notFound } from 'next/navigation'
import VerifierClient from './VerifierClient'

export const dynamic = 'force-dynamic'

export default async function VerifierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!/^[0-9a-f]{32}$/.test(id)) {
    notFound()
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/proofs/${id}`, { cache: 'no-store' })

  if (res.status === 404) notFound()

  const data = await res.json() as Record<string, unknown>
  const status = res.status

  return <VerifierClient id={id} initialData={data} initialStatus={status} />
}
