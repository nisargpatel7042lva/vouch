/**
 * P2 privacy scan: after a full create-proof run, scan the SQLite DB file
 * and all log output for fixture sentinel strings.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createProof, getProof } from '../../lib/proofs/index'
import { closeDb } from '../../lib/proofs/db'
import type { Disclosure } from '../../lib/claims/index'
import type { AttestationResult } from '../../lib/near/attest'
import fs from 'fs'
import path from 'path'

const TEST_DB = path.join('/tmp', `vouch-p2-test-${process.pid}.db`)

// Sentinels that must NOT appear in the DB or logs (raw transaction data)
const SENTINELS = [
  'Acme Corp Ltd',
  'Sunrise Apartments',
  'FreshMart',
  'Innovatech Invoice',
  'BlockBuilders',
  'Coinbase',
  'Hardware Wallet',
  '4237.89',
  '97531',
]

beforeEach(() => {
  process.env.VOUCH_DB_PATH = TEST_DB
  closeDb()
})

afterEach(() => {
  closeDb()
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB)
  vi.restoreAllMocks()
})

function makeDisclosureWithSentinels(): Disclosure {
  return {
    claimType: 'income_floor',
    verdict: true,
    params: { minMonthlyAmount: 3000, months: 3, currency: 'USD' },
    periodStart: '2026-07-01',
    periodEnd: '2026-09-30',
    currency: 'USD',
    integrityFlags: [],
    // Disclosure does NOT contain the descriptions or raw amounts above
  }
}

function makeAttestation(): AttestationResult {
  return {
    allPassed: true,
    checks: [{ name: 'nonce_echo', passed: true, detail: 'ok' }],
    nonce: 'abc123',
    signingAddress: '0xdeadbeef',
    timestamp: new Date().toISOString(),
    summary: '1/1 checks passed',
  }
}

describe('P2: DB scan for raw transaction data', () => {
  it('SQLite DB does not contain fixture sentinel strings after proof creation', () => {
    const disclosure = makeDisclosureWithSentinels()
    const attestation = makeAttestation()

    const { proof } = createProof(disclosure, attestation)
    expect(getProof(proof.id)).not.toBeNull()
    closeDb()

    // Read the raw DB file as text (SQLite stores text as UTF-8)
    const dbContent = fs.readFileSync(TEST_DB, 'utf-8').replace(/\0/g, ' ')

    for (const sentinel of SENTINELS) {
      expect(
        dbContent,
        `Sentinel "${sentinel}" found in DB file — raw transaction data leaked (P2 violation)`
      ).not.toContain(sentinel)
    }
  })

  it('proof record does not expose raw transaction descriptions', () => {
    const { proof } = createProof(makeDisclosureWithSentinels(), makeAttestation())
    const record = getProof(proof.id)!

    const recordStr = JSON.stringify(record)
    for (const sentinel of SENTINELS) {
      expect(
        recordStr,
        `Sentinel "${sentinel}" found in proof record JSON`
      ).not.toContain(sentinel)
    }
  })
})

describe('P2: revoke token is stored only as hash', () => {
  it('revokeToken does not appear in DB after creation', () => {
    const { revokeToken } = createProof(makeDisclosureWithSentinels(), makeAttestation())
    closeDb()

    const dbContent = fs.readFileSync(TEST_DB, 'utf-8').replace(/\0/g, ' ')
    expect(dbContent).not.toContain(revokeToken)
  })
})
