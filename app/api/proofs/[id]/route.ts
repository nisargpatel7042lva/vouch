import { NextRequest, NextResponse } from 'next/server'
import { getProof, isExpired, isRevoked } from '@/lib/proofs/index'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const proof = getProof(id)

  if (!proof) {
    return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
  }

  if (isRevoked(proof)) {
    return NextResponse.json(
      { error: 'This proof has been revoked by its creator', reason: 'revoked', id },
      { status: 410 }
    )
  }

  if (isExpired(proof)) {
    return NextResponse.json(
      { error: 'This proof has expired', reason: 'expired', id, expiresAt: proof.expiresAt },
      { status: 410 }
    )
  }

  return NextResponse.json({
    id: proof.id,
    verdict: proof.verdict,
    claimType: proof.claimType,
    disclosure: proof.disclosure,
    attestationSummary: proof.attestationSummary,
    currency: proof.currency,
    periodStart: proof.periodStart,
    periodEnd: proof.periodEnd,
    expiresAt: proof.expiresAt,
    createdAt: proof.createdAt,
  })
}
