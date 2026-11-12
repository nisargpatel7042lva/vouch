import { NextRequest, NextResponse } from 'next/server'
import { extractFromBuffer } from '@/lib/extract/index'
import { computeClaim, ClaimType, ClaimParams } from '@/lib/claims/index'
import { createProof, ExpiryOption } from '@/lib/proofs/index'
import { generateNonce, fetchAndVerifyAttestation } from '@/lib/near/attest'
import { checkRateLimit } from '@/lib/proofs/rate-limit'

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { allowed } = checkRateLimit(ip)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const claimType = formData.get('claimType') as string | null
    const paramsStr = formData.get('params') as string | null
    const expiryStr = formData.get('expiryHours') as string | null

    if (!file || !claimType || !paramsStr) {
      return NextResponse.json(
        { error: 'Missing required fields: file, claimType, params' },
        { status: 400 }
      )
    }

    // Parse and validate params
    let params: ClaimParams
    try {
      params = JSON.parse(paramsStr) as ClaimParams
    } catch {
      return NextResponse.json({ error: 'params must be valid JSON' }, { status: 400 })
    }

    const expiryHours = ([24, 168, 720].includes(Number(expiryStr))
      ? Number(expiryStr)
      : 168) as ExpiryOption

    // P1: read file into memory, never to disk
    const buffer = Buffer.from(await file.arrayBuffer())

    // Extract transactions (in-memory, P1)
    const extraction = await extractFromBuffer(buffer, file.name)

    // Compute claim (deterministic, P4)
    const disclosure = computeClaim(extraction.transactions, claimType as ClaimType, params)

    // Attest (live NEAR AI Cloud call)
    const nonce = generateNonce()
    const attestation = await fetchAndVerifyAttestation(nonce)

    // Persist proof record (P2: no raw data)
    const { proof, revokeToken } = createProof(disclosure, attestation, expiryHours)

    return NextResponse.json({
      id: proof.id,
      verdict: proof.verdict,
      claimType: proof.claimType,
      currency: proof.currency,
      periodStart: proof.periodStart,
      periodEnd: proof.periodEnd,
      expiresAt: proof.expiresAt,
      createdAt: proof.createdAt,
      attestationPassed: attestation.allPassed,
      revokeToken, // shown once — not stored in plain text
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    const status = message.includes('Unsupported') || message.includes('empty') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
