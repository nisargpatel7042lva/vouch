import { describe, it, expect } from 'vitest'
import { createClient, DEFAULT_TEE_MODEL } from '../../lib/near/client'
import { generateNonce, fetchAndVerifyAttestation } from '../../lib/near/attest'

const hasKey = !!process.env.NEAR_AI_API_KEY

describe.skipIf(!hasKey)('live: NEAR AI Cloud attestation', () => {
  it('fetches and verifies a fresh attestation report', async () => {
    const nonce = generateNonce()
    const result = await fetchAndVerifyAttestation(nonce)

    expect(result.nonce).toBe(nonce)
    expect(result.checks.length).toBeGreaterThan(0)

    for (const check of result.checks) {
      expect(check.passed, `Check "${check.name}" failed: ${check.detail}`).toBe(true)
    }

    expect(result.allPassed).toBe(true)
    expect(result.signingAddress.length).toBeGreaterThan(0)
  }, 30_000)

  it('sends a completion and verifies attestation', async () => {
    const client = createClient()

    const completion = await client.chat.completions.create({
      model: DEFAULT_TEE_MODEL,
      messages: [{ role: 'user', content: 'Reply with one word: verified' }],
      max_tokens: 10,
    })

    expect(completion.choices[0]?.message?.content).toBeTruthy()

    const nonce = generateNonce()
    const result = await fetchAndVerifyAttestation(nonce, DEFAULT_TEE_MODEL)
    expect(result.allPassed).toBe(true)
  }, 60_000)
})
