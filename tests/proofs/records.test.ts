import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createProof, getProof, revokeProof, isExpired, isRevoked, ExpiryOption } from '../../lib/proofs/index'
import { closeDb } from '../../lib/proofs/db'
import type { Disclosure } from '../../lib/claims/index'
import type { AttestationResult } from '../../lib/near/attest'
import path from 'path'
import fs from 'fs'

// Use a temporary DB for tests
const TEST_DB = path.join('/tmp', `vouch-test-${process.pid}.db`)

beforeEach(() => {
  process.env.VOUCH_DB_PATH = TEST_DB
  closeDb()
})

afterEach(() => {
  closeDb()
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB)
})

function makeDisclosure(overrides: Partial<Disclosure> = {}): Disclosure {
  return {
    claimType: 'income_floor',
    verdict: true,
    params: { minMonthlyAmount: 3000, months: 3, currency: 'USD' },
    periodStart: '2026-07-01',
    periodEnd: '2026-09-30',
    currency: 'USD',
    integrityFlags: [],
    ...overrides,
  }
}

function makeAttestation(overrides: Partial<AttestationResult> = {}): AttestationResult {
  return {
    allPassed: true,
    checks: [{ name: 'nonce_echo', passed: true, detail: 'ok' }],
    nonce: 'abc123',
    signingAddress: '0xdeadbeef',
    timestamp: new Date().toISOString(),
    summary: '1/1 checks passed',
    ...overrides,
  }
}

describe('createProof + getProof round trip', () => {
  it('creates a proof and retrieves it by id', () => {
    const { proof, revokeToken } = createProof(makeDisclosure(), makeAttestation())

    expect(proof.id).toHaveLength(32) // 16 bytes hex
    expect(typeof revokeToken).toBe('string')
    expect(revokeToken).toHaveLength(64)

    const fetched = getProof(proof.id)
    expect(fetched).not.toBeNull()
    expect(fetched?.id).toBe(proof.id)
    expect(fetched?.verdict).toBe(true)
    expect(fetched?.claimType).toBe('income_floor')
  })

  it('returns null for a nonexistent id', () => {
    expect(getProof('nonexistentid00000000000000000000')).toBeNull()
  })

  it('stores attestation summary (not raw checks)', () => {
    const { proof } = createProof(makeDisclosure(), makeAttestation())
    const fetched = getProof(proof.id)!
    expect(fetched.attestationSummary.checksCount).toBe(1)
    expect(fetched.attestationSummary.checksPassed).toBe(1)
    expect(fetched.attestationSummary.signingAddress).toBe('0xdeadbeef')
  })
})

describe('proof ids are unguessable', () => {
  it('generates 32-character hex ids', () => {
    const { proof } = createProof(makeDisclosure(), makeAttestation())
    expect(proof.id).toMatch(/^[0-9a-f]{32}$/)
  })

  it('generates unique ids for each proof', () => {
    const ids = Array.from({ length: 20 }, () =>
      createProof(makeDisclosure(), makeAttestation()).proof.id
    )
    expect(new Set(ids).size).toBe(20)
  })
})

describe('expiry', () => {
  it('proof is not expired immediately after creation', () => {
    const { proof } = createProof(makeDisclosure(), makeAttestation(), 24)
    expect(isExpired(proof)).toBe(false)
  })

  it('isExpired returns true for a past expiresAt', () => {
    const { proof } = createProof(makeDisclosure(), makeAttestation(), 24)
    // Manually set expiresAt in the past
    const pastProof = { ...proof, expiresAt: new Date(Date.now() - 1000).toISOString() }
    expect(isExpired(pastProof)).toBe(true)
  })

  it('supports all expiry options: 24h, 7d, 30d', () => {
    for (const hours of [24, 168, 720] as ExpiryOption[]) {
      const { proof } = createProof(makeDisclosure(), makeAttestation(), hours)
      expect(proof.expiryHours).toBe(hours)
      expect(isExpired(proof)).toBe(false)
    }
  })
})

describe('revoke', () => {
  it('revokes with the correct token', () => {
    const { proof, revokeToken } = createProof(makeDisclosure(), makeAttestation())
    const result = revokeProof(proof.id, revokeToken)
    expect(result).toBe('ok')

    const fetched = getProof(proof.id)!
    expect(isRevoked(fetched)).toBe(true)
  })

  it('returns wrong_token for incorrect token', () => {
    const { proof } = createProof(makeDisclosure(), makeAttestation())
    const result = revokeProof(proof.id, 'wrongtoken')
    expect(result).toBe('wrong_token')
  })

  it('returns not_found for missing proof', () => {
    const result = revokeProof('nonexistentid00000000000000000000', 'anytoken')
    expect(result).toBe('not_found')
  })

  it('returns already_revoked if revoked twice', () => {
    const { proof, revokeToken } = createProof(makeDisclosure(), makeAttestation())
    revokeProof(proof.id, revokeToken)
    const result = revokeProof(proof.id, revokeToken)
    expect(result).toBe('already_revoked')
  })
})
