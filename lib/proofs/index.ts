/**
 * Proof record management.
 * P2: only stores verdict, claim params, disclosure, attestation summary.
 */
import crypto from 'crypto'
import { getDb, hashToken } from './db'
import type { Disclosure } from '../claims/index'
import type { AttestationResult } from '../near/attest'

export type ExpiryOption = 24 | 168 | 720 // hours: 1 day, 7 days, 30 days

export interface ProofRecord {
  id: string
  claimType: string
  verdict: boolean
  disclosure: Disclosure
  attestationSummary: AttestationSummary
  currency: string
  periodStart: string
  periodEnd: string
  expiryHours: ExpiryOption
  createdAt: string
  expiresAt: string
  revokedAt: string | null
}

export interface AttestationSummary {
  allPassed: boolean
  checksCount: number
  checksPassed: number
  signingAddress: string
  timestamp: string
  nonce: string
  summary: string
}

export interface CreateProofResult {
  proof: ProofRecord
  revokeToken: string // shown to prover once; stored only as hash
}

export function summariseAttestation(result: AttestationResult): AttestationSummary {
  return {
    allPassed: result.allPassed,
    checksCount: result.checks.length,
    checksPassed: result.checks.filter((c) => c.passed).length,
    signingAddress: result.signingAddress,
    timestamp: result.timestamp,
    nonce: result.nonce,
    summary: result.summary,
  }
}

export function createProof(
  disclosure: Disclosure,
  attestation: AttestationResult,
  expiryHours: ExpiryOption = 168
): CreateProofResult {
  const db = getDb()
  const id = crypto.randomBytes(16).toString('hex') // 128-bit random id
  const revokeToken = crypto.randomBytes(32).toString('hex')
  const revokeTokenHash = hashToken(revokeToken)

  const now = new Date()
  const expiresAt = new Date(now.getTime() + expiryHours * 3_600_000)
  const summary = summariseAttestation(attestation)

  const record: ProofRecord = {
    id,
    claimType: disclosure.claimType,
    verdict: disclosure.verdict,
    disclosure,
    attestationSummary: summary,
    currency: disclosure.currency,
    periodStart: disclosure.periodStart,
    periodEnd: disclosure.periodEnd,
    expiryHours,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    revokedAt: null,
  }

  db.prepare(`
    INSERT INTO proofs
      (id, claimType, verdict, disclosureJson, attestationSummary, currency,
       periodStart, periodEnd, expiryHours, createdAt, expiresAt, revokedAt, revokeTokenHash)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id,
    record.claimType,
    record.verdict ? 1 : 0,
    JSON.stringify(record.disclosure),
    JSON.stringify(record.attestationSummary),
    record.currency,
    record.periodStart,
    record.periodEnd,
    record.expiryHours,
    record.createdAt,
    record.expiresAt,
    null,
    revokeTokenHash
  )

  return { proof: record, revokeToken }
}

export function getProof(id: string): ProofRecord | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM proofs WHERE id = ?').get(id) as DbRow | undefined
  if (!row) return null
  return rowToRecord(row)
}

export function revokeProof(id: string, token: string): 'ok' | 'not_found' | 'wrong_token' | 'already_revoked' {
  const db = getDb()
  const row = db.prepare('SELECT revokeTokenHash, revokedAt FROM proofs WHERE id = ?').get(id) as
    | Pick<DbRow, 'revokeTokenHash' | 'revokedAt'>
    | undefined

  if (!row) return 'not_found'
  if (row.revokedAt) return 'already_revoked'
  if (hashToken(token) !== row.revokeTokenHash) return 'wrong_token'

  db.prepare('UPDATE proofs SET revokedAt = ? WHERE id = ?').run(new Date().toISOString(), id)
  return 'ok'
}

interface DbRow {
  id: string
  claimType: string
  verdict: number
  disclosureJson: string
  attestationSummary: string
  currency: string
  periodStart: string
  periodEnd: string
  expiryHours: number
  createdAt: string
  expiresAt: string
  revokedAt: string | null
  revokeTokenHash: string
}

function rowToRecord(row: DbRow): ProofRecord {
  return {
    id: row.id,
    claimType: row.claimType,
    verdict: row.verdict === 1,
    disclosure: JSON.parse(row.disclosureJson) as Disclosure,
    attestationSummary: JSON.parse(row.attestationSummary) as AttestationSummary,
    currency: row.currency,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    expiryHours: row.expiryHours as ExpiryOption,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
  }
}

export function isExpired(proof: ProofRecord): boolean {
  return new Date(proof.expiresAt) < new Date()
}

export function isRevoked(proof: ProofRecord): boolean {
  return proof.revokedAt !== null
}
