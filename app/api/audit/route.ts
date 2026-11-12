/**
 * POST /api/audit
 * Ephemeral expense audit — extracts, classifies, attests, returns report.
 * Nothing is persisted after this handler returns (P1, P2).
 */
import { NextRequest, NextResponse } from 'next/server'
import { extractFromBuffer } from '@/lib/extract/index'
import { generateNonce, fetchAndVerifyAttestation } from '@/lib/near/attest'
import { buildAuditReport } from '@/lib/audit/index'
import { checkRateLimit } from '@/lib/proofs/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { allowed } = checkRateLimit(ip)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // P1: read into memory, never to disk
    const buffer = Buffer.from(await file.arrayBuffer())
    const extraction = await extractFromBuffer(buffer, file.name)

    // Attest before returning (fresh nonce every request)
    const nonce = generateNonce()
    const attestation = await fetchAndVerifyAttestation(nonce)

    const report = buildAuditReport(
      extraction.transactions,
      extraction.integrityFlags,
      attestation
    )

    // No database write — report is ephemeral
    return NextResponse.json(report)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    const status =
      message.includes('Unsupported') || message.includes('empty') || message.includes('found')
        ? 400
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
