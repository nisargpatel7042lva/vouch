'use client'

import { useState, useEffect } from 'react'
import type { ProofRecord, AttestationSummary } from '@/lib/proofs/index'
import type { Disclosure } from '@/lib/claims/index'
import type { AttestationResult } from '@/lib/near/attest'

interface VerifierProps {
  id: string
  initialData: Record<string, unknown>
  initialStatus: number
}

type ProofData = Omit<ProofRecord, 'disclosure' | 'attestationSummary'> & {
  disclosure: Disclosure
  attestationSummary: AttestationSummary
}

function claimLabel(claimType: string, disclosure: Disclosure): string {
  if (claimType === 'income_floor') {
    const p = disclosure.params as { minMonthlyAmount: number; months: number; currency: string }
    return `Monthly income at least ${p.currency} ${p.minMonthlyAmount.toLocaleString()} for ${p.months} month${p.months !== 1 ? 's' : ''}`
  }
  if (claimType === 'balance_floor') {
    const p = disclosure.params as { minBalance: number; windowDays: number; currency: string }
    return `Account balance never below ${p.currency} ${p.minBalance.toLocaleString()} over ${p.windowDays} days`
  }
  if (claimType === 'runway_floor') {
    const p = disclosure.params as { minMonths: number; windowDays: number; currency: string }
    return `Financial runway at least ${p.minMonths} months (${p.windowDays}-day window)`
  }
  return claimType
}

function timeUntil(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now()
  if (diff <= 0) return 'expired'
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h`
  return `${hours}h ${Math.floor((diff % 3_600_000) / 60_000)}m`
}

export default function VerifierClient({ id, initialData, initialStatus }: VerifierProps) {
  const [status] = useState(initialStatus)
  const [data] = useState(initialData)
  const [reVerifying, setReVerifying] = useState(false)
  const [freshAttestation, setFreshAttestation] = useState<AttestationResult | null>(null)
  const [reVerifyError, setReVerifyError] = useState<string | null>(null)

  // Countdown refresh
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const t = setInterval(() => forceUpdate((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  const handleReVerify = async () => {
    setReVerifying(true)
    setReVerifyError(null)
    try {
      const res = await fetch(`/api/attest/live`)
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json() as AttestationResult
      setFreshAttestation(result)
    } catch (e) {
      setReVerifyError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setReVerifying(false)
    }
  }

  // ── Revoked state ──────────────────────────────────────────────────────────
  if (status === 410 && (data as { reason?: string }).reason === 'revoked') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center" role="main">
          <div className="text-5xl mb-4" aria-hidden>🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Proof Revoked</h1>
          <p className="text-gray-500">The person who created this proof has revoked it. No verdict is available.</p>
          <p className="mt-4 text-xs text-gray-600 font-mono break-all">{id}</p>
        </div>
      </main>
    )
  }

  // ── Expired state ──────────────────────────────────────────────────────────
  if (status === 410 && (data as { reason?: string }).reason === 'expired') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center" role="main">
          <div className="text-5xl mb-4" aria-hidden>⏰</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Proof Expired</h1>
          <p className="text-gray-500">This proof link has expired. Ask the sender to create a new one.</p>
          <p className="mt-4 text-xs text-gray-600 font-mono break-all">{id}</p>
        </div>
      </main>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (status !== 200) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center" role="main">
          <div className="text-5xl mb-4" aria-hidden>❓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Proof Not Found</h1>
          <p className="text-gray-500">This link is invalid or the proof no longer exists.</p>
        </div>
      </main>
    )
  }

  const proof = data as ProofData
  const attest = freshAttestation
    ? { ...freshAttestation, summary: `${freshAttestation.checks.filter(c => c.passed).length}/${freshAttestation.checks.length} checks passed` }
    : proof.attestationSummary

  const displayedChecks: Array<{ name: string; passed: boolean; detail?: string }> =
    freshAttestation
      ? freshAttestation.checks
      : proof.attestationSummary.checksCount > 0
        ? Array.from({ length: proof.attestationSummary.checksCount }, (_, i) => ({
            name: `check_${i + 1}`,
            passed: i < proof.attestationSummary.checksPassed,
            detail: '',
          }))
        : []

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4" role="main">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Verdict card ───────────────────────────────────────────────── */}
        <section
          aria-label="Verdict"
          className={`rounded-2xl shadow-sm border-2 p-8 text-center ${
            proof.verdict
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
          }`}
        >
          <div className="text-6xl mb-3" aria-hidden>{proof.verdict ? '✅' : '❌'}</div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900">
            {proof.verdict ? 'Claim Verified' : 'Claim Not Met'}
          </h1>
          <p className="text-lg text-gray-700 font-medium">
            {claimLabel(proof.claimType, proof.disclosure)}
          </p>
          <p className="mt-3 text-sm text-gray-500">
            Period: {proof.periodStart} → {proof.periodEnd} · Currency: {proof.currency}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Expires in {timeUntil(proof.expiresAt)} · Created {new Date(proof.createdAt).toLocaleDateString()}
          </p>
        </section>

        {/* ── What you learned ───────────────────────────────────────────── */}
        <section aria-label="What you learned" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">What you learned</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Claim type</dt>
              <dd className="font-medium text-gray-900 capitalize">{proof.claimType.replace(/_/g, ' ')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Verdict</dt>
              <dd className={`font-bold ${proof.verdict ? 'text-green-700' : 'text-red-700'}`}>
                {proof.verdict ? 'PASS' : 'FAIL'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Period covered</dt>
              <dd className="font-medium text-gray-900">{proof.periodStart} → {proof.periodEnd}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Currency</dt>
              <dd className="font-medium text-gray-900">{proof.currency}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Claim threshold</dt>
              <dd className="font-medium text-gray-900">{claimLabel(proof.claimType, proof.disclosure)}</dd>
            </div>
          </dl>
        </section>

        {/* ── What you did NOT see ───────────────────────────────────────── */}
        <section aria-label="What you did not see" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">What you did not see</h2>
          <ul className="space-y-2 text-sm text-gray-700" role="list">
            {[
              'The original bank statements or PDF files',
              'Individual transaction descriptions or amounts',
              'Account numbers or bank details',
              'Any balance other than pass/fail against the threshold',
              'The exact income, only whether it met the minimum',
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-blue-500 shrink-0" aria-hidden>🔒</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Attestation panel ──────────────────────────────────────────── */}
        <section aria-label="Attestation" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Verified by NEAR AI Cloud TEE</h2>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              (freshAttestation?.allPassed ?? proof.attestationSummary.allPassed)
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {(freshAttestation?.allPassed ?? proof.attestationSummary.allPassed) ? '✓ VERIFIED' : '✗ FAILED'}
            </span>
          </div>

          <dl className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <dt className="text-gray-500">Signing address</dt>
              <dd className="font-mono text-xs text-gray-700 break-all">
                {freshAttestation?.signingAddress ?? proof.attestationSummary.signingAddress}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Nonce</dt>
              <dd className="font-mono text-xs text-gray-700 break-all">
                {(freshAttestation?.nonce ?? proof.attestationSummary.nonce).slice(0, 16)}…
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Timestamp</dt>
              <dd className="text-gray-700">
                {new Date(freshAttestation?.timestamp ?? proof.attestationSummary.timestamp).toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Checks</dt>
              <dd className="text-gray-700">{attest.summary ?? `${proof.attestationSummary.checksPassed}/${proof.attestationSummary.checksCount} passed`}</dd>
            </div>
          </dl>

          {displayedChecks.length > 0 && (
            <ul className="space-y-1 text-xs mb-4" role="list" aria-label="Attestation checks">
              {displayedChecks.map((c) => (
                <li key={c.name} className="flex gap-2 items-center">
                  <span className={c.passed ? 'text-green-600' : 'text-red-500'} aria-hidden>
                    {c.passed ? '✓' : '✗'}
                  </span>
                  <span className="font-mono text-gray-600">{c.name}</span>
                  {c.detail && <span className="text-gray-400">{c.detail}</span>}
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={handleReVerify}
            disabled={reVerifying}
            aria-busy={reVerifying}
            className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {reVerifying ? 'Verifying…' : 'Re-verify now (fresh nonce)'}
          </button>

          {reVerifyError && (
            <p role="alert" className="mt-2 text-sm text-red-600">{reVerifyError}</p>
          )}

          {freshAttestation && !reVerifying && (
            <p role="status" className="mt-2 text-sm text-green-600">
              Fresh attestation verified — new nonce: {freshAttestation.nonce.slice(0, 16)}…
            </p>
          )}
        </section>

        <p className="text-center text-xs text-gray-600 pb-4">
          Proof ID: <span className="font-mono">{id}</span>
        </p>
      </div>
    </main>
  )
}
