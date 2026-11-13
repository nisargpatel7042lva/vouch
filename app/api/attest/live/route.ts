export const maxDuration = 30

import { NextResponse } from 'next/server'
import { generateNonce, fetchAndVerifyAttestation } from '@/lib/near/attest'

export async function GET() {
  try {
    const nonce = generateNonce()
    const result = await fetchAndVerifyAttestation(nonce)
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Attestation failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
