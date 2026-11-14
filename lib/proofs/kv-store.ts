/**
 * Vercel KV (Redis) proof store — used in production when KV_REST_API_URL is set.
 * Implements the same interface as the SQLite store. P2: stores only verdict,
 * params, attestation summary. Never stores document content or raw amounts.
 */
import crypto from 'crypto'
import { kv } from '@vercel/kv'
import type { Disclosure } from '../claims/index'
import type { AttestationResult } from '../near/attest'
import {
  ProofRecord,
  AttestationSummary,
  CreateProofResult,
  ExpiryOption,
  summariseAttestation,
} from './index'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

interface KvEntry {
  record: ProofRecord & { revokeTokenHash: string; walletAddress?: string; walletSignature?: string }
}

// TTL: proof expiry + 7 day buffer so "expired" message still renders after expiry
function ttlSeconds(expiryHours: ExpiryOption): number {
  return expiryHours * 3600 + 7 * 86400
}

function key(id: string): string {
  return `proof:${id}`
}

export async function kvCreateProof(
  disclosure: Disclosure,
  attestation: AttestationResult,
  expiryHours: ExpiryOption = 168
): Promise<CreateProofResult> {
  const id = crypto.randomBytes(16).toString('hex')
  const revokeToken = crypto.randomBytes(32).toString('hex')
  const revokeTokenHash = hashToken(revokeToken)

  const now = new Date()
  const expiresAt = new Date(now.getTime() + expiryHours * 3_600_000)
  const summary: AttestationSummary = summariseAttestation(attestation)

  const record: ProofRecord & { revokeTokenHash: string } = {
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
    revokeTokenHash,
  }

  await kv.set(key(id), { record }, { ex: ttlSeconds(expiryHours) })
  return { proof: record, revokeToken }
}

export async function kvGetProof(id: string): Promise<ProofRecord | null> {
  const entry = await kv.get<KvEntry>(key(id))
  if (!entry) return null
  // Strip the revokeTokenHash before returning
  const { revokeTokenHash: _hash, ...record } = entry.record
  void _hash
  return record as ProofRecord
}

export async function kvRevokeProof(
  id: string,
  token: string
): Promise<'ok' | 'not_found' | 'wrong_token' | 'already_revoked'> {
  const entry = await kv.get<KvEntry>(key(id))
  if (!entry) return 'not_found'
  if (entry.record.revokedAt) return 'already_revoked'
  if (hashToken(token) !== entry.record.revokeTokenHash) return 'wrong_token'

  entry.record.revokedAt = new Date().toISOString()
  // Store without TTL so revoked state is durable
  await kv.set(key(id), entry)
  return 'ok'
}

export async function kvBindWallet(
  id: string,
  walletAddress: string,
  walletSignature: string
): Promise<'ok' | 'not_found' | 'already_bound'> {
  const entry = await kv.get<KvEntry>(key(id))
  if (!entry) return 'not_found'
  if (entry.record.walletAddress) return 'already_bound'

  entry.record.walletAddress = walletAddress
  entry.record.walletSignature = walletSignature
  // Preserve remaining TTL via pttl
  const remainMs = await kv.pttl(key(id))
  if (remainMs > 0) {
    await kv.set(key(id), entry, { px: remainMs })
  } else {
    await kv.set(key(id), entry)
  }
  return 'ok'
}
